const { pool } = require('../config/db');
const { query, getConnection } = require('../config/pgAdapter');

class ReservationService {
  /**
   * List all reservations with optional filters
   */
  async getAllReservations({ status = 'all', search = '' } = {}) {
    let sql = `
      SELECT 
        r.reservation_id,
        r.customer_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        DATE_FORMAT(r.reservation_date, '%Y-%m-%d %H:%i') AS reservation_date,
        r.status,
        CAST(r.total_amount AS DECIMAL(10,2)) AS total_amount,
        r.notes,
        COUNT(ri.medicine_id) AS total_items,
        COALESCE(SUM(ri.quantity), 0) AS total_quantity
      FROM reservations r
      JOIN customers c ON r.customer_id = c.customer_id
      LEFT JOIN reservation_items ri ON r.reservation_id = ri.reservation_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status.toLowerCase() !== 'all') {
      sql += ` AND r.status = ?`;
      params.push(status);
    }

    if (search && search.trim() !== '') {
      sql += ` AND (c.name LIKE ? OR c.phone LIKE ? OR CAST(r.reservation_id AS CHAR) = ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, search.trim());
    }

    sql += ` GROUP BY r.reservation_id ORDER BY r.reservation_date DESC`;

    const [rows] = await query(sql, params);
    return rows;
  }

  /**
   * Get single reservation details including customer and item breakdown
   */
  async getReservationById(reservationId) {
    const resSql = `
      SELECT 
        r.reservation_id,
        r.customer_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        DATE_FORMAT(r.reservation_date, '%Y-%m-%d %H:%i') AS reservation_date,
        r.status,
        CAST(r.total_amount AS DECIMAL(10,2)) AS total_amount,
        r.notes
      FROM reservations r
      JOIN customers c ON r.customer_id = c.customer_id
      WHERE r.reservation_id = ?
    `;
    const [resRows] = await query(resSql, [reservationId]);

    if (resRows.length === 0) {
      return null;
    }

    const reservation = resRows[0];

    const itemsSql = `
      SELECT 
        ri.medicine_id,
        m.name AS medicine_name,
        m.category AS medicine_category,
        ri.quantity,
        CAST(ri.unit_price AS DECIMAL(10,2)) AS unit_price,
        CAST((ri.quantity * ri.unit_price) AS DECIMAL(10,2)) AS subtotal
      FROM reservation_items ri
      JOIN medicines m ON ri.medicine_id = m.medicine_id
      WHERE ri.reservation_id = ?
      ORDER BY m.name ASC
    `;
    const [items] = await query(itemsSql, [reservationId]);
    reservation.items = items;

    return reservation;
  }

  /**
   * ATOMIC TRANSACTION: Create Reservation
   * 1. Begin transaction
   * 2. Lock medicines with SELECT ... FOR UPDATE
   * 3. Verify existence, expiry date, and sufficient stock
   * 4. Compute verified total using database prices
   * 5. Insert into reservations
   * 6. Insert into reservation_items
   * 7. Deduct stock from medicines
   * 8. Commit transaction (Rollback on any error)
   */
  async createReservation({ customer_id, items, notes = '' }) {
    if (!customer_id) {
      const error = new Error('Customer ID is required to create a reservation.');
      error.statusCode = 400;
      throw error;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      const error = new Error('Reservation must include at least one medicine item.');
      error.statusCode = 400;
      throw error;
    }

    // Combine duplicate medicine IDs in request
    const itemMap = new Map();
    for (const item of items) {
      const medId = parseInt(item.medicine_id, 10);
      const qty = parseInt(item.quantity, 10);

      if (!Number.isSafeInteger(medId) || !Number.isSafeInteger(qty) || qty <= 0 || String(item.quantity).trim() !== String(qty) || String(item.medicine_id).trim() !== String(medId)) {
        const error = new Error('Each item must have a valid medicine_id and a quantity greater than zero.');
        error.statusCode = 400;
        throw error;
      }

      if (itemMap.has(medId)) {
        itemMap.set(medId, itemMap.get(medId) + qty);
      } else {
        itemMap.set(medId, qty);
      }
    }

    const medicineIds = Array.from(itemMap.keys());

    const connection = await getConnection();

    try {
      // 1. Begin Transaction
      await connection.beginTransaction();

      // 2. Validate Customer Exists
      const [custRows] = await connection.query(
        `SELECT customer_id, name FROM customers WHERE customer_id = ? FOR UPDATE`,
        [customer_id]
      );
      if (custRows.length === 0) {
        const error = new Error(`Customer with ID ${customer_id} does not exist.`);
        error.statusCode = 404;
        throw error;
      }

      // 3. Row lock all requested medicines using SELECT ... FOR UPDATE
      const placeholders = medicineIds.map(() => '?').join(',');
      const [medRows] = await connection.query(
        `SELECT 
           medicine_id, 
           name, 
           CAST(unit_price AS DECIMAL(10,2)) AS unit_price, 
           stock_quantity, 
           DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
           CASE WHEN expiry_date < CURRENT_DATE() THEN 1 ELSE 0 END AS is_expired
         FROM medicines 
         WHERE medicine_id IN (${placeholders}) 
         FOR UPDATE`,
        medicineIds
      );

      // Verify all medicines were found
      if (medRows.length !== medicineIds.length) {
        const foundIds = new Set(medRows.map((m) => m.medicine_id));
        const missingIds = medicineIds.filter((id) => !foundIds.has(id));
        const error = new Error(`The following medicine IDs were not found: ${missingIds.join(', ')}.`);
        error.statusCode = 404;
        throw error;
      }

      // 4. Verify Expiry & Stock for each medicine and compute total
      let calculatedTotal = 0;
      const reservationItemsData = [];

      for (const med of medRows) {
        const requestedQty = itemMap.get(med.medicine_id);

        // Check expiry
        if (med.is_expired) {
          const error = new Error(
            `Cannot reserve '${med.name}' because it expired on ${med.expiry_date}. Expired medicines cannot be reserved.`
          );
          error.statusCode = 400;
          throw error;
        }

        // Check stock quantity
        if (med.stock_quantity < requestedQty) {
          const error = new Error(
            `Insufficient stock for '${med.name}'. Requested: ${requestedQty}, Available in stock: ${med.stock_quantity}.`
          );
          error.statusCode = 400;
          throw error;
        }

        const unitPrice = parseFloat(med.unit_price);
        const itemSubtotal = requestedQty * unitPrice;
        calculatedTotal += itemSubtotal;

        reservationItemsData.push({
          medicine_id: med.medicine_id,
          name: med.name,
          quantity: requestedQty,
          unit_price: unitPrice,
          subtotal: itemSubtotal
        });
      }

      // 5. Insert Reservation
      const [resResult] = await connection.query(
        `INSERT INTO reservations (customer_id, status, total_amount, notes) VALUES (?, 'Pending', ?, ?)`,
        [customer_id, calculatedTotal.toFixed(2), notes ? notes.trim() : null]
      );
      const newReservationId = resResult.insertId;

      // 6. Insert Reservation Items & 7. Deduct Stock
      for (const item of reservationItemsData) {
        await connection.query(
          `INSERT INTO reservation_items (reservation_id, medicine_id, quantity, unit_price) VALUES (?, ?, ?, ?)`,
          [newReservationId, item.medicine_id, item.quantity, item.unit_price]
        );

        await connection.query(
          `UPDATE medicines SET stock_quantity = stock_quantity - ? WHERE medicine_id = ?`,
          [item.quantity, item.medicine_id]
        );
      }

      // 8. Commit Transaction
      await connection.commit();

      // Fetch created reservation details to return
      const createdReservation = await this.getReservationById(newReservationId);
      return createdReservation;
    } catch (error) {
      // Rollback completely on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * ATOMIC TRANSACTION: Cancel Reservation
   * 1. Begin transaction
   * 2. Lock reservation using SELECT ... FOR UPDATE
   * 3. Verify status is 'Pending'
   * 4. Lock and restore medicine stock quantities
   * 5. Update reservation status to 'Cancelled'
   * 6. Commit transaction
   */
  async cancelReservation(reservationId) {
    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      // 1. Lock reservation row
      const [resRows] = await connection.query(
        `SELECT reservation_id, status, customer_id FROM reservations WHERE reservation_id = ? FOR UPDATE`,
        [reservationId]
      );

      if (resRows.length === 0) {
        const error = new Error(`Reservation #${reservationId} not found.`);
        error.statusCode = 404;
        throw error;
      }

      const reservation = resRows[0];

      // Prevent repeated cancellation or cancellation of completed
      if (reservation.status === 'Cancelled') {
        const error = new Error(`Reservation #${reservationId} is already Cancelled. Stock has already been restored and cannot be restored again.`);
        error.statusCode = 400;
        throw error;
      }

      if (reservation.status === 'Completed') {
        const error = new Error(`Cannot cancel Reservation #${reservationId} because it is already Completed and fulfilled.`);
        error.statusCode = 400;
        throw error;
      }

      // 2. Fetch reserved items
      const [items] = await connection.query(
        `SELECT medicine_id, quantity FROM reservation_items WHERE reservation_id = ? FOR UPDATE`,
        [reservationId]
      );

      // 3. Restore stock quantities
      for (const item of items) {
        await connection.query(
          `UPDATE medicines SET stock_quantity = stock_quantity + ? WHERE medicine_id = ?`,
          [item.quantity, item.medicine_id]
        );
      }

      // 4. Update status to Cancelled
      await connection.query(
        `UPDATE reservations SET status = 'Cancelled' WHERE reservation_id = ?`,
        [reservationId]
      );

      // 5. Commit Transaction
      await connection.commit();

      return this.getReservationById(reservationId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * ATOMIC TRANSACTION: Complete Reservation
   * 1. Begin transaction
   * 2. Lock reservation row
   * 3. Verify status is 'Pending'
   * 4. Update status to 'Completed' (Stock is NOT deducted again!)
   * 5. Commit transaction
   */
  async completeReservation(reservationId) {
    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      const [resRows] = await connection.query(
        `SELECT reservation_id, status FROM reservations WHERE reservation_id = ? FOR UPDATE`,
        [reservationId]
      );

      if (resRows.length === 0) {
        const error = new Error(`Reservation #${reservationId} not found.`);
        error.statusCode = 404;
        throw error;
      }

      const reservation = resRows[0];

      if (reservation.status === 'Completed') {
        const error = new Error(`Reservation #${reservationId} is already marked as Completed.`);
        error.statusCode = 400;
        throw error;
      }

      if (reservation.status === 'Cancelled') {
        const error = new Error(`Cannot complete Reservation #${reservationId} because it has been Cancelled.`);
        error.statusCode = 400;
        throw error;
      }

      // Safe status transition from Pending to Completed
      // Notice: Stock was already safely deducted when the reservation was initially created.
      // Therefore, stock is NEVER deducted a second time here.
      await connection.query(
        `UPDATE reservations SET status = 'Completed' WHERE reservation_id = ?`,
        [reservationId]
      );

      await connection.commit();

      return this.getReservationById(reservationId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new ReservationService();
