const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

// Routes for Reservations
router.get('/', reservationController.getAll);
router.get('/:id', reservationController.getById);
router.post('/', reservationController.create);
router.put('/:id/cancel', reservationController.cancel);
router.put('/:id/complete', reservationController.complete);

module.exports = router;
