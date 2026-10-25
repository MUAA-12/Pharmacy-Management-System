import React, { useState, useEffect } from 'react';
import { reportApi } from '../services/api';
import Badge from '../components/Badge';
import {
  IconReports,
  IconAlertTriangle,
  IconMedicine,
  IconCheckCircle
} from '../components/Icons';

export default function Reports({ addToast }) {
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading] = useState(false);

  // Report States
  const [inventoryData, setInventoryData] = useState(null);
  const [lowStockData, setLowStockData] = useState([]);
  const [expiryData, setExpiryData] = useState([]);
  const [salesByDate, setSalesByDate] = useState([]);
  const [topMedicines, setTopMedicines] = useState([]);

  async function loadActiveReport() {
    setLoading(true);
    try {
      if (activeTab === 'inventory') {
        const res = await reportApi.getInventory();
        if (res.success) setInventoryData(res.data);
      } else if (activeTab === 'low_stock') {
        const res = await reportApi.getLowStock(10);
        if (res.success) setLowStockData(res.data);
      } else if (activeTab === 'expiry') {
        const res = await reportApi.getExpiry(90);
        if (res.success) setExpiryData(res.data);
      } else if (activeTab === 'sales') {
        const res = await reportApi.getSalesByDate();
        if (res.success) setSalesByDate(res.data);
      } else if (activeTab === 'top_medicines') {
        const res = await reportApi.getTopMedicines();
        if (res.success) setTopMedicines(res.data);
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActiveReport();
  }, [activeTab]);

  return (
    <div>
      {/* Report Category Tabs */}
      <div className="tabs-header">
        {[
          { id: 'inventory', label: 'Inventory Valuation' },
          { id: 'low_stock', label: 'Low Stock Alerts' },
          { id: 'expiry', label: 'Expiry Management' },
          { id: 'top_medicines', label: 'Top Reserved Medicines' },
          { id: 'sales', label: 'Sales Revenue by Date' }
        ].map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Inventory Valuation */}
      {activeTab === 'inventory' && (
        <div>
          {inventoryData?.summary && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-label">Total Catalog Items</div>
                  <div className="stat-value">{inventoryData.summary.total_items}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-label">Total Stock Units</div>
                  <div className="stat-value">{inventoryData.summary.total_units}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-label">Total Inventory Valuation</div>
                  <div className="stat-value" style={{ color: 'var(--primary-dark)' }}>
                    ${inventoryData.summary.total_valuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-label">Low Stock Items</div>
                  <div className="stat-value" style={{ color: 'var(--warning-text)' }}>
                    {inventoryData.summary.low_stock_items}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card-section">
            <div className="card-header">
              <h3 className="card-title">
                <IconMedicine size={19} />
                <span>Full Inventory Valuation Ledger</span>
              </h3>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Category</th>
                    <th>Unit Price</th>
                    <th>In Stock</th>
                    <th>Total Value</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>Generating report...</td></tr>
                  ) : (
                    inventoryData?.items?.map((item) => (
                      <tr key={item.medicine_id}>
                        <td style={{ fontWeight: 700 }}>{item.name}</td>
                        <td>{item.category}</td>
                        <td>${parseFloat(item.unit_price).toFixed(2)}</td>
                        <td style={{ fontWeight: 800 }}>{item.stock_quantity} units</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>
                          ${parseFloat(item.total_value).toFixed(2)}
                        </td>
                        <td>{item.expiry_date}</td>
                        <td><Badge status={item.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Low Stock Alerts */}
      {activeTab === 'low_stock' && (
        <div className="card-section">
          <div className="card-header">
            <h3 className="card-title">
              <IconAlertTriangle size={19} style={{ color: 'var(--warning-text)' }} />
              <span>Critical Low Stock Report (Threshold &le; 10 Units)</span>
            </h3>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Available Stock</th>
                  <th>Unit Price</th>
                  <th>Expiry Date</th>
                  <th>Urgency Assessment</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>Loading...</td></tr>
                ) : lowStockData.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No medicines currently below low stock threshold.</td></tr>
                ) : (
                  lowStockData.map((item) => (
                    <tr key={item.medicine_id}>
                      <td style={{ fontWeight: 700 }}>{item.name}</td>
                      <td>{item.category}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: item.stock_quantity === 0 ? 'var(--danger)' : 'var(--warning-text)' }}>
                          {item.stock_quantity} units
                        </span>
                      </td>
                      <td>${parseFloat(item.unit_price).toFixed(2)}</td>
                      <td>{item.expiry_date}</td>
                      <td>
                        <span className={`badge ${item.stock_quantity === 0 ? 'badge-out-of-stock' : 'badge-low-stock'}`}>
                          {item.urgency}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Expiry Management */}
      {activeTab === 'expiry' && (
        <div className="card-section">
          <div className="card-header">
            <h3 className="card-title">
              <IconAlertTriangle size={19} style={{ color: 'var(--danger)' }} />
              <span>Expiry Tracking Report (Expired or Expiring within 90 Days)</span>
            </h3>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Stock on Hand</th>
                  <th>Expiry Date</th>
                  <th>Days Remaining</th>
                  <th>Urgency Level</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>Loading...</td></tr>
                ) : expiryData.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No medicines expired or expiring in the next 90 days.</td></tr>
                ) : (
                  expiryData.map((item) => (
                    <tr key={item.medicine_id}>
                      <td style={{ fontWeight: 700 }}>{item.name}</td>
                      <td>{item.category}</td>
                      <td>{item.stock_quantity} units</td>
                      <td>{item.expiry_date}</td>
                      <td>
                        {item.days_remaining < 0 ? (
                          <strong style={{ color: 'var(--danger)' }}>Expired {Math.abs(item.days_remaining)} days ago</strong>
                        ) : (
                          <strong style={{ color: 'var(--warning-text)' }}>{item.days_remaining} days left</strong>
                        )}
                      </td>
                      <td>
                        <Badge status={item.days_remaining < 0 ? 'Expired' : 'Near Expiry'} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Most Reserved Medicines */}
      {activeTab === 'top_medicines' && (
        <div className="card-section">
          <div className="card-header">
            <h3 className="card-title">
              <IconReports size={19} />
              <span>Top Most Reserved Medicines Leaderboard</span>
            </h3>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Total Units Reserved</th>
                  <th>Reservation Orders</th>
                  <th>Total Revenue Generated</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>Loading...</td></tr>
                ) : topMedicines.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No reservation data recorded yet.</td></tr>
                ) : (
                  topMedicines.map((item, idx) => (
                    <tr key={item.medicine_id}>
                      <td style={{ fontWeight: 800, color: 'var(--primary)' }}>#{idx + 1}</td>
                      <td style={{ fontWeight: 700 }}>{item.name}</td>
                      <td>{item.category}</td>
                      <td>{item.current_stock} units</td>
                      <td style={{ fontWeight: 800 }}>{item.total_reserved_quantity} units</td>
                      <td>{item.total_orders} orders</td>
                      <td style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>
                        ${parseFloat(item.total_reservation_value).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Sales Revenue by Date */}
      {activeTab === 'sales' && (
        <div className="card-section">
          <div className="card-header">
            <h3 className="card-title">
              <IconCheckCircle size={19} style={{ color: 'var(--success)' }} />
              <span>Completed Reservations Revenue Breakdown by Date</span>
            </h3>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Completed Reservations</th>
                  <th>Total Revenue Collected</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '32px' }}>Loading...</td></tr>
                ) : salesByDate.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No completed reservations recorded yet.</td></tr>
                ) : (
                  salesByDate.map((item) => (
                    <tr key={item.date}>
                      <td style={{ fontWeight: 700 }}>{item.date}</td>
                      <td>{item.completed_reservations_count} reservations fulfilled</td>
                      <td style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '1rem' }}>
                        ${parseFloat(item.total_revenue).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
