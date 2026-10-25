const { pool } = require('../config/db');
const { query, getConnection } = require('../config/pgAdapter');

class MedicineService {
  /**
   * Fetch all medicines with optional filters for name, category, and availability
   */
  async getAllMedicines({ search = '', category = '', availability = 'all' } = {}) {
    let sql = `
      SELECT 
        medicine_id,
        name,
        category,
        CAST(unit_price AS DECIMAL(10,2)) AS unit_price,
        stock_quantity,
        DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
        CASE
          WHEN expiry_date < CURRENT_DATE() THEN 'Expired'
          WHEN expiry_date <= DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY) THEN 'Near Expiry'
          WHEN stock_quantity <= 0 THEN 'Out of Stock'
          WHEN stock_quantity <= 10 THEN 'Low Stock'
          ELSE 'In Stock'
        END AS status,
        DATEDIFF(expiry_date, CURRENT_DATE()) AS days_until_expiry
      FROM medicines
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim() !== '') {
      sql += ` AND (name LIKE ? OR category LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
      sql += ` AND category = ?`;
      params.push(category.trim());
    }

    if (availability === 'in_stock') {
      sql += ` AND stock_quantity > 10 AND expiry_date >= CURRENT_DATE()`;
    } else if (availability === 'low_stock') {
      sql += ` AND stock_quantity > 0 AND stock_quantity <= 10 AND expiry_date >= CURRENT_DATE()`;
    } else if (availability === 'out_of_stock') {
      sql += ` AND stock_quantity <= 0`;
    } else if (availability === 'expired') {
      sql += ` AND expiry_date < CURRENT_DATE()`;
    } else if (availability === 'near_expiry') {
      sql += ` AND expiry_date >= CURRENT_DATE() AND expiry_date <= DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY)`;
    }

    sql += ` ORDER BY name ASC`;

    const [rows] = await query(sql, params);
    return rows;
  }

  /**
   * Get single medicine by ID
   */
  async getMedicineById(medicineId) {
    const sql = `
      SELECT 
        medicine_id,
        name,
        category,
        CAST(unit_price AS DECIMAL(10,2)) AS unit_price,
        stock_quantity,
        DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
        CASE
          WHEN expiry_date < CURRENT_DATE() THEN 'Expired'
          WHEN expiry_date <= DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY) THEN 'Near Expiry'
          WHEN stock_quantity <= 0 THEN 'Out of Stock'
          WHEN stock_quantity <= 10 THEN 'Low Stock'
          ELSE 'In Stock'
        END AS status,
        DATEDIFF(expiry_date, CURRENT_DATE()) AS days_until_expiry
      FROM medicines
      WHERE medicine_id = ?
    `;
    const [rows] = await query(sql, [medicineId]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Add a new medicine with validation
   */
  async createMedicine({ name, category, unit_price, stock_quantity, expiry_date }) {
    if (!name || name.trim() === '') {
      const error = new Error('Medicine name is required.');
      error.statusCode = 400;
      throw error;
    }

    const price = parseFloat(unit_price);
    if (isNaN(price) || price < 0) {
      const error = new Error('Unit price must be a non-negative number.');
      error.statusCode = 400;
      throw error;
    }

    const stock = parseInt(stock_quantity, 10);
    if (!Number.isSafeInteger(stock) || stock < 0 || (stock_quantity !== undefined && String(stock_quantity).trim() !== String(stock))) {
      const error = new Error('Stock quantity must be a non-negative integer.');
      error.statusCode = 400;
      throw error;
    }

    if (!expiry_date || isNaN(new Date(expiry_date).getTime())) {
      const error = new Error('A valid expiry date (YYYY-MM-DD) is required.');
      error.statusCode = 400;
      throw error;
    }

    const sql = `
      INSERT INTO medicines (name, category, unit_price, stock_quantity, expiry_date)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await query(sql, [
      name.trim(),
      category ? category.trim() : 'General',
      price,
      stock,
      expiry_date
    ]);

    return this.getMedicineById(result.insertId);
  }

  /**
   * Update an existing medicine
   */
  async updateMedicine(medicineId, { name, category, unit_price, stock_quantity, expiry_date }) {
    const existing = await this.getMedicineById(medicineId);
    if (!existing) {
      const error = new Error(`Medicine with ID ${medicineId} not found.`);
      error.statusCode = 404;
      throw error;
    }

    const price = unit_price !== undefined ? parseFloat(unit_price) : existing.unit_price;
    if (isNaN(price) || price < 0) {
      const error = new Error('Unit price must be a non-negative number.');
      error.statusCode = 400;
      throw error;
    }

    const stock = stock_quantity !== undefined ? parseInt(stock_quantity, 10) : existing.stock_quantity;
    if (!Number.isSafeInteger(stock) || stock < 0 || (stock_quantity !== undefined && String(stock_quantity).trim() !== String(stock))) {
      const error = new Error('Stock quantity must be a non-negative integer.');
      error.statusCode = 400;
      throw error;
    }

    const updatedName = name ? name.trim() : existing.name;
    const updatedCategory = category ? category.trim() : existing.category;
    const updatedExpiry = expiry_date || existing.expiry_date;

    const sql = `
      UPDATE medicines
      SET name = ?, category = ?, unit_price = ?, stock_quantity = ?, expiry_date = ?
      WHERE medicine_id = ?
    `;
    await query(sql, [updatedName, updatedCategory, price, stock, updatedExpiry, medicineId]);

    return this.getMedicineById(medicineId);
  }

  /**
   * Safe delete medicine
   * Checks if medicine is referenced in reservation_items before deleting
   */
  async deleteMedicine(medicineId) {
    const existing = await this.getMedicineById(medicineId);
    if (!existing) {
      const error = new Error(`Medicine with ID ${medicineId} not found.`);
      error.statusCode = 404;
      throw error;
    }

    // Check if referenced in reservation_items
    const [refRows] = await query(
      `SELECT COUNT(*) AS reservation_count FROM reservation_items WHERE medicine_id = ?`,
      [medicineId]
    );

    if (Number(refRows[0].reservation_count) > 0) {
      const error = new Error(
        `Cannot delete medicine '${existing.name}' because it is linked to ${refRows[0].reservation_count} reservation item(s). To preserve transaction and audit history, deletion is blocked.`
      );
      error.statusCode = 409;
      throw error;
    }

    await query(`DELETE FROM medicines WHERE medicine_id = ?`, [medicineId]);
    return {
      message: `Medicine '${existing.name}' deleted successfully.`,
      medicine_id: medicineId
    };
  }

  /**
   * Get distinct categories
   */
  async getCategories() {
    const [rows] = await query(
      `SELECT DISTINCT category FROM medicines WHERE category IS NOT NULL AND category != '' ORDER BY category ASC`
    );
    return rows.map((r) => r.category);
  }
}

module.exports = new MedicineService();
