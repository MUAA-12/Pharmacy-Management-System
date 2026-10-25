const { pool } = require('../config/db');
const { query, getConnection } = require('../config/pgAdapter');

class ReportService {
  /**
   * Get core dashboard summary statistics
   */
  async getDashboardStats() {
    // 1. Medicine counts
    const [medStats] = await query(`
      SELECT 
        COUNT(*) AS total_medicines,
        COALESCE(SUM(CASE WHEN stock_quantity <= 10 AND stock_quantity > 0 THEN 1 ELSE 0 END), 0) AS low_stock_count,
        COALESCE(SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END), 0) AS out_of_stock_count,
        COALESCE(SUM(CASE WHEN expiry_date < CURRENT_DATE() THEN 1 ELSE 0 END), 0) AS expired_count,
        COALESCE(SUM(stock_quantity * unit_price), 0) AS total_inventory_value
      FROM medicines
    `);

    // 2. Customer count
    const [custStats] = await query(`SELECT COUNT(*) AS total_customers FROM customers`);

    // 3. Reservation counts
    const [resStats] = await query(`
      SELECT 
        COUNT(*) AS total_reservations,
        COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending_reservations,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END), 0) AS completed_reservations,
        COALESCE(SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_reservations,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN total_amount ELSE 0 END), 0) AS total_revenue
      FROM reservations
    `);

    // 4. Recent reservations
    const [recentReservations] = await query(`
      SELECT 
        r.reservation_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        DATE_FORMAT(r.reservation_date, '%Y-%m-%d %H:%i') AS reservation_date,
        r.status,
        CAST(r.total_amount AS DECIMAL(10,2)) AS total_amount,
        COUNT(ri.medicine_id) AS items_count
      FROM reservations r
      JOIN customers c ON r.customer_id = c.customer_id
      LEFT JOIN reservation_items ri ON r.reservation_id = ri.reservation_id
      GROUP BY r.reservation_id
      ORDER BY r.reservation_date DESC
      LIMIT 6
    `);

    // 5. Critical low stock medicines for quick alert widget
    const [criticalStock] = await query(`
      SELECT 
        medicine_id, 
        name, 
        category, 
        stock_quantity, 
        DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date
      FROM medicines
      WHERE stock_quantity <= 10
      ORDER BY stock_quantity ASC
      LIMIT 5
    `);

    return {
      overview: {
        total_medicines: medStats[0].total_medicines || 0,
        total_customers: custStats[0].total_customers || 0,
        pending_reservations: parseInt(resStats[0].pending_reservations, 10) || 0,
        completed_reservations: parseInt(resStats[0].completed_reservations, 10) || 0,
        cancelled_reservations: parseInt(resStats[0].cancelled_reservations, 10) || 0,
        low_stock_count: parseInt(medStats[0].low_stock_count, 10) || 0,
        out_of_stock_count: parseInt(medStats[0].out_of_stock_count, 10) || 0,
        expired_count: parseInt(medStats[0].expired_count, 10) || 0,
        total_revenue: parseFloat(resStats[0].total_revenue || 0),
        total_inventory_value: parseFloat(medStats[0].total_inventory_value || 0)
      },
      recent_reservations: recentReservations,
      critical_stock: criticalStock
    };
  }

  /**
   * Detailed Inventory valuation & stock status report
   */
  async getInventoryReport() {
    const [rows] = await query(`
      SELECT 
        medicine_id,
        name,
        category,
        CAST(unit_price AS DECIMAL(10,2)) AS unit_price,
        stock_quantity,
        CAST((stock_quantity * unit_price) AS DECIMAL(10,2)) AS total_value,
        DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
        DATEDIFF(expiry_date, CURRENT_DATE()) AS days_until_expiry,
        CASE
          WHEN expiry_date < CURRENT_DATE() THEN 'Expired'
          WHEN expiry_date <= DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY) THEN 'Near Expiry'
          WHEN stock_quantity <= 0 THEN 'Out of Stock'
          WHEN stock_quantity <= 10 THEN 'Low Stock'
          ELSE 'Optimal'
        END AS status
      FROM medicines
      ORDER BY category ASC, name ASC
    `);

    const summary = rows.reduce(
      (acc, row) => {
        acc.total_items += 1;
        acc.total_units += row.stock_quantity;
        acc.total_valuation += parseFloat(row.total_value);
        if (row.stock_quantity <= 10) acc.low_stock_items += 1;
        if (row.status === 'Expired') acc.expired_items += 1;
        return acc;
      },
      { total_items: 0, total_units: 0, total_valuation: 0, low_stock_items: 0, expired_items: 0 }
    );

    return { summary, items: rows };
  }

  /**
   * Low Stock Report
   */
  async getLowStockReport(threshold = 10) {
    const limit = parseInt(threshold, 10) || 10;
    const [rows] = await query(
      `
      SELECT 
        medicine_id,
        name,
        category,
        CAST(unit_price AS DECIMAL(10,2)) AS unit_price,
        stock_quantity,
        DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
        CASE 
          WHEN stock_quantity = 0 THEN 'CRITICAL: Out of Stock'
          WHEN stock_quantity <= 5 THEN 'HIGH: Very Low'
          ELSE 'MEDIUM: Reorder Soon'
        END AS urgency
      FROM medicines
      WHERE stock_quantity <= ?
      ORDER BY stock_quantity ASC, name ASC
    `,
      [limit]
    );

    return rows;
  }

  /**
   * Expired and Near Expiry Medicines Report
   */
  async getExpiryReport(days = 90) {
    const horizon = parseInt(days, 10) || 90;
    const [rows] = await query(
      `
      SELECT 
        medicine_id,
        name,
        category,
        CAST(unit_price AS DECIMAL(10,2)) AS unit_price,
        stock_quantity,
        DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
        DATEDIFF(expiry_date, CURRENT_DATE()) AS days_remaining,
        CASE
          WHEN expiry_date < CURRENT_DATE() THEN 'Expired'
          WHEN expiry_date <= DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY) THEN 'Expiring within 30 days'
          ELSE 'Expiring within 90 days'
        END AS urgency_level
      FROM medicines
      WHERE expiry_date <= DATE_ADD(CURRENT_DATE(), INTERVAL ? DAY)
      ORDER BY expiry_date ASC
    `,
      [horizon]
    );

    return rows;
  }

  /**
   * Completed reservation totals grouped by date
   */
  async getSalesByDate() {
    const [rows] = await query(`
      SELECT 
        DATE_FORMAT(reservation_date, '%Y-%m-%d') AS date,
        COUNT(*) AS completed_reservations_count,
        CAST(SUM(total_amount) AS DECIMAL(10,2)) AS total_revenue
      FROM reservations
      WHERE status = 'Completed'
      GROUP BY DATE(reservation_date)
      ORDER BY date DESC
      LIMIT 30
    `);

    return rows;
  }

  /**
   * Most reserved medicines ranking
   */
  async getTopReservedMedicines() {
    const [rows] = await query(`
      SELECT 
        m.medicine_id,
        m.name,
        m.category,
        m.stock_quantity AS current_stock,
        COALESCE(SUM(ri.quantity), 0) AS total_reserved_quantity,
        COUNT(DISTINCT ri.reservation_id) AS total_orders,
        CAST(COALESCE(SUM(ri.quantity * ri.unit_price), 0) AS DECIMAL(10,2)) AS total_reservation_value
      FROM reservation_items ri
      JOIN medicines m ON ri.medicine_id = m.medicine_id
      JOIN reservations r ON ri.reservation_id = r.reservation_id
      WHERE r.status != 'Cancelled'
      GROUP BY m.medicine_id
      ORDER BY total_reserved_quantity DESC
      LIMIT 10
    `);

    return rows;
  }
}

module.exports = new ReportService();
