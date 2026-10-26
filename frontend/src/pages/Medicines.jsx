import React, { useState, useEffect } from 'react';
import { medicineApi } from '../services/api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconMedicine
} from '../components/Icons';

export default function Medicines({ addToast }) {
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit_price: '',
    stock_quantity: '',
    expiry_date: ''
  });
  const [activeMedicine, setActiveMedicine] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function loadMedicines() {
    setLoading(true);
    try {
      const res = await medicineApi.getAll({
        search,
        category: categoryFilter,
        availability: availabilityFilter
      });
      if (res.success) {
        setMedicines(res.data);
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await medicineApi.getCategories();
      if (res.success) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMedicines();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, availabilityFilter]);

  function validateForm() {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Medicine name is required.';
    if (!formData.unit_price || isNaN(formData.unit_price) || parseFloat(formData.unit_price) < 0) {
      errors.unit_price = 'Valid unit price (>= 0) is required.';
    }
    if (formData.stock_quantity === '' || isNaN(formData.stock_quantity) || parseInt(formData.stock_quantity, 10) < 0) {
      errors.stock_quantity = 'Valid stock quantity (>= 0) is required.';
    }
    if (!formData.expiry_date) {
      errors.expiry_date = 'Expiry date is required.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleOpenAdd() {
    setFormData({
      name: '',
      category: 'General',
      unit_price: '',
      stock_quantity: '',
      expiry_date: ''
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  }

  function handleOpenEdit(med) {
    setActiveMedicine(med);
    setFormData({
      name: med.name,
      category: med.category || 'General',
      unit_price: med.unit_price,
      stock_quantity: med.stock_quantity,
      expiry_date: med.expiry_date
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  }

  function handleOpenDelete(med) {
    setActiveMedicine(med);
    setIsDeleteModalOpen(true);
  }

  async function handleSubmitAdd(e) {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const res = await medicineApi.create(formData);
      if (res.success) {
        addToast(`Medicine '${res.data.name}' added successfully.`, 'success');
        setIsAddModalOpen(false);
        loadMedicines();
        loadCategories();
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitEdit(e) {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const res = await medicineApi.update(activeMedicine.medicine_id, formData);
      if (res.success) {
        addToast(`Medicine '${res.data.name}' updated successfully.`, 'success');
        setIsEditModalOpen(false);
        loadMedicines();
        loadCategories();
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    setSubmitting(true);
    try {
      const res = await medicineApi.delete(activeMedicine.medicine_id);
      if (res.success) {
        addToast(res.message, 'success');
        setIsDeleteModalOpen(false);
        loadMedicines();
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Header Toolbar */}
      <div className="card-section">
        <div className="card-body" style={{ padding: '20px 24px' }}>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            {/* Search */}
            <div className="search-input-wrapper">
              <span className="search-icon"><IconSearch size={18} /></span>
              <input
                type="text"
                placeholder="Search medicines by name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <select
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Availability Filter */}
            <select
              className="filter-select"
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (&gt; 10)</option>
              <option value="low_stock">Low Stock (1 - 10)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
              <option value="near_expiry">Expiring Soon (≤ 30 Days)</option>
              <option value="expired">Expired</option>
            </select>

            {/* Add Button */}
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <IconPlus size={18} />
              <span>Add Medicine</span>
            </button>
          </div>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="card-section">
        <div className="card-header">
          <h3 className="card-title">
            <IconMedicine size={19} />
            <span>Medicine Inventory Catalog ({medicines.length})</span>
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Real-time synchronization with PostgreSQL `medicines` table
          </span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Medicine Name</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Stock Quantity</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Loading medicines catalog...
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No medicines match the selected search and filter criteria.
                  </td>
                </tr>
              ) : (
                medicines.map((med) => (
                  <tr key={med.medicine_id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{med.medicine_id}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{med.name}</div>
                    </td>
                    <td>
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                        {med.category || 'General'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>
                      ${parseFloat(med.unit_price).toFixed(2)}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 800,
                        color: med.stock_quantity <= 0 ? 'var(--danger)' : med.stock_quantity <= 10 ? 'var(--warning-text)' : 'var(--text-main)'
                      }}>
                        {med.stock_quantity} units
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{med.expiry_date}</div>
                      {med.days_until_expiry < 0 ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 700 }}>
                          Expired {Math.abs(med.days_until_expiry)} days ago
                        </span>
                      ) : med.days_until_expiry <= 30 ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--warning-text)', fontWeight: 700 }}>
                          Expires in {med.days_until_expiry} days
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <Badge status={med.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(med)}
                          title="Edit medicine details"
                        >
                          <IconEdit size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleOpenDelete(med)}
                          title="Safe delete medicine"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Medicine Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Medicine to Inventory"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmitAdd} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Medicine'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitAdd}>
          <div className="form-group">
            <label className="form-label">Medicine Name <span className="required">*</span></label>
            <input
              type="text"
              className={`form-control ${formErrors.name ? 'error' : ''}`}
              placeholder="e.g. Paracetamol 500mg, Amoxicillin"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {formErrors.name && <div className="form-error-msg">{formErrors.name}</div>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Pain Relief, Antibiotic"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Unit Price ($) <span className="required">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`form-control ${formErrors.unit_price ? 'error' : ''}`}
                placeholder="0.00"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
              />
              {formErrors.unit_price && <div className="form-error-msg">{formErrors.unit_price}</div>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Initial Stock Quantity <span className="required">*</span></label>
              <input
                type="number"
                min="0"
                className={`form-control ${formErrors.stock_quantity ? 'error' : ''}`}
                placeholder="0"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              />
              {formErrors.stock_quantity && <div className="form-error-msg">{formErrors.stock_quantity}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date <span className="required">*</span></label>
              <input
                type="date"
                className={`form-control ${formErrors.expiry_date ? 'error' : ''}`}
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
              {formErrors.expiry_date && <div className="form-error-msg">{formErrors.expiry_date}</div>}
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Medicine Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Medicine: ${activeMedicine?.name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmitEdit} disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Details'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitEdit}>
          <div className="form-group">
            <label className="form-label">Medicine Name <span className="required">*</span></label>
            <input
              type="text"
              className={`form-control ${formErrors.name ? 'error' : ''}`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {formErrors.name && <div className="form-error-msg">{formErrors.name}</div>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                type="text"
                className="form-control"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Unit Price ($) <span className="required">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`form-control ${formErrors.unit_price ? 'error' : ''}`}
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
              />
              {formErrors.unit_price && <div className="form-error-msg">{formErrors.unit_price}</div>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Stock Quantity <span className="required">*</span></label>
              <input
                type="number"
                min="0"
                className={`form-control ${formErrors.stock_quantity ? 'error' : ''}`}
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              />
              {formErrors.stock_quantity && <div className="form-error-msg">{formErrors.stock_quantity}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date <span className="required">*</span></label>
              <input
                type="date"
                className={`form-control ${formErrors.expiry_date ? 'error' : ''}`}
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
              {formErrors.expiry_date && <div className="form-error-msg">{formErrors.expiry_date}</div>}
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Medicine Deletion"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete Medicine'}
            </button>
          </>
        }
      >
        <p style={{ marginBottom: 12 }}>
          Are you sure you want to delete medicine <strong>'{activeMedicine?.name}'</strong> (ID #{activeMedicine?.medicine_id})?
        </p>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: '#991b1b' }}>
          <strong>DBMS Safe Deletion Rule:</strong> If this medicine is referenced in past reservations, deletion will be safely rejected by the database to preserve transaction and audit history.
        </div>
      </Modal>
    </div>
  );
}
