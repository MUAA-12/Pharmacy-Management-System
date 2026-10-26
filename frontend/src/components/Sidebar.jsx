import React from 'react';
import {
  IconDashboard,
  IconMedicine,
  IconCustomers,
  IconReservation,
  IconNewReservation,
  IconReports
} from './Icons';

export default function Sidebar({ activePage, setActivePage, isDbConnected, mobileOpen, setMobileOpen }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <IconDashboard size={19} /> },
    { id: 'medicines', label: 'Medicine Inventory', icon: <IconMedicine size={19} /> },
    { id: 'customers', label: 'Customers', icon: <IconCustomers size={19} /> },
    { id: 'new-reservation', label: 'New Reservation', icon: <IconNewReservation size={19} /> },
    { id: 'reservations', label: 'Manage Reservations', icon: <IconReservation size={19} /> },
    { id: 'reports', label: 'Reports & Analytics', icon: <IconReports size={19} /> }
  ];

  function handleSelect(id) {
    setActivePage(id);
    if (setMobileOpen) setMobileOpen(false);
  }

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="4"/>
            <path d="M12 8v8"/>
            <path d="M8 12h8"/>
          </svg>
        </div>
        <div>
          <div className="brand-title">PharmaReserve</div>
          <div className="brand-subtitle">Availability & Reservation</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-link ${activePage === item.id ? 'active' : ''}`}
            onClick={() => handleSelect(item.id)}
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator">
          <span className={`status-dot ${isDbConnected ? '' : 'offline'}`}></span>
          <span>{isDbConnected ? 'PostgreSQL: Connected' : 'PostgreSQL: Disconnected'}</span>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
          DBMS University Project v1.0
        </div>
      </div>
    </aside>
  );
}
