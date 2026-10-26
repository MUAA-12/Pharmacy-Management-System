
const { pool } = require('../config/db');

class MedicineService {
  // Validate medicine ID before using it in SQL
  validateMedicineId(medicineId) {
    const id = Number(medicineId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      const error = new Error('Invalid medicine ID.');
      error.statusCode = 400;
      throw error;
    }

    return id;
  }

  // Validate medicine fields for create and update
  validateMedicineData(data) {
    const name = String(data.name || '').trim();
    const category = String(data.category || 'General').trim();

    const price = Number(data.unit_price);
    const stock = Number(data.stock_quantity);
    const expiryDate = String(data.expiry_date || '').trim();

    if (!name) {
      const error = new Error('Medicine name is required.');
      error.statusCode = 400;
      throw error;
    }

    if (
      data.unit_price === undefined ||
      data.unit_price === null ||
      String(data.unit_price).trim() === '' ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      const error = new Error(
        'Unit price must be a non-negative number.'
      );
      error.statusCode = 400;
      throw error;
    }

    if (
      data.stock_quantity === undefined ||
      data.stock_quantity === null ||
      String(data.stock_quantity).trim() === '' ||
      !Number.isSafeInteger(stock) ||
      stock < 0
    ) {
      const error = new Error(
        'Stock quantity must be a non-negative integer.'
      );
      error.statusCode = 400;
      throw error;
    }

    const parsedDate = new Date(`${expiryDate}T00:00:00Z`);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== expiryDate
    ) {
      const error = new Error(
        'A valid expiry date (YYYY-MM-DD) is required.'
      );
      error.statusCode = 400;
      throw error;
    }

    return {
      name,
      category: category || 'General',
      unit_price: price,
      stock_quantity: stock,
      expiry_date: expiryDate
    };
  }

  // Shared SQL selection for medicine catalog
  getMedicineSelectSQL() {
    return `
      SELECT
        medicine_id,
        name,
        category,
        unit_price,
        stock_quantity,
        TO_CHAR(expiry_date, 'YYYY-MM-DD') AS expiry_date,

        CASE
          WHEN expiry_date < CURRENT_DATE
            THEN 'Expired'
          WHEN expiry_date <= CURRENT_DATE + 30
            THEN 'Near Expiry'
          WHEN stock_quantity <= 0
            THEN 'Out of Stock'
          WHEN stock_quantity <= 10
            THEN 'Low Stock'
          ELSE 'In Stock'
        END AS status,

        (expiry_date - CURRENT_DATE) AS days_until_expiry

      FROM public.medicines
    `;
  }

  // Get medicines with search and filters
  async getAllMedicines({
    search = '',
    category = '',
    availability = 'all'
  } = {}) {
    let sql = this.getMedicineSelectSQL() + `
      WHERE 1 = 1
    `;

    const params = [];

    if (typeof search === 'string' && search.trim()) {
      params.push(`%${search.trim()}%`);

      sql += `
        AND (
          name ILIKE $${params.length}
          OR category ILIKE $${params.length}
        )
      `;
    }

    if (
      typeof category === 'string' &&
      category.trim() &&
      category.toLowerCase() !== 'all'
    ) {
      params.push(category.trim());

      sql += `
        AND category = $${params.length}
      `;
    }

    if (availability === 'in_stock') {
      sql += `
        AND stock_quantity > 10
        AND expiry_date > CURRENT_DATE + 30
      `;
    } else if (availability === 'low_stock') {
      sql += `
        AND stock_quantity BETWEEN 1 AND 10
        AND expiry_date > CURRENT_DATE + 30
      `;
    } else if (availability === 'out_of_stock') {
      sql += `
        AND stock_quantity <= 0
      `;
    } else if (availability === 'expired') {
      sql += `
        AND expiry_date < CURRENT_DATE
      `;
    } else if (availability === 'near_expiry') {
      sql += `
        AND expiry_date >= CURRENT_DATE
        AND expiry_date <= CURRENT_DATE + 30
      `;
    }

    sql += ` ORDER BY name ASC, medicine_id ASC`;

    const result = await pool.query(sql, params);
    return result.rows;
  }

  // Get a medicine by ID
  async getMedicineById(medicineId) {
    const id = this.validateMedicineId(medicineId);

    const sql = `
      ${this.getMedicineSelectSQL()}
      WHERE medicine_id = $1
    `;

    const result = await pool.query(sql, [id]);

    return result.rows[0] || null;
  }

  // Create a new medicine
  async createMedicine(data) {
    const medicine = this.validateMedicineData(data);

    const sql = `
      INSERT INTO public.medicines (
        name,
        category,
        unit_price,
        stock_quantity,
        expiry_date
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING medicine_id
    `;

    const result = await pool.query(sql, [
      medicine.name,
      medicine.category,
      medicine.unit_price,
      medicine.stock_quantity,
      medicine.expiry_date
    ]);

    return this.getMedicineById(
      result.rows[0].medicine_id
    );
  }

  // Update an existing medicine
  async updateMedicine(medicineId, data) {
    const id = this.validateMedicineId(medicineId);

    const existing = await this.getMedicineById(id);

    if (!existing) {
      const error = new Error(
        `Medicine with ID ${id} not found.`
      );
      error.statusCode = 404;
      throw error;
    }

    const medicine = this.validateMedicineData({
      name: data.name ?? existing.name,
      category: data.category ?? existing.category,
      unit_price: data.unit_price ?? existing.unit_price,
      stock_quantity:
        data.stock_quantity ?? existing.stock_quantity,
      expiry_date: data.expiry_date ?? existing.expiry_date
    });

    const sql = `
      UPDATE public.medicines
      SET
        name = $1,
        category = $2,
        unit_price = $3,
        stock_quantity = $4,
        expiry_date = $5
      WHERE medicine_id = $6
      RETURNING medicine_id
    `;

    const result = await pool.query(sql, [
      medicine.name,
      medicine.category,
      medicine.unit_price,
      medicine.stock_quantity,
      medicine.expiry_date,
      id
    ]);

    if (result.rowCount === 0) {
      const error = new Error('Medicine not found.');
      error.statusCode = 404;
      throw error;
    }

    return this.getMedicineById(id);
  }

  // Delete a medicine only if it is not used in reservations
  async deleteMedicine(medicineId) {
    const id = this.validateMedicineId(medicineId);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existingResult = await client.query(
        `
          SELECT medicine_id, name
          FROM public.medicines
          WHERE medicine_id = $1
          FOR UPDATE
        `,
        [id]
      );

      const existing = existingResult.rows[0];

      if (!existing) {
        const error = new Error(
          `Medicine with ID ${id} not found.`
        );
        error.statusCode = 404;
        throw error;
      }

      const references = await client.query(
        `
          SELECT COUNT(*)::integer AS reservation_count
          FROM public.reservation_items
          WHERE medicine_id = $1
        `,
        [id]
      );

      const reservationCount =
        references.rows[0].reservation_count;

      if (reservationCount > 0) {
        const error = new Error(
          `Cannot delete medicine '${existing.name}' because it is linked to ${reservationCount} reservation item(s).`
        );
        error.statusCode = 409;
        throw error;
      }

      await client.query(
        `
          DELETE FROM public.medicines
          WHERE medicine_id = $1
        `,
        [id]
      );

      await client.query('COMMIT');

      return {
        message: `Medicine '${existing.name}' deleted successfully.`,
        medicine_id: id
      };
    } catch (error) {
      await client.query('ROLLBACK');

      if (error.code === '23503') {
        error.statusCode = 409;
        error.message =
          'Cannot delete medicine because it is referenced by another record.';
      }

      throw error;
    } finally {
      client.release();
    }
  }

  // Get all medicine categories
  async getCategories() {
    const result = await pool.query(`
      SELECT DISTINCT category
      FROM public.medicines
      WHERE category IS NOT NULL
        AND TRIM(category) <> ''
      ORDER BY category ASC
    `);

    return result.rows.map((row) => row.category);
  }
}

module.exports = new MedicineService();
