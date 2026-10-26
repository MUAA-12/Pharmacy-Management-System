
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

export default function Medicines({
  addToast,
  role = 'user'
}) {
  const isAdmin = role === 'admin';

  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // Admin-only modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Medicine form
  const emptyForm = {
    name: '',
    category: 'General',
    unit_price: '',
    stock_quantity: '',
    expiry_date: ''
  };

  const [formData, setFormData] = useState(emptyForm);
  const [activeMedicine, setActiveMedicine] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function notify(message, type = 'info') {
    if (typeof addToast === 'function') {
      addToast(message, type);
    }
  }

  function requireAdmin() {
    if (!isAdmin) {
      notify(
        'Access denied. Only Admin can manage medicines.',
        'error'
      );
      return false;
    }

    return true;
  }

  async function loadMedicines() {
    setLoading(true);

    try {
      const res = await medicineApi.getAll({
        search,
        category: categoryFilter,
        availability: availabilityFilter
      });

      if (res.success) {
        setMedicines(
          Array.isArray(res.data) ? res.data : []
        );
      } else {
        setMedicines([]);
        notify(
          res.message || 'Unable to load medicines.',
          'error'
        );
      }
    } catch (err) {
      setMedicines([]);
      notify(err.message || 'Unable to load medicines.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await medicineApi.getCategories();

      if (res.success) {
        setCategories(
          Array.isArray(res.data) ? res.data : []
        );
      }
    } catch (err) {
      console.error('Categories error:', err);
    }
  }

  useEffect(() => {
    loadCategories();
  }, [role]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMedicines();
    }, 250);

    return () => clearTimeout(timer);
  }, [search, categoryFilter, availabilityFilter, role]);

  // Close management dialogs if permissions change
  useEffect(() => {
    if (!isAdmin) {
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setIsDeleteModalOpen(false);
      setActiveMedicine(null);
    }
  }, [isAdmin]);

  function validateForm() {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Medicine name is required.';
    }

    if (
      formData.unit_price === '' ||
      !Number.isFinite(Number(formData.unit_price)) ||
      Number(formData.unit_price) < 0
    ) {
      errors.unit_price =
        'Valid unit price (0 or greater) is required.';
    }

    if (
      formData.stock_quantity === '' ||
      !Number.isInteger(Number(formData.stock_quantity)) ||
      Number(formData.stock_quantity) < 0
    ) {
      errors.stock_quantity =
        'Stock quantity must be a non-negative whole number.';
    }

    if (!formData.expiry_date) {
      errors.expiry_date = 'Expiry date is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleOpenAdd() {
    if (!requireAdmin()) return;

    setFormData({ ...emptyForm });
    setActiveMedicine(null);
    setFormErrors({});
    setIsAddModalOpen(true);
  }

  function handleOpenEdit(med) {
    if (!requireAdmin()) return;

    setActiveMedicine(med);

    setFormData({
      name: med.name || '',
      category: med.category || 'General',
      unit_price: med.unit_price ?? '',
      stock_quantity: med.stock_quantity ?? '',
      expiry_date: med.expiry_date
        ? String(med.expiry_date).slice(0, 10)
        : ''
    });

    setFormErrors({});
    setIsEditModalOpen(true);
  }

  function handleOpenDelete(med) {
    if (!requireAdmin()) return;

    setActiveMedicine(med);
    setIsDeleteModalOpen(true);
  }

  async function handleSubmitAdd(e) {
    if (e?.preventDefault) e.preventDefault();

    if (!requireAdmin() || submitting) return;
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const res = await medicineApi.create(formData);

      if (res.success) {
        notify(
          `Medicine '${res.data.name}' added successfully.`,
          'success'
        );

        setIsAddModalOpen(false);
        await loadMedicines();
        await loadCategories();
      } else {
        notify(res.message || 'Unable to add medicine.', 'error');
      }
    } catch (err) {
      notify(err.message || 'Unable to add medicine.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitEdit(e) {
    if (e?.preventDefault) e.preventDefault();

    if (!requireAdmin() || submitting || !activeMedicine) return;
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const res = await medicineApi.update(
        activeMedicine.medicine_id,
        formData
      );

      if (res.success) {
        notify(
          `Medicine '${res.data.name}' updated successfully.`,
          'success'
        );

        setIsEditModalOpen(false);
        setActiveMedicine(null);
        await loadMedicines();
        await loadCategories();
      } else {
        notify(res.message || 'Unable to update medicine.', 'error');
      }
    } catch (err) {
      notify(err.message || 'Unable to update medicine.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!requireAdmin() || submitting || !activeMedicine) return;

    setSubmitting(true);

    try {
      const res = await medicineApi.delete(
        activeMedicine.medicine_id
      );

      if (res.success) {
        notify(
          res.message || 'Medicine deleted successfully.',
          'success'
        );

        setIsDeleteModalOpen(false);
        setActiveMedicine(null);
        await loadMedicines();
        await loadCategories();
      } else {
        notify(res.message || 'Unable to delete medicine.', 'error');
      }
    } catch (err) {
      notify(err.message || 'Unable to delete medicine.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function updateForm(field, value) {
    setFormData((previous) => ({
      ...previous,
      [field]: value
    }));
  }

  function renderMedicineForm() {
    return (
      <form
        id="medicine-management-form"
        onSubmit={
          isAddModalOpen
            ? handleSubmitAdd
            : handleSubmitEdit
        }
      >
        <div className="form-group">
          <label className="form-label">
            Medicine Name <span className="required">*</span>
          </label>

          <input
            type="text"
            className={`form-control ${
              formErrors.name ? 'error' : ''
            }`}
            placeholder="e.g. Paracetamol 500mg"
            value={formData.name}
            onChange={(e) =>
              updateForm('name', e.target.value)
            }
            required
          />

          {formErrors.name && (
            <div className="form-error-msg">
              {formErrors.name}
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Category</label>

            <input
              type="text"
              className="form-control"
              placeholder="e.g. Pain Relief"
              value={formData.category}
              onChange={(e) =>
                updateForm('category', e.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Unit Price ($) <span className="required">*</span>
            </label>

            <input
              type="number"
              step="0.01"
              min="0"
              className={`form-control ${
                formErrors.unit_price ? 'error' : ''
              }`}
              value={formData.unit_price}
              onChange={(e) =>
                updateForm('unit_price', e.target.value)
              }
              required
            />

            {formErrors.unit_price && (
              <div className="form-error-msg">
                {formErrors.unit_price}
              </div>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              Stock Quantity <span className="required">*</span>
            </label>

            <input
              type="number"
              min="0"
              step="1"
              className={`form-control ${
                formErrors.stock_quantity ? 'error' : ''
              }`}
              value={formData.stock_quantity}
              onChange={(e) =>
                updateForm('stock_quantity', e.target.value)
              }
              required
            />

            {formErrors.stock_quantity && (
              <div className="form-error-msg">
                {formErrors.stock_quantity}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Expiry Date <span className="required">*</span>
            </label>

            <input
              type="date"
              className={`form-control ${
                formErrors.expiry_date ? 'error' : ''
              }`}
              value={formData.expiry_date}
              onChange={(e) =>
                updateForm('expiry_date', e.target.value)
              }
              required
            />

            {formErrors.expiry_date && (
              <div className="form-error-msg">
                {formErrors.expiry_date}
              </div>
            )}
          </div>
        </div>
      </form>
    );
  }

  return (
    <div>
      {/* Search and filter toolbar */}
      <div className="card-section">
        <div
          className="card-body"
          style={{ padding: '20px 24px' }}
        >
          <div
            className="toolbar"
            style={{ marginBottom: 0 }}
          >
            <div className="search-input-wrapper">
              <span className="search-icon">
                <IconSearch size={18} />
              </span>

              <input
                type="text"
                placeholder="Search medicines by name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value)
              }
            >
              <option value="all">All Categories</option>

              {categories.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={availabilityFilter}
              onChange={(e) =>
                setAvailabilityFilter(e.target.value)
              }
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (&gt; 10)</option>
              <option value="low_stock">Low Stock (1 - 10)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
              <option value="near_expiry">
                Expiring Soon (30 Days or Less)
              </option>
              <option value="expired">Expired</option>
            </select>

            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenAdd}
              >
                <IconPlus size={18} />
                <span>Add Medicine</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Medicine inventory table */}
      <div className="card-section">
        <div className="card-header">
          <h3 className="card-title">
            <IconMedicine size={19} />
            <span>
              Medicine Inventory Catalog ({medicines.length})
            </span>
          </h3>

          <span
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-muted)'
            }}
          >
            {isAdmin
              ? 'Supabase PostgreSQL Medicine Inventory'
              : 'Medicine Availability Catalog'}
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
                <th>
                  {isAdmin
                    ? 'Stock Quantity'
                    : 'Availability'}
                </th>

                {isAdmin && <th>Expiry Date</th>}

                <th>Status</th>

                {isAdmin && (
                  <th style={{ textAlign: 'right' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 6}
                    style={{
                      textAlign: 'center',
                      padding: 36,
                      color: 'var(--text-muted)'
                    }}
                  >
                    Loading medicines catalog...
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 6}
                    style={{
                      textAlign: 'center',
                      padding: 36,
                      color: 'var(--text-muted)'
                    }}
                  >
                    No medicines match your search or filters.
                  </td>
                </tr>
              ) : (
                medicines.map((med) => (
                  <tr key={med.medicine_id}>
                    <td
                      style={{
                        fontWeight: 700,
                        color: 'var(--text-muted)'
                      }}
                    >
                      #{med.medicine_id}
                    </td>

                    <td>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.92rem'
                        }}
                      >
                        {med.name}
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          background: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: '0.78rem',
                          fontWeight: 600
                        }}
                      >
                        {med.category || 'General'}
                      </span>
                    </td>

                    <td
                      style={{
                        fontWeight: 700,
                        color: 'var(--primary-dark)'
                      }}
                    >
                      ${Number(med.unit_price || 0).toFixed(2)}
                    </td>

                    <td>
                      {isAdmin ? (
                        <span
                          style={{
                            fontWeight: 800,
                            color:
                              med.stock_quantity <= 0
                                ? 'var(--danger)'
                                : med.stock_quantity <= 10
                                  ? 'var(--warning-text)'
                                  : 'var(--text-main)'
                          }}
                        >
                          {med.stock_quantity} units
                        </span>
                      ) : (
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              Number(med.stock_quantity) > 0
                                ? '#047857'
                                : '#dc2626'
                          }}
                        >
                          {Number(med.stock_quantity) > 0
                            ? 'Available'
                            : 'Out of Stock'}
                        </span>
                      )}
                    </td>

                    {isAdmin && (
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          {med.expiry_date}
                        </div>

                        {Number.isFinite(
                          Number(med.days_until_expiry)
                        ) && med.days_until_expiry < 0 ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--danger)',
                              fontWeight: 700
                            }}
                          >
                            Expired{' '}
                            {Math.abs(med.days_until_expiry)}{' '}
                            days ago
                          </span>
                        ) : Number.isFinite(
                          Number(med.days_until_expiry)
                        ) && med.days_until_expiry <= 30 ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--warning-text)',
                              fontWeight: 700
                            }}
                          >
                            Expires in{' '}
                            {med.days_until_expiry} days
                          </span>
                        ) : null}
                      </td>
                    )}

                    <td>
                      <Badge status={med.status} />
                    </td>

                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: 6
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() =>
                              handleOpenEdit(med)
                            }
                            title="Edit medicine"
                          >
                            <IconEdit size={14} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{
                              color: 'var(--danger)'
                            }}
                            onClick={() =>
                              handleOpenDelete(med)
                            }
                            title="Delete medicine"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Management dialogs are Admin-only */}
      {isAdmin && (
        <>
          <Modal
            isOpen={isAddModalOpen}
            onClose={() =>
              !submitting && setIsAddModalOpen(false)
            }
            title="Add New Medicine to Inventory"
            footer={
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() =>
                    setIsAddModalOpen(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  form="medicine-management-form"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Saving...'
                    : 'Save Medicine'}
                </button>
              </>
            }
          >
            {isAddModalOpen && renderMedicineForm()}
          </Modal>

          <Modal
            isOpen={isEditModalOpen}
            onClose={() =>
              !submitting && setIsEditModalOpen(false)
            }
            title={`Edit Medicine: ${
              activeMedicine?.name || ''
            }`}
            footer={
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() =>
                    setIsEditModalOpen(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  form="medicine-management-form"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Updating...'
                    : 'Update Details'}
                </button>
              </>
            }
          >
            {isEditModalOpen && renderMedicineForm()}
          </Modal>

          <Modal
            isOpen={isDeleteModalOpen}
            onClose={() =>
              !submitting && setIsDeleteModalOpen(false)
            }
            title="Confirm Medicine Deletion"
            footer={
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() =>
                    setIsDeleteModalOpen(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={submitting}
                  onClick={handleConfirmDelete}
                >
                  {submitting
                    ? 'Deleting...'
                    : 'Delete Medicine'}
                </button>
              </>
            }
          >
            <p style={{ marginBottom: 12 }}>
              Are you sure you want to delete medicine{' '}
              <strong>
                '{activeMedicine?.name}'
              </strong>{' '}
              (ID #{activeMedicine?.medicine_id})?
            </p>

            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: 12,
                fontSize: '0.85rem',
                color: '#991b1b'
              }}
            >
              <strong>DBMS Safe Deletion Rule:</strong>{' '}
              If this medicine is referenced in past
              reservations, deletion should be rejected
              by the database to preserve history.
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
