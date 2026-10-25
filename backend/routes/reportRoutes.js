const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Routes for Reports & Analytics
router.get('/dashboard', reportController.getDashboard);
router.get('/inventory', reportController.getInventory);
router.get('/low-stock', reportController.getLowStock);
router.get('/expiry', reportController.getExpiry);
router.get('/sales-by-date', reportController.getSalesByDate);
router.get('/top-medicines', reportController.getTopMedicines);

module.exports = router;
