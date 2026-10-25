import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import Medicines from './pages/Medicines';
import Customers from './pages/Customers';
import CreateReservation from './pages/CreateReservation';
import Reservations from './pages/Reservations';
import Reports from './pages/Reports';
import { healthApi } from './services/api';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [dbErrorDetails, setDbErrorDetails] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [selectedReservationId, setSelectedReservationId] = useState(null);

  // Toast Notification Dispatcher
  function addToast(message, type = 'info') {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }

  function dismissToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // Health and DB connection verification
  async function checkHealth() {
    setIsRefreshing(true);
    try {
      const res = await healthApi.check();
      if (res && res.database && res.database.connected) {
        setIsDbConnected(true);
        setDbErrorDetails(null);
      } else {
        setIsDbConnected(false);
        setDbErrorDetails(res?.database?.message || 'Database disconnected');
      }
    } catch (err) {
      setIsDbConnected(false);
      setDbErrorDetails(err.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    checkHealth();
    // Auto check health every 15 seconds
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  function handleOpenViewReservation(id) {
    setSelectedReservationId(id);
    setActivePage('reservations');
  }

  // Page titles and descriptions
  const pageMeta = {
    dashboard: {
      title: 'Pharmacy Dashboard',
      subtitle: 'Overview of medicines stock, pending customer reservations, and alerts'
    },
    medicines: {
      title: 'Medicine Inventory Management',
      subtitle: 'View, add, edit, and safely manage pharmaceutical stock and expiry dates'
    },
    customers: {
      title: 'Customer Directory',
      subtitle: 'Register customers, track phone numbers, and inspect reservation histories'
    },
    'new-reservation': {
      title: 'Create Medicine Reservation',
      subtitle: 'Select customer, verify live stock, and atomically reserve medicines'
    },
    reservations: {
      title: 'Reservation Management & Fulfillment',
      subtitle: 'Track pending reservations, fulfill completed orders, or cancel and restore stock'
    },
    reports: {
      title: 'Reports & Analytics',
      subtitle: 'Comprehensive inventory valuation, low stock warnings, expiry, and sales breakdown'
    }
  };

  const currentMeta = pageMeta[activePage] || { title: 'Pharmacy System', subtitle: '' };

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isDbConnected={isDbConnected}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Header
          pageTitle={currentMeta.title}
          pageSubtitle={currentMeta.subtitle}
          onRefresh={checkHealth}
          isRefreshing={isRefreshing}
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
        />

        {/* Database Disconnect Warning Banner */}
        {!isDbConnected && (
          <div style={{
            background: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px 32px',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <strong>MySQL Database Connection Alert:</strong> Backend cannot communicate with MySQL (<code>{dbErrorDetails || 'Access Denied / Not Running'}</code>).
              Please ensure your MySQL service is running and verify <code>DB_PASSWORD</code> in <code>backend/.env</code>.
            </div>
            <button className="btn btn-secondary btn-sm" onClick={checkHealth}>
              Retry Connection
            </button>
          </div>
        )}

        <main className="page-container">
          {activePage === 'dashboard' && (
            <Dashboard
              setActivePage={setActivePage}
              onOpenViewReservation={handleOpenViewReservation}
              addToast={addToast}
            />
          )}

          {activePage === 'medicines' && (
            <Medicines addToast={addToast} />
          )}

          {activePage === 'customers' && (
            <Customers
              addToast={addToast}
              onOpenViewReservation={handleOpenViewReservation}
            />
          )}

          {activePage === 'new-reservation' && (
            <CreateReservation
              addToast={addToast}
              setActivePage={setActivePage}
              onOpenViewReservation={handleOpenViewReservation}
            />
          )}

          {activePage === 'reservations' && (
            <Reservations
              addToast={addToast}
              selectedReservationId={selectedReservationId}
              onClearSelectedId={() => setSelectedReservationId(null)}
            />
          )}

          {activePage === 'reports' && (
            <Reports addToast={addToast} />
          )}
        </main>
      </div>
    </div>
  );
}
