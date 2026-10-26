
const express = require('express');
const router = express.Router();

const reservationController = require('../controllers/reservationController');

const {
  requireAuth,
  requireRole
} = require('../middleware/authMiddleware');

// All reservation routes require a valid Supabase login.
router.use(requireAuth);

// Only Admin can access reservation management.
router.use(requireRole('admin'));

// Get all reservations
router.get(
  '/',
  reservationController.getAll
);

// Get a reservation by ID
router.get(
  '/:id',
  reservationController.getById
);

// Create a new reservation
router.post(
  '/',
  reservationController.create
);

// Cancel an existing reservation
router.put(
  '/:id/cancel',
  reservationController.cancel
);

// Mark a reservation as completed
router.put(
  '/:id/complete',
  reservationController.complete
);

module.exports = router;
