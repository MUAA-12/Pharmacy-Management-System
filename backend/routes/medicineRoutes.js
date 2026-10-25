const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');

// Routes for Medicines
router.get('/', medicineController.getAll);
router.get('/categories', medicineController.getCategories);
router.get('/:id', medicineController.getById);
router.post('/', medicineController.create);
router.put('/:id', medicineController.update);
router.delete('/:id', medicineController.remove);

module.exports = router;
