import React, { useState, useEffect } from 'react';
import { medicineApi, customerApi, reservationApi } from '../services/api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import {
  IconSearch,
  IconPlus,
  IconTrash,
  IconCheckCircle,
  IconAlertTriangle,
  IconNewReservation
} from '../components/Icons';

export default function CreateReservation({ addToast, setActivePage, onOpenViewReservation }) {
  const [customers, setCustomers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [cart, setCart] = useState([]); // [{ medicine_id, name, unit_price, stock_quantity, requested_qty, subtotal }]
  const [notes, setNotes] = useState('');
  const [medicineSearch, setMedicineSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quick Customer Register Modal
  const [isQuickCustOpen, setIsQuickCustOpen] = useState(false);
  const [quickCustForm, setQuickCustForm] = useState({ name: '', phone: '', email: '' });

  // Receipt Modal on Success
  const [receiptModal, setReceiptModal] = useState(null);

  async function loadInitialData() {
    setLoading(true);
    try {
      const [custRes, medRes] = await Promise.all([
        customerApi.getAll(),
        medicineApi.getAll()
      ]);
      if (custRes.success) setCustomers(custRes.data);
      if (medRes.success) setMedicines(medRes.data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter medicines for selection catalog
  const filteredMedicines = medicines.filter((m) => {
    if (!medicineSearch.trim()) return true;
    const term = medicineSearch.toLowerCase();
    return m.name.toLowerCase().includes(term) || (m.category && m.category.toLowerCase().includes(term));
  });

  function handleAddToCart(med) {
    if (med.status === 'Expired') {
      addToast(`'${med.name}' is expired and cannot be reserved.`, 'warning');
      return;
    }
    if (med.stock_quantity <= 0) {
      addToast(`'${med.name}' is out of stock.`, 'warning');
      return;
    }

    const existingIndex = cart.findIndex((item) => item.medicine_id === med.medicine_id);
    if (existingIndex >= 0) {
      const current = cart[existingIndex];
      if (current.requested_qty >= med.stock_quantity) {
        addToast(`Cannot add more than available stock (${med.stock_quantity} units) for ${med.name}.`, 'warning');
        return;
      }
      const updated = [...cart];
      updated[existingIndex].requested_qty += 1;
      updated[existingIndex].subtotal = updated[existingIndex].requested_qty * updated[existingIndex].unit_price;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          medicine_id: med.medicine_id,
          name: med.name,
          category: med.category,
          unit_price: parseFloat(med.unit_price),
          stock_quantity: med.stock_quantity,
          requested_qty: 1,
          subtotal: parseFloat(med.unit_price)
        }
      ]);
    }
  }

  function handleUpdateQty(medId, newQty) {
    const med = medicines.find((m) => m.medicine_id === medId);
    const maxStock = med ? med.stock_quantity : 999;

    const qty = Math.max(1, Math.min(newQty, maxStock));
    const updated = cart.map((item) => {
      if (item.medicine_id === medId) {
        return {
          ...item,
          requested_qty: qty,
          subtotal: qty * item.unit_price
        };
      }
      return item;
    });
    setCart(updated);
  }

  function handleRemoveItem(medId) {
    setCart(cart.filter((item) => item.medicine_id !== medId));
  }

  const grandTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  async function handleQuickRegister(e) {
    e.preventDefault();
    if (!quickCustForm.name.trim() || !quickCustForm.phone.trim()) {
      addToast('Name and phone are required.', 'warning');
      return;
    }
    try {
      const res = await customerApi.create(quickCustForm);
      if (res.success) {
        addToast(`Customer '${res.data.name}' registered.`, 'success');
        setCustomers([...customers, res.data]);
        setSelectedCustomerId(res.data.customer_id);
        setIsQuickCustOpen(false);
        setQuickCustForm({ name: '', phone: '', email: '' });
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleSubmitReservation() {
    if (!selectedCustomerId) {
      addToast('Please select a customer for this reservation.', 'warning');
      return;
    }
    if (cart.length === 0) {
      addToast('Please select at least one medicine item to reserve.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: parseInt(selectedCustomerId, 10),
        items: cart.map((item) => ({
          medicine_id: item.medicine_id,
          quantity: item.requested_qty
        })),
        notes
      };

      const res = await reservationApi.create(payload);
      if (res.success) {
        setReceiptModal(res.data);
        // Refresh catalog medicines to update stock counts
        const medRes = await medicineApi.getAll();
        if (medRes.success) setMedicines(medRes.data);

        // Clear cart
        setCart([]);
        setNotes('');
        addToast(`Reservation #${res.data.reservation_id} created successfully! Stock reserved.`, 'success');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCustomerObj = customers.find((c) => String(c.customer_id) === String(selectedCustomerId));

  return (
    <div>
      <div className="reservation-layout">
        {/* Left Column: Customer & Medicine Selection Catalog */}
        <div>
          {/* Step 1: Customer Selection */}
          <div className="card-section">
            <div className="card-header">
              <h3 className="card-title">
                <span>1. Select Customer</span>
              </h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsQuickCustOpen(true)}
              >
                <IconPlus size={14} />
                <span>+ New Customer</span>
              </button>
            </div>
            <div className="card-body">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Customer Profile <span className="required">*</span></label>
                <select
                  className="form-control"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">-- Choose Registered Customer --</option>
                  {customers.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.name} ({c.phone}) {c.email ? `- ${c.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomerObj && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                  Customer: <strong>{selectedCustomerObj.name}</strong> | Phone: <strong>{selectedCustomerObj.phone}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Medicine Picker Catalog */}
          <div className="card-section">
            <div className="card-header">
              <h3 className="card-title">
                <span>2. Select Medicines to Reserve</span>
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Click 'Add' to place into reservation basket
              </span>
            </div>
            <div className="card-body">
              <div className="search-input-wrapper" style={{ marginBottom: 16 }}>
                <span className="search-icon"><IconSearch size={18} /></span>
                <input
                  type="text"
                  placeholder="Search available medicines by name or category..."
                  value={medicineSearch}
                  onChange={(e) => setMedicineSearch(e.target.value)}
                />
              </div>

              <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {filteredMedicines.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No matching medicines found in catalog.
                  </div>
                ) : (
                  filteredMedicines.map((med) => {
                    const isExpired = med.status === 'Expired';
                    const isOutOfStock = med.stock_quantity <= 0;
                    const inCart = cart.find((item) => item.medicine_id === med.medicine_id);

                    return (
                      <div
                        key={med.medicine_id}
                        className={`medicine-select-card ${inCart ? 'selected' : ''} ${isExpired || isOutOfStock ? 'disabled' : ''}`}
                      >
                        <div style={{ flex: 1, paddingRight: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{med.name}</span>
                            <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                              {med.category || 'General'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: 14 }}>
                            <span>Price: <strong style={{ color: 'var(--primary-dark)' }}>${parseFloat(med.unit_price).toFixed(2)}</strong></span>
                            <span>Stock: <strong style={{ color: isOutOfStock ? 'var(--danger)' : 'inherit' }}>{med.stock_quantity} units</strong></span>
                            <span>Exp: {med.expiry_date}</span>
                          </div>
                        </div>

                        <div>
                          {isExpired ? (
                            <Badge status="Expired" />
                          ) : isOutOfStock ? (
                            <Badge status="Out of Stock" />
                          ) : (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleAddToCart(med)}
                            >
                              <IconPlus size={14} />
                              <span>{inCart ? `Add More (${inCart.requested_qty})` : 'Add'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Reservation Basket & Calculation */}
        <div>
          <div className="order-summary-box">
            <h3 className="summary-title">Reservation Basket</h3>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
                <IconNewReservation size={36} style={{ color: 'var(--text-light)', marginBottom: 8 }} />
                <p style={{ fontWeight: 600 }}>Your basket is empty.</p>
                <p style={{ fontSize: '0.8rem' }}>Choose medicines from the catalog on the left.</p>
              </div>
            ) : (
              <div>
                <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: 16 }}>
                  {cart.map((item) => (
                    <div
                      key={item.medicine_id}
                      style={{
                        padding: '12px 0',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          ${item.unit_price.toFixed(2)} each (max: {item.stock_quantity})
                        </div>
                      </div>

                      {/* Stepper */}
                      <div className="qty-counter">
                        <button
                          className="qty-btn"
                          onClick={() => handleUpdateQty(item.medicine_id, item.requested_qty - 1)}
                        >
                          -
                        </button>
                        <input
                          type="text"
                          className="qty-input"
                          value={item.requested_qty}
                          readOnly
                        />
                        <button
                          className="qty-btn"
                          disabled={item.requested_qty >= item.stock_quantity}
                          onClick={() => handleUpdateQty(item.medicine_id, item.requested_qty + 1)}
                        >
                          +
                        </button>
                      </div>

                      <div style={{ minWidth: '60px', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem' }}>
                        ${item.subtotal.toFixed(2)}
                      </div>

                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}
                        onClick={() => handleRemoveItem(item.medicine_id)}
                        title="Remove item"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Optional Notes */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Reservation Notes / Instructions</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Call customer when ready, Pick up on Friday"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Subtotals & Total */}
                <div className="summary-item-row">
                  <span style={{ color: 'var(--text-muted)' }}>Total Unique Items:</span>
                  <span style={{ fontWeight: 600 }}>{cart.length}</span>
                </div>
                <div className="summary-item-row">
                  <span style={{ color: 'var(--text-muted)' }}>Total Medicine Units:</span>
                  <span style={{ fontWeight: 600 }}>{cart.reduce((sum, i) => sum + i.requested_qty, 0)} units</span>
                </div>
                <div className="summary-total-row">
                  <span>Grand Total:</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>

                <div style={{ marginTop: 20 }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px' }}
                    onClick={handleSubmitReservation}
                    disabled={submitting || cart.length === 0 || !selectedCustomerId}
                  >
                    <IconCheckCircle size={18} />
                    <span>{submitting ? 'Processing Transaction...' : 'Confirm & Reserve Stock'}</span>
                  </button>
                </div>

                <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Allocates stock inside an atomic MySQL transaction with <code>FOR UPDATE</code> row locking.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Customer Register Modal */}
      <Modal
        isOpen={isQuickCustOpen}
        onClose={() => setIsQuickCustOpen(false)}
        title="Quick Customer Registration"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsQuickCustOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleQuickRegister}>Save & Select</button>
          </>
        }
      >
        <form onSubmit={handleQuickRegister}>
          <div className="form-group">
            <label className="form-label">Customer Name <span className="required">*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Tariq Mehmood"
              value={quickCustForm.name}
              onChange={(e) => setQuickCustForm({ ...quickCustForm, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number <span className="required">*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 03451122334"
              value={quickCustForm.phone}
              onChange={(e) => setQuickCustForm({ ...quickCustForm, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email (Optional)</label>
            <input
              type="email"
              className="form-control"
              placeholder="customer@example.com"
              value={quickCustForm.email}
              onChange={(e) => setQuickCustForm({ ...quickCustForm, email: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Reservation Confirmation Receipt Modal */}
      <Modal
        isOpen={!!receiptModal}
        onClose={() => setReceiptModal(null)}
        title={`Reservation Confirmed: #${receiptModal?.reservation_id}`}
        maxWidth="650px"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setReceiptModal(null);
              }}
            >
              Create Another
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                const id = receiptModal?.reservation_id;
                setReceiptModal(null);
                setActivePage('reservations');
                if (onOpenViewReservation) onOpenViewReservation(id);
              }}
            >
              View In Reservations &rarr;
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-flex', padding: 12, background: 'var(--success-bg)', borderRadius: '50%', color: 'var(--success-text)', marginBottom: 8 }}>
            <IconCheckCircle size={32} />
          </div>
          <h4 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Reservation Successfully Booked</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Medicine items have been deducted from live stock and placed in Pending status.
          </p>
        </div>

        <div style={{ background: '#f8fafc', padding: 16, borderRadius: '8px', border: '1px solid var(--border)', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
            <div>Reservation ID: <strong>#{receiptModal?.reservation_id}</strong></div>
            <div>Status: <Badge status={receiptModal?.status} type="reservation" /></div>
            <div>Customer: <strong>{receiptModal?.customer_name}</strong></div>
            <div>Phone: <strong>{receiptModal?.customer_phone}</strong></div>
            <div>Date: <strong>{receiptModal?.reservation_date}</strong></div>
            <div>Total: <strong style={{ color: 'var(--primary-dark)', fontSize: '1rem' }}>${receiptModal?.total_amount}</strong></div>
          </div>
        </div>

        <h5 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 8 }}>Reserved Items:</h5>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {receiptModal?.items?.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{item.medicine_name}</td>
                  <td>{item.quantity} units</td>
                  <td>${parseFloat(item.unit_price).toFixed(2)}</td>
                  <td style={{ fontWeight: 700 }}>${parseFloat(item.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
