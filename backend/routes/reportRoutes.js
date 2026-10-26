
const express = require('express');
const router = express.Router();

const reportController = require('../controllers/reportController');

const {
  requireAuth,
  requireRole
} = require('../middleware/authMiddleware');

// Every reports endpoint requires a valid Supabase login.
router.use(requireAuth);

// Only Admin can access reports and analytics.
// Normal users cannot access sales, financial,
// reservation, or inventory management reports.
router.use(requireRole('admin'));

// Dashboard summary and analytics
router.get(
  '/dashboard',
  reportController.getDashboard
);

// Complete inventory report
router.get(
  '/inventory',
  reportController.getInventory
);

// Low-stock medicines report
router.get(
  '/low-stock',
  reportController.getLowStock
);

// Expiring and expired medicines report
router.get(
  '/expiry',
  reportController.getExpiry
);

// Sales grouped by date
router.get(
  '/sales-by-date',
  reportController.getSalesByDate
);

// Top medicines analytics
router.get(
  '/top-medicines',
  reportController.getTopMedicines
);

module.exports = router;
