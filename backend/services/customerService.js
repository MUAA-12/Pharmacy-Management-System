const { pool } = require('../config/db');
const { query, getConnection } = require('../config/pgAdapter');

class CustomerService {
  /**
   * Fetch all customers with optional search and reservation count
   */
  async getAllCustomers({ search = '' } = {}) {
    let sql = `
      SELECT 
        c.customer_id,
        c.name,
        c.phone,
        c.email,
        DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') AS created_at,
        COUNT(r.reservation_id) AS total_reservations,
        COALESCE(SUM(CASE WHEN r.status = 'Completed' THEN r.total_amount ELSE 0 END), 0) AS total_spent
      FROM customers c
      LEFT JOIN reservations r ON c.customer_id = r.customer_id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim() !== '') {
      sql += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ` GROUP BY c.customer_id ORDER BY c.name ASC`;

    const [rows] = await query(sql, params);
    return rows;
  }

  /**
   * Get single customer by ID with full reservation history
   */
  async getCustomerById(customerId) {
    const [custRows] = await query(
      `SELECT customer_id, name, phone, email, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
       FROM customers WHERE customer_id = ?`,
      [customerId]
    );

    if (custRows.length === 0) {
      return null;
    }

    const customer = custRows[0];

    // Fetch reservations
    const [reservations] = await query(
      `SELECT 
         reservation_id,
         DATE_FORMAT(reservation_date, '%Y-%m-%d %H:%i') AS reservation_date,
         status,
         CAST(total_amount AS DECIMAL(10,2)) AS total_amount,
         notes
       FROM reservations
       WHERE customer_id = ?
       ORDER BY reservation_date DESC`,
      [customerId]
    );

    customer.reservations = reservations;
    return customer;
  }

  /**
   * Register a new customer
   */
  async createCustomer({ name, phone, email }) {
    if (!name || name.trim() === '') {
      const error = new Error('Customer name is required.');
      error.statusCode = 400;
      throw error;
    }

    if (!phone || phone.trim() === '') {
      const error = new Error('Customer phone number is required.');
      error.statusCode = 400;
      throw error;
    }

    // Check duplicate phone
    const [existing] = await query(`SELECT customer_id FROM customers WHERE phone = ?`, [phone.trim()]);
    if (existing.length > 0) {
      const error = new Error(`A customer with phone number '${phone.trim()}' is already registered.`);
      error.statusCode = 409;
      throw error;
    }

    const sql = `INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)`;
    const [result] = await query(sql, [
      name.trim(),
      phone.trim(),
      email ? email.trim() : null
    ]);

    return this.getCustomerById(result.insertId);
  }

  /**
   * Update existing customer
   */
  async updateCustomer(customerId, { name, phone, email }) {
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      const error = new Error(`Customer with ID ${customerId} not found.`);
      error.statusCode = 404;
      throw error;
    }

    const updatedName = name ? name.trim() : customer.name;
    const updatedPhone = phone ? phone.trim() : customer.phone;
    const updatedEmail = email !== undefined ? (email ? email.trim() : null) : customer.email;

    // Check if new phone conflicts with another customer
    if (updatedPhone !== customer.phone) {
      const [existing] = await query(
        `SELECT customer_id FROM customers WHERE phone = ? AND customer_id != ?`,
        [updatedPhone, customerId]
      );
      if (existing.length > 0) {
        const error = new Error(`Another customer is already registered with phone number '${updatedPhone}'.`);
        error.statusCode = 409;
        throw error;
      }
    }

    await query(
      `UPDATE customers SET name = ?, phone = ?, email = ? WHERE customer_id = ?`,
      [updatedName, updatedPhone, updatedEmail, customerId]
    );

    return this.getCustomerById(customerId);
  }

  /**
   * Safe delete customer
   */
  async deleteCustomer(customerId) {
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      const error = new Error(`Customer with ID ${customerId} not found.`);
      error.statusCode = 404;
      throw error;
    }

    // Check if reservations exist
    const [resRows] = await query(
      `SELECT COUNT(*) AS res_count FROM reservations WHERE customer_id = ?`,
      [customerId]
    );

    if (Number(resRows[0].res_count) > 0) {
      const error = new Error(
        `Cannot delete customer '${customer.name}' because they have ${resRows[0].res_count} reservation record(s). Deletion is blocked to preserve transaction history.`
      );
      error.statusCode = 409;
      throw error;
    }

    await query(`DELETE FROM customers WHERE customer_id = ?`, [customerId]);
    return {
      message: `Customer '${customer.name}' deleted successfully.`,
      customer_id: customerId
    };
  }
}

module.exports = new CustomerService();
