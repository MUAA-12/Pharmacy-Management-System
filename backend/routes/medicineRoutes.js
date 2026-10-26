
const express = require('express');
const router = express.Router();

const medicineController = require('../controllers/medicineController');

const {
  requireAuth,
  requireRole
} = require('../middleware/authMiddleware');

// Every medicine route requires a valid Supabase login
router.use(requireAuth);

// Admin and normal users can browse medicines.
// Admin receives the inventory view.
// Normal users must receive only safe catalog fields.
// We will enforce field filtering in medicineController.js.
router.get(
  '/',
  requireRole('admin', 'user'),
  medicineController.getAll
);

// Admin and normal users can browse categories
router.get(
  '/categories',
  requireRole('admin', 'user'),
  medicineController.getCategories
);

// Admin and normal users can view medicine details
router.get(
  '/:id',
  requireRole('admin', 'user'),
  medicineController.getById
);

// Only Admin can add medicines
router.post(
  '/',
  requireRole('admin'),
  medicineController.create
);

// Only Admin can update medicines
router.put(
  '/:id',
  requireRole('admin'),
  medicineController.update
);

// Only Admin can delete medicines
router.delete(
  '/:id',
  requireRole('admin'),
  medicineController.remove
);

module.exports = router;
