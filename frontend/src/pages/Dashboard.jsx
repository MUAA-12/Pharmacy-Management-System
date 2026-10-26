
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

export default function Dashboard({
  setActivePage,
  onOpenViewReservation,
  addToast,
  role = 'user'
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';
  const isUser = role === 'user';

  const canViewOperationalReports = isAdmin || isStaff;

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      // Normal users must never request the private
      // dashboard reporting endpoint.
      if (!canViewOperationalReports) {
        setData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setData(null);

      try {
        const res = await reportApi.getDashboard();

        if (!active) return;

        if (res?.success) {
          setData(res.data);
        } else {
          addToast(
            'Unable to load dashboard information.',
            'error'
          );
        }
      } catch (err) {
        if (active) {
          addToast(
            err.message || 'Dashboard loading failed.',
            'error'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [role]);

  // Public-facing dashboard for normal users.
  // No customer or reservation report API is called.
  if (isUser) {
    return (
      <div>
        <div className="quick-actions-bar">
          <div>
            <h2 style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              color: 'var(--text-main)'
            }}>
              Welcome to Pharmacy Management
            </h2>

            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)'
            }}>
              Search medicines and check their availability.
            </p>
          </div>

          <div className="action-buttons-group">
            <button
              className="btn btn-primary"
              onClick={() => setActivePage('medicines')}
            >
              <IconMedicine size={18} />
              <span>Browse Medicines</span>
            </button>
          </div>
        </div>

        <div className="card-section">
          <div className="card-header">
            <h3 className="card-title">
              <IconMedicine size={18} />
              <span>Medicine Availability</span>
            </h3>
          </div>

          <div style={{ padding: 24 }}>
            <p style={{
              color: 'var(--text-muted)',
              lineHeight: 1.7
            }}>
              You can browse available medicines and search
              the pharmacy inventory.
            </p>

            <button
              className="btn btn-primary"
              onClick={() => setActivePage('medicines')}
            >
              View Available Medicines
            </button>
          </div>
        </div>

        <div className="card-section">
          <div style={{ padding: 24 }}>
            <h3 style={{
              marginTop: 0,
              color: 'var(--text-main)'
            }}>
              Your Account
            </h3>

            <p style={{
              color: 'var(--text-muted)',
              lineHeight: 1.7
            }}>
              You are logged in as a registered pharmacy user.
              Customer records, other people's reservations,
              administrative tools, and financial reports
              are restricted.
            </p>

            <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}>
              Personal reservation features will become
              available after secure account-to-reservation
              linking is implemented.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="empty-state">
        <div style={{
          fontSize: '1.2rem',
          fontWeight: 600,
          color: 'var(--text-muted)'
        }}>
          Loading pharmacy metrics...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="empty-state">
        <div style={{
          color: 'var(--text-muted)',
          padding: 24
        }}>
          Dashboard data is currently unavailable.
        </div>
      </div>
    );
  }

  const overview = data?.overview || {};
  const recentReservations =
    data?.recent_reservations || [];
  const criticalStock = data?.critical_stock || [];

  return (
    <div>
      {/* Quick Actions */}
      <div className="quick-actions-bar">
        <div>
          <h2 style={{
            fontSize: '1.1rem',
            fontWeight: 800,
            color: 'var(--text-main)'
          }}>
            {isAdmin
              ? 'Admin Operations'
              : 'Staff Operations'}
          </h2>

          <p style={{
            fontSize: '0.82rem',
            color: 'var(--text-muted)'
          }}>
            {isAdmin
              ? 'Manage pharmacy inventory, customers and reservations'
              : 'Manage daily pharmacy operations'}
          </p>
        </div>

        <div className="action-buttons-group">
          <button
            className="btn btn-primary"
            onClick={() =>
              setActivePage('new-reservation')
            }
          >
            <IconNewReservation size={18} />
            <span>New Reservation</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() =>
              setActivePage('medicines')
            }
          >
            <IconMedicine size={18} />
            <span>View Medicines</span>
          </button>

          {isAdmin && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() =>
                  setActivePage('customers')
                }
              >
                <IconPlus size={18} />
                <span>Register Customer</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={() =>
                  setActivePage('reports')
                }
              >
                <IconReports size={18} />
                <span>View Reports</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dashboard Statistics */}
      <div className="stats-grid">
        <StatCard
          label="Total Medicines"
          value={overview.total_medicines || 0}
          meta="Medicines in pharmacy inventory"
          icon={<IconMedicine size={24} />}
          color="teal"
          onClick={() =>
            setActivePage('medicines')
          }
        />

        {isAdmin && (
          <StatCard
            label="Registered Customers"
            value={overview.total_customers || 0}
            meta="Customer profiles"
            icon={<IconCustomers size={24} />}
            color="blue"
            onClick={() =>
              setActivePage('customers')
            }
          />
        )}

        <StatCard
          label="Pending Reservations"
          value={overview.pending_reservations || 0}
          meta="Awaiting pickup and fulfillment"
          icon={<IconReservation size={24} />}
          color="purple"
          onClick={() =>
            setActivePage('reservations')
          }
        />

        <StatCard
          label="Low-Stock Alerts"
          value={overview.low_stock_count || 0}
          meta={`${
            overview.out_of_stock_count || 0
          } items out of stock`}
          icon={<IconAlertTriangle size={24} />}
          color="amber"
          onClick={() =>
            setActivePage('medicines')
          }
        />

        {isAdmin && (
          <StatCard
            label="Expired Medicines"
            value={overview.expired_count || 0}
            meta="Medicines requiring attention"
            icon={<IconAlertTriangle size={24} />}
            color="red"
            onClick={() =>
              setActivePage('reports')
            }
          />
        )}
      </div>

      {/* Operational Information */}
      <div style={{
        display: 'grid',
        gridTemplateColumns:
          'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24
      }}>
        {/* Reservations: Admin and Staff */}
        <div
          className="card-section"
          style={{ marginBottom: 0 }}
        >
          <div className="card-header">
            <h3 className="card-title">
              <IconReservation size={18} />
              <span>Recent Reservations</span>
            </h3>

            <button
              className="btn btn-ghost btn-sm"
              onClick={() =>
                setActivePage('reservations')
              }
            >
              View All
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  {isAdmin && <th>Customer</th>}
                  <th>Date</th>
                  <th>Items</th>
                  {isAdmin && <th>Total</th>}
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {recentReservations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 7 : 5}
                      style={{
                        textAlign: 'center',
                        padding: 24,
                        color: 'var(--text-muted)'
                      }}
                    >
                      No recent reservations.
                    </td>
                  </tr>
                ) : (
                  recentReservations.map((res) => (
                    <tr key={res.reservation_id}>
                      <td>
                        #{res.reservation_id}
                      </td>

                      {isAdmin && (
                        <td>
                          <div style={{
                            fontWeight: 600
                          }}>
                            {res.customer_name}
                          </div>

                          <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)'
                          }}>
                            {res.customer_phone}
                          </div>
                        </td>
                      )}

                      <td>{res.reservation_date}</td>
                      <td>
                        {res.items_count} items
                      </td>

                      {isAdmin && (
                        <td>
                          ${res.total_amount}
                        </td>
                      )}

                      <td>
                        <Badge
                          status={res.status}
                          type="reservation"
                        />
                      </td>

                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() =>
                            onOpenViewReservation(
                              res.reservation_id
                            )
                          }
                          title="View reservation"
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

        {/* Stock Alerts */}
        <div
          className="card-section"
          style={{ marginBottom: 0 }}
        >
          <div className="card-header">
            <h3 className="card-title">
              <IconAlertTriangle size={18} />
              <span>Low-Stock Inventory</span>
            </h3>

            <button
              className="btn btn-ghost btn-sm"
              onClick={() =>
                setActivePage('medicines')
              }
            >
              View Medicines
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
                    <td
                      colSpan={4}
                      style={{
                        textAlign: 'center',
                        padding: 24,
                        color: 'var(--text-muted)'
                      }}
                    >
                      No low-stock medicines.
                    </td>
                  </tr>
                ) : (
                  criticalStock.map((m) => (
                    <tr key={m.medicine_id}>
                      <td>{m.name}</td>
                      <td>{m.category}</td>
                      <td>
                        {m.stock_quantity} units
                      </td>
                      <td>
                        <Badge
                          status={
                            m.stock_quantity === 0
                              ? 'Out of Stock'
                              : 'Low Stock'
                          }
                        />
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
