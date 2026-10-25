const medicineService = require('../services/medicineService');

class MedicineController {
  async getAll(req, res, next) {
    try {
      const { search, category, availability } = req.query;
      const medicines = await medicineService.getAllMedicines({ search, category, availability });
      res.json({ success: true, count: medicines.length, data: medicines });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const medicine = await medicineService.getMedicineById(req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found.' });
      }
      res.json({ success: true, data: medicine });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const newMed = await medicineService.createMedicine(req.body);
      res.status(201).json({ success: true, message: 'Medicine added successfully.', data: newMed });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await medicineService.updateMedicine(req.params.id, req.body);
      res.json({ success: true, message: 'Medicine updated successfully.', data: updated });
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const result = await medicineService.deleteMedicine(req.params.id);
      res.json({ success: true, message: result.message, medicine_id: result.medicine_id });
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await medicineService.getCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MedicineController();
