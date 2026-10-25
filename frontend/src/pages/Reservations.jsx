import React, { useState, useEffect } from 'react';
import { reservationApi } from '../services/api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import {
  IconSearch,
  IconEye,
  IconCheckCircle,
  IconXCircle,
  IconReservation,
  IconAlertTriangle
} from '../components/Icons';

export default function Reservations({ addToast, selectedReservationId, onClearSelectedId }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Details Modal
  const [detailsReservation, setDetailsReservation] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Action Confirmation Modals
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [actionReservation, setActionReservation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadReservations() {
    setLoading(true);
    try {
      const res = await reservationApi.getAll({
        status: statusFilter,
        search
      });
      if (res.success) {
        setReservations(res.data);
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReservations();
    }, 200);
    return () => clearTimeout(timer);
  }, [statusFilter, search]);

  // Handle external open request (e.g. from Dashboard or Customer history)
  useEffect(() => {
    if (selectedReservationId) {
      handleOpenDetails(selectedReservationId);
      if (onClearSelectedId) onClearSelectedId();
    }
  }, [selectedReservationId]);

  async function handleOpenDetails(resId) {
    try {
      const res = await reservationApi.getById(resId);
      if (res.success) {
        setDetailsReservation(res.data);
        setDetailsModalOpen(true);
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  function handleOpenCancel(res) {
    setActionReservation(res);
    setCancelModalOpen(true);
  }

  function handleOpenComplete(res) {
    setActionReservation(res);
    setCompleteModalOpen(true);
  }

  async function handleConfirmCancel() {
    setSubmitting(true);
    try {
      const res = await reservationApi.cancel(actionReservation.reservation_id);
      if (res.success) {
        addToast(res.message, 'success');
        setCancelModalOpen(false);
        if (detailsModalOpen && detailsReservation?.reservation_id === actionReservation.reservation_id) {
          setDetailsReservation(res.data);
        }
        loadReservations();
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmComplete() {
    setSubmitting(true);
    try {
      const res = await reservationApi.complete(actionReservation.reservation_id);
      if (res.success) {
        addToast(res.message, 'success');
        setCompleteModalOpen(false);
        if (detailsModalOpen && detailsReservation?.reservation_id === actionReservation.reservation_id) {
          setDetailsReservation(res.data);
        }
        loadReservations();
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const counts = {
    all: reservations.length,
    Pending: reservations.filter((r) => r.status === 'Pending').length,
    Completed: reservations.filter((r) => r.status === 'Completed').length,
    Cancelled: reservations.filter((r) => r.status === 'Cancelled').length
  };

  return (
    <div>
      {/* Tabs Filter Header */}
      <div className="tabs-header">
        {['all', 'Pending', 'Completed', 'Cancelled'].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${statusFilter === tab ? 'active' : ''}`}
            onClick={() => setStatusFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Reservations
          </button>
        ))}
      </div>

      {/* Search Toolbar */}
      <div className="card-section">
        <div className="card-body" style={{ padding: '20px 24px' }}>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <div className="search-input-wrapper">
              <span className="search-icon"><IconSearch size={18} /></span>
              <input
                type="text"
                placeholder="Search by customer name, phone number, or reservation ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Showing {reservations.length} records
            </div>
          </div>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="card-section">
        <div className="card-header">
          <h3 className="card-title">
            <IconReservation size={19} />
            <span>Reservations Ledger</span>
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Strict ACID transaction control: stock restored upon cancellation
          </span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Reservation Date</th>
                <th>Total Items</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Notes</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Loading reservations...
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No reservations found matching the current criteria.
                  </td>
                </tr>
              ) : (
                reservations.map((res) => (
                  <tr key={res.reservation_id}>
                    <td style={{ fontWeight: 700 }}>#{res.reservation_id}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{res.customer_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {res.customer_phone}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{res.reservation_date}</td>
                    <td>{res.total_items} items ({res.total_quantity} units)</td>
                    <td style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '0.95rem' }}>
                      ${parseFloat(res.total_amount).toFixed(2)}
                    </td>
                    <td>
                      <Badge status={res.status} type="reservation" />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {res.notes || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenDetails(res.reservation_id)}
                          title="View items and details"
                        >
                          <IconEye size={14} />
                          <span>View</span>
                        </button>

                        {res.status === 'Pending' && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleOpenComplete(res)}
                              title="Complete and mark fulfilled"
                            >
                              <IconCheckCircle size={14} />
                              <span>Complete</span>
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleOpenCancel(res)}
                              title="Cancel reservation & restore stock"
                            >
                              <IconXCircle size={14} />
                              <span>Cancel</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reservation Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={`Reservation Details: #${detailsReservation?.reservation_id}`}
        maxWidth="700px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div>
              {detailsReservation?.status === 'Pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => {
                      setActionReservation(detailsReservation);
                      setCompleteModalOpen(true);
                    }}
                  >
                    Complete Pickup
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      setActionReservation(detailsReservation);
                      setCancelModalOpen(true);
                    }}
                  >
                    Cancel & Restore Stock
                  </button>
                </div>
              )}
            </div>
            <button className="btn btn-secondary" onClick={() => setDetailsModalOpen(false)}>
              Close
            </button>
          </div>
        }
      >
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.88rem' }}>
            <div>Customer Name: <strong>{detailsReservation?.customer_name}</strong></div>
            <div>Phone: <strong style={{ fontFamily: 'monospace' }}>{detailsReservation?.customer_phone}</strong></div>
            <div>Status: <Badge status={detailsReservation?.status} type="reservation" /></div>
            <div>Reservation Date: <strong>{detailsReservation?.reservation_date}</strong></div>
            <div>Email: <strong>{detailsReservation?.customer_email || 'None'}</strong></div>
            <div>Total Amount: <strong style={{ color: 'var(--primary-dark)', fontSize: '1.05rem' }}>${detailsReservation?.total_amount}</strong></div>
          </div>
          {detailsReservation?.notes && (
            <div style={{ marginTop: 10, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Notes: <em>{detailsReservation?.notes}</em>
            </div>
          )}
        </div>

        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 10 }}>Reserved Medicine Items:</h4>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {detailsReservation?.items?.map((item) => (
                <tr key={item.medicine_id}>
                  <td style={{ fontWeight: 700 }}>{item.medicine_name}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                      {item.medicine_category || 'General'}
                    </span>
                  </td>
                  <td>{item.quantity} units</td>
                  <td>${parseFloat(item.unit_price).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary-dark)' }}>
                    ${parseFloat(item.subtotal).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={`Cancel Reservation #${actionReservation?.reservation_id}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCancelModalOpen(false)}>
              Keep Active
            </button>
            <button className="btn btn-danger" onClick={handleConfirmCancel} disabled={submitting}>
              {submitting ? 'Cancelling & Restoring Stock...' : 'Confirm Cancellation'}
            </button>
          </>
        }
      >
        <p style={{ marginBottom: 12 }}>
          Are you sure you want to cancel reservation <strong>#{actionReservation?.reservation_id}</strong> for <strong>{actionReservation?.customer_name}</strong>?
        </p>
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: '#92400e' }}>
          <strong>ACID Stock Rollback:</strong> When cancelled, the medicine stock deducted during booking will be atomically restored back to inventory. Repeated cancellations are prohibited.
        </div>
      </Modal>

      {/* Complete Confirmation Modal */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title={`Complete Reservation #${actionReservation?.reservation_id}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCompleteModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-success" onClick={handleConfirmComplete} disabled={submitting}>
              {submitting ? 'Completing...' : 'Mark as Completed'}
            </button>
          </>
        }
      >
        <p style={{ marginBottom: 12 }}>
          Confirm that customer <strong>{actionReservation?.customer_name}</strong> has received their reserved medicines (Total: <strong>${actionReservation?.total_amount}</strong>)?
        </p>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: '#1e40af' }}>
          <strong>Inventory Invariant:</strong> Stock was already securely deducted at reservation time, so completing this reservation safely shifts the status to <code>Completed</code> without deducting stock a second time.
        </div>
      </Modal>
    </div>
  );
}
