import React, { useState, useEffect } from 'react';
import { reportApi } from '../services/api';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import {
  IconMedicine,
  IconCustomers,
  IconReservation,
  IconAlertTriangle,
  IconPlus,
  IconNewReservation,
  IconReports,
  IconEye
} from '../components/Icons';

export default function Dashboard({ setActivePage, onOpenViewReservation, addToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await reportApi.getDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          Loading pharmacy metrics...
        </div>
      </div>
    );
  }

  const overview = data?.overview || {};
  const recentReservations = data?.recent_reservations || [];
  const criticalStock = data?.critical_stock || [];

  return (
    <div>
      {/* Quick Actions Bar */}
      <div className="quick-actions-bar">
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Quick Operations
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Frequent tasks for front-desk pharmacy management
          </p>
        </div>
        <div className="action-buttons-group">
          <button className="btn btn-primary" onClick={() => setActivePage('new-reservation')}>
            <IconNewReservation size={18} />
            <span>New Reservation</span>
          </button>
          <button className="btn btn-secondary" onClick={() => setActivePage('medicines')}>
            <IconPlus size={18} />
            <span>Add Medicine</span>
          </button>
          <button className="btn btn-secondary" onClick={() => setActivePage('customers')}>
            <IconPlus size={18} />
            <span>Register Customer</span>
          </button>
          <button className="btn btn-secondary" onClick={() => setActivePage('reports')}>
            <IconReports size={18} />
            <span>View Reports</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="stats-grid">
        <StatCard
          label="Total Medicines"
          value={overview.total_medicines || 0}
          meta={`Inventory Value: $${(overview.total_inventory_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<IconMedicine size={24} />}
          color="teal"
          onClick={() => setActivePage('medicines')}
        />
        <StatCard
          label="Registered Customers"
          value={overview.total_customers || 0}
          meta="Active customer profiles"
          icon={<IconCustomers size={24} />}
          color="blue"
          onClick={() => setActivePage('customers')}
        />
        <StatCard
          label="Pending Reservations"
          value={overview.pending_reservations || 0}
          meta="Awaiting pickup & fulfillment"
          icon={<IconReservation size={24} />}
          color="purple"
          onClick={() => setActivePage('reservations')}
        />
        <StatCard
          label="Low-Stock Alerts"
          value={overview.low_stock_count || 0}
          meta={`${overview.out_of_stock_count || 0} items completely out of stock`}
          icon={<IconAlertTriangle size={24} />}
          color="amber"
          onClick={() => setActivePage('medicines')}
        />
        <StatCard
          label="Expired Medicines"
          value={overview.expired_count || 0}
          meta="Cannot be reserved (safe lock)"
          icon={<IconAlertTriangle size={24} />}
          color="red"
          onClick={() => setActivePage('reports')}
        />
      </div>

      {/* Split Grid: Recent Reservations & Low Stock Notice */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
        {/* Recent Reservations */}
        <div className="card-section" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3 className="card-title">
              <IconReservation size={18} />
              <span>Recent Reservations</span>
            </h3>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setActivePage('reservations')}
            >
              View All &rarr;
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentReservations.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No recent reservations recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentReservations.map((res) => (
                    <tr key={res.reservation_id}>
                      <td style={{ fontWeight: 700 }}>#{res.reservation_id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{res.customer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.customer_phone}</div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{res.reservation_date}</td>
                      <td>{res.items_count} items</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>${res.total_amount}</td>
                      <td>
                        <Badge status={res.status} type="reservation" />
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenViewReservation(res.reservation_id)}
                          title="View reservation details"
                        >
                          <IconEye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card-section" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3 className="card-title">
              <IconAlertTriangle size={18} style={{ color: 'var(--warning-text)' }} />
              <span>Low-Stock Inventory</span>
            </h3>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setActivePage('medicines')}
            >
              Manage &rarr;
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {criticalStock.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      All medicines are well stocked.
                    </td>
                  </tr>
                ) : (
                  criticalStock.map((m) => (
                    <tr key={m.medicine_id}>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.category}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: m.stock_quantity === 0 ? 'var(--danger)' : 'var(--warning-text)' }}>
                          {m.stock_quantity} units
                        </span>
                      </td>
                      <td>
                        <Badge status={m.stock_quantity === 0 ? 'Out of Stock' : 'Low Stock'} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
