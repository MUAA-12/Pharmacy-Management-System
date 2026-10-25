const reportService = require('../services/reportService');

class ReportController {
  async getDashboard(req, res, next) {
    try {
      const data = await reportService.getDashboardStats();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getInventory(req, res, next) {
    try {
      const data = await reportService.getInventoryReport();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getLowStock(req, res, next) {
    try {
      const { threshold } = req.query;
      const data = await reportService.getLowStockReport(threshold);
      res.json({ success: true, count: data.length, data });
    } catch (error) {
      next(error);
    }
  }

  async getExpiry(req, res, next) {
    try {
      const { days } = req.query;
      const data = await reportService.getExpiryReport(days);
      res.json({ success: true, count: data.length, data });
    } catch (error) {
      next(error);
    }
  }

  async getSalesByDate(req, res, next) {
    try {
      const data = await reportService.getSalesByDate();
      res.json({ success: true, count: data.length, data });
    } catch (error) {
      next(error);
    }
  }

  async getTopMedicines(req, res, next) {
    try {
      const data = await reportService.getTopReservedMedicines();
      res.json({ success: true, count: data.length, data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
