
const medicineService = require('../services/medicineService');

// Only expose approved catalog information to normal users.
// Never return the original database object to a normal user.
function toPublicMedicine(medicine) {
  const stockQuantity = Number(medicine.stock_quantity || 0);

  // Do not advertise expired medicines as available.
  const expiryDate = medicine.expiry_date
    ? new Date(medicine.expiry_date)
    : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isExpired =
    expiryDate instanceof Date &&
    !Number.isNaN(expiryDate.getTime()) &&
    expiryDate < today;

  const available = stockQuantity > 0 && !isExpired;

  return {
    medicine_id: medicine.medicine_id,
    name: medicine.name,
    category: medicine.category || 'General',
    unit_price: medicine.unit_price,
    available,
    availability: available ? 'Available' : 'Unavailable',
    status: available ? 'in_stock' : 'out_of_stock'
  };
}

class MedicineController {
  async getAll(req, res, next) {
    try {
      const {
        search,
        category,
        availability
      } = req.query;

      const medicines = await medicineService.getAllMedicines({
        search,
        category,
        availability
      });

      const isAdmin = req.userRole === 'admin';

      const data = isAdmin
        ? medicines
        : medicines.map(toPublicMedicine);

      return res.json({
        success: true,
        count: data.length,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const medicine = await medicineService.getMedicineById(
        req.params.id
      );

      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found.'
        });
      }

      const isAdmin = req.userRole === 'admin';

      return res.json({
        success: true,
        data: isAdmin
          ? medicine
          : toPublicMedicine(medicine)
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await medicineService.getCategories();

      return res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const newMed = await medicineService.createMedicine(
        req.body
      );

      return res.status(201).json({
        success: true,
        message: 'Medicine added successfully.',
        data: newMed
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await medicineService.updateMedicine(
        req.params.id,
        req.body
      );

      return res.json({
        success: true,
        message: 'Medicine updated successfully.',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const result = await medicineService.deleteMedicine(
        req.params.id
      );

      return res.json({
        success: true,
        message: result.message,
        medicine_id: result.medicine_id
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MedicineController();
