const reservationService = require('../services/reservationService');

class ReservationController {
  async getAll(req, res, next) {
    try {
      const { status, search } = req.query;
      const reservations = await reservationService.getAllReservations({ status, search });
      res.json({ success: true, count: reservations.length, data: reservations });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const reservation = await reservationService.getReservationById(req.params.id);
      if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found.' });
      }
      res.json({ success: true, data: reservation });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { customer_id, items, notes } = req.body;
      const reservation = await reservationService.createReservation({ customer_id, items, notes });
      res.status(201).json({
        success: true,
        message: 'Reservation created successfully and stock allocated.',
        data: reservation
      });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const reservation = await reservationService.cancelReservation(req.params.id);
      res.json({
        success: true,
        message: `Reservation #${req.params.id} cancelled successfully and reserved stock has been restored to inventory.`,
        data: reservation
      });
    } catch (error) {
      next(error);
    }
  }

  async complete(req, res, next) {
    try {
      const reservation = await reservationService.completeReservation(req.params.id);
      res.json({
        success: true,
        message: `Reservation #${req.params.id} marked as Completed.`,
        data: reservation
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReservationController();
