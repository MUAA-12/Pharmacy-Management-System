import React, { useState, useEffect } from 'react';
import { customerApi } from '../services/api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCustomers,
  IconEye
} from '../components/Icons';

export default function Customers({ addToast, onOpenViewReservation }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await customerApi.getAll({ search });
      if (res.success) {
        setCustomers(res.data);
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  function validateForm() {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Customer name is required.';
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (formData.phone.trim().length < 7) {
      errors.phone = 'Please provide a valid phone number (minimum 7 digits).';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleOpenAdd() {
    setFormData({ name: '', phone: '', email: '' });
    setFormErrors({});
    setIsAddModalOpen(true);
  }

  function handleOpenEdit(cust) {
    setActiveCustomer(cust);
    setFormData({ name: cust.name, phone: cust.phone, email: cust.email || '' });
    setFormErrors({});
    setIsEditModalOpen(true);
  }

  function handleOpenDelete(cust) {
    setActiveCustomer(cust);
    setIsDeleteModalOpen(true);
  }

  async function handleOpenHistory(cust) {
    try {
      const res = await customerApi.getById(cust.customer_id);
      if (res.success) {
        setCustomerHistory(res.data);
        setIsHistoryModalOpen(true);
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleSubmitAdd(e) {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const res = await customerApi.create(formData);
      if (res.success) {
        addToast(`Customer '${res.data.name}' registered successfully.`, 'success');
        setIsAddModalOpen(false);
        loadCustomers();
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
      const res = await customerApi.update(activeCustomer.customer_id, formData);
      if (res.success) {
        addToast(`Customer '${res.data.name}' updated successfully.`, 'success');
        setIsEditModalOpen(false);
        loadCustomers();
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
      const res = await customerApi.delete(activeCustomer.customer_id);
      if (res.success) {
        addToast(res.message, 'success');
        setIsDeleteModalOpen(false);
        loadCustomers();
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Search and Action Bar */}
      <div className="card-section">
        <div className="card-body" style={{ padding: '20px 24px' }}>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <div className="search-input-wrapper">
              <span className="search-icon"><IconSearch size={18} /></span>
              <input
                type="text"
                placeholder="Search customers by name, phone number, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <IconPlus size={18} />
              <span>Register Customer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card-section">
        <div className="card-header">
          <h3 className="card-title">
            <IconCustomers size={19} />
            <span>Customer Directory ({customers.length})</span>
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Maintains unique phone identification & reservation ledger
          </span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer Name</th>
                <th>Phone Number</th>
                <th>Email Address</th>
                <th>Joined Date</th>
                <th>Total Reservations</th>
                <th>Total Spent</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Loading customer profiles...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No customer records found. Click 'Register Customer' to add one.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.customer_id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{cust.customer_id}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{cust.name}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{cust.phone}</span>
                    </td>
                    <td>
                      <span style={{ color: cust.email ? 'var(--text-main)' : 'var(--text-light)', fontSize: '0.85rem' }}>
                        {cust.email || 'None provided'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cust.created_at}</td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{cust.total_reservations}</span> reservations
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>
                      ${parseFloat(cust.total_spent || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenHistory(cust)}
                          title="View reservation history"
                        >
                          <IconEye size={14} />
                          <span>History</span>
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(cust)}
                          title="Edit profile"
                        >
                          <IconEdit size={14} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleOpenDelete(cust)}
                          title="Safe delete customer"
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

      {/* Register Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Customer"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmitAdd} disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Customer'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitAdd}>
          <div className="form-group">
            <label className="form-label">Full Name <span className="required">*</span></label>
            <input
              type="text"
              className={`form-control ${formErrors.name ? 'error' : ''}`}
              placeholder="e.g. John Doe, Fatima Bibi"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {formErrors.name && <div className="form-error-msg">{formErrors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number (Unique Identifier) <span className="required">*</span></label>
            <input
              type="text"
              className={`form-control ${formErrors.phone ? 'error' : ''}`}
              placeholder="e.g. 03001234567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            {formErrors.phone && <div className="form-error-msg">{formErrors.phone}</div>}
            <div className="form-hint">Used for reservation lookups and SMS pickup notifications.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Optional)</label>
            <input
              type="email"
              className="form-control"
              placeholder="customer@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Customer: ${activeCustomer?.name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmitEdit} disabled={submitting}>
              {submitting ? 'Updating...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitEdit}>
          <div className="form-group">
            <label className="form-label">Full Name <span className="required">*</span></label>
            <input
              type="text"
              className={`form-control ${formErrors.name ? 'error' : ''}`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {formErrors.name && <div className="form-error-msg">{formErrors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number <span className="required">*</span></label>
            <input
              type="text"
              className={`form-control ${formErrors.phone ? 'error' : ''}`}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            {formErrors.phone && <div className="form-error-msg">{formErrors.phone}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Customer History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Reservation History: ${customerHistory?.name}`}
        maxWidth="750px"
        footer={
          <button className="btn btn-secondary" onClick={() => setIsHistoryModalOpen(false)}>
            Close
          </button>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Phone: <strong style={{ color: 'var(--text-main)' }}>{customerHistory?.phone}</strong> | Email: <strong style={{ color: 'var(--text-main)' }}>{customerHistory?.email || 'N/A'}</strong>
          </div>
        </div>

        {customerHistory?.reservations?.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No reservation orders found for this customer.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Res ID</th>
                  <th>Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {customerHistory?.reservations?.map((res) => (
                  <tr key={res.reservation_id}>
                    <td style={{ fontWeight: 700 }}>#{res.reservation_id}</td>
                    <td style={{ fontSize: '0.8rem' }}>{res.reservation_date}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>${res.total_amount}</td>
                    <td><Badge status={res.status} type="reservation" /></td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setIsHistoryModalOpen(false);
                          if (onOpenViewReservation) onOpenViewReservation(res.reservation_id);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Customer Deletion"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete Customer'}
            </button>
          </>
        }
      >
        <p style={{ marginBottom: 12 }}>
          Are you sure you want to delete customer <strong>'{activeCustomer?.name}'</strong> (Phone: {activeCustomer?.phone})?
        </p>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: '#991b1b' }}>
          <strong>Foreign Key Integrity:</strong> Customers who have active or past reservation history cannot be deleted to preserve the university DBMS audit trail.
        </div>
      </Modal>
    </div>
  );
}
