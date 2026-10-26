
import React from 'react';

import {
  IconDashboard,
  IconMedicine,
  IconCustomers,
  IconReservation,
  IconNewReservation,
  IconReports
} from './Icons';

export default function Sidebar({
  activePage,
  setActivePage,
  isDbConnected,
  mobileOpen,
  setMobileOpen,
  role = 'user',
  allowedPages
}) {
  // Complete navigation list
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <IconDashboard size={19} />
    },
    {
      id: 'medicines',
      label: 'Medicine Inventory',
      icon: <IconMedicine size={19} />
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: <IconCustomers size={19} />
    },
    {
      id: 'new-reservation',
      label: 'New Reservation',
      icon: <IconNewReservation size={19} />
    },
    {
      id: 'reservations',
      label: 'Manage Reservations',
      icon: <IconReservation size={19} />
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: <IconReports size={19} />
    }
  ];

  // Only two roles: Admin and User
  const defaultPermissions = {
    admin: [
      'dashboard',
      'medicines',
      'customers',
      'new-reservation',
      'reservations',
      'reports'
    ],
    user: [
      'dashboard',
      'medicines'
    ]
  };

  const rolePermissions =
    defaultPermissions[role] || defaultPermissions.user;

  // Never show pages outside the user's role permissions
  const visibleNavItems = navItems.filter((item) => {
    const allowedByRole = rolePermissions.includes(item.id);

    const allowedByApp =
      !Array.isArray(allowedPages) ||
      allowedPages.includes(item.id);

    return allowedByRole && allowedByApp;
  });

  function handleSelect(id) {
    if (!rolePermissions.includes(id)) {
      return;
    }

    if (
      Array.isArray(allowedPages) &&
      !allowedPages.includes(id)
    ) {
      return;
    }

    if (typeof setActivePage === 'function') {
      setActivePage(id);
    }

    if (typeof setMobileOpen === 'function') {
      setMobileOpen(false);
    }
  }

  return (
    <aside
      className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}
    >
      <div className="sidebar-header">
        <div className="brand-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect
              width="18"
              height="18"
              x="3"
              y="3"
              rx="4"
            />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
          </svg>
        </div>

        <div>
          <div className="brand-title">
            PharmaReserve
          </div>

          <div className="brand-subtitle">
            Pharmacy Management System
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {visibleNavItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-link ${
              activePage === item.id ? 'active' : ''
            }`}
            onClick={() => handleSelect(item.id)}
            style={{
              background: 'none',
              border: 'none',
              width: '100%',
              textAlign: 'left'
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#047857',
            marginBottom: 12
          }}
        >
          Account: {role === 'admin' ? 'Admin' : 'User'}
        </div>

        <div className="status-indicator">
          <span
            className={`status-dot ${
              isDbConnected ? '' : 'offline'
            }`}
          />

          <span>
            {isDbConnected
              ? 'PostgreSQL: Connected'
              : 'PostgreSQL: Disconnected'}
          </span>
        </div>

        <div
          style={{
            fontSize: '0.72rem',
            color: '#64748b'
          }}
        >
          DBMS University Project v1.0
        </div>
      </div>
    </aside>
  );
}
