const customerService = require('../services/customerService');

class CustomerController {
  async getAll(req, res, next) {
    try {
      const { search } = req.query;
      const customers = await customerService.getAllCustomers({ search });
      res.json({ success: true, count: customers.length, data: customers });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const customer = await customerService.getCustomerById(req.params.id);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found.' });
      }
      res.json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const customer = await customerService.createCustomer(req.body);
      res.status(201).json({ success: true, message: 'Customer registered successfully.', data: customer });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const customer = await customerService.updateCustomer(req.params.id, req.body);
      res.json({ success: true, message: 'Customer updated successfully.', data: customer });
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const result = await customerService.deleteCustomer(req.params.id);
      res.json({ success: true, message: result.message, customer_id: result.customer_id });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CustomerController();
