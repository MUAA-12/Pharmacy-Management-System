
import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import { supabase } from './services/supabaseClient';

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

const PAGE_ACCESS = {
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

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] =
    useState(false);

  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [activePage, setActivePage] = useState('dashboard');
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [dbErrorDetails, setDbErrorDetails] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [selectedReservationId, setSelectedReservationId] =
    useState(null);

  function addToast(message, type = 'info') {
    const id = Date.now() + Math.random();

    setToasts((prev) => [
      ...prev,
      { id, message, type }
    ]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.filter((t) => t.id !== id)
      );
    }, 4500);
  }

  function dismissToast(id) {
    setToasts((prev) =>
      prev.filter((t) => t.id !== id)
    );
  }

  // Authentication and password recovery
  useEffect(() => {
    let active = true;

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!active) return;

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setRole(null);
          setIsPasswordRecovery(false);
        } else {
          setSession(newSession);
        }

        setAuthLoading(false);
      }
    );

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          console.error('Authentication error:', error);
        }

        setSession(data?.session ?? null);
        setAuthLoading(false);
      })
      .catch((error) => {
        if (!active) return;

        console.error('Authentication error:', error);
        setSession(null);
        setAuthLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load role from Supabase
  useEffect(() => {
    let active = true;

    if (!session?.user?.id || isPasswordRecovery) {
      setRole(null);
      setRoleLoading(false);
      return;
    }

    async function loadRole() {
      setRoleLoading(true);
      setRole(null);

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (active) {
          setRole(data?.role === 'admin' ? 'admin' : 'user');
        }
      } catch (error) {
        console.error('Unable to load user role:', error);

        if (active) {
          setRole('user');
        }
      } finally {
        if (active) {
          setRoleLoading(false);
        }
      }
    }

    loadRole();

    return () => {
      active = false;
    };
  }, [session?.user?.id, isPasswordRecovery]);

  const allowedPages = PAGE_ACCESS[role] || PAGE_ACCESS.user;

  function navigateToPage(page) {
    if (!allowedPages.includes(page)) {
      addToast('Access denied for this page.', 'error');
      return;
    }

    setActivePage(page);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (role && !allowedPages.includes(activePage)) {
      setActivePage('dashboard');
      setSelectedReservationId(null);
    }
  }, [role, activePage]);

  async function checkHealth() {
    setIsRefreshing(true);

    try {
      const res = await healthApi.check();

      if (res?.database?.connected) {
        setIsDbConnected(true);
        setDbErrorDetails(null);
      } else {
        setIsDbConnected(false);
        setDbErrorDetails(
          res?.database?.message || 'Database disconnected'
        );
      }
    } catch (error) {
      setIsDbConnected(false);
      setDbErrorDetails(error.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (!session || isPasswordRecovery) return;

    checkHealth();

    const interval = setInterval(checkHealth, 15000);

    return () => clearInterval(interval);
  }, [session?.user?.id, isPasswordRecovery]);

  function handleOpenViewReservation(id) {
    if (role !== 'admin') {
      addToast('Reservation details are restricted.', 'error');
      return;
    }

    setSelectedReservationId(id);
    setActivePage('reservations');
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      addToast(error.message, 'error');
      return;
    }

    setSession(null);
    setRole(null);
    setIsPasswordRecovery(false);
    setActivePage('dashboard');
    setSelectedReservationId(null);
    setMobileOpen(false);
    setIsDbConnected(false);
  }

  const pageMeta = {
    dashboard: {
      title: 'Pharmacy Dashboard',
      subtitle: 'Medicine availability and pharmacy overview'
    },
    medicines: {
      title: 'Medicine Inventory',
      subtitle: 'Browse medicines and check availability'
    },
    customers: {
      title: 'Customer Directory',
      subtitle: 'Manage customer records and histories'
    },
    'new-reservation': {
      title: 'Create Medicine Reservation',
      subtitle: 'Create and manage medicine reservations'
    },
    reservations: {
      title: 'Reservation Management',
      subtitle: 'Track and manage pharmacy reservations'
    },
    reports: {
      title: 'Reports & Analytics',
      subtitle: 'Inventory and financial reports'
    }
  };

  const currentMeta = pageMeta[activePage] || {
    title: 'Pharmacy System',
    subtitle: ''
  };

  const loadingScreen = (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      color: '#047857'
    }}>
      Loading Pharmacy Management System...
    </div>
  );

  if (authLoading) {
    return loadingScreen;
  }

  if (isPasswordRecovery) {
    return (
      <Login
        onLogin={setSession}
        isRecoveryMode={true}
        onRecoveryComplete={() => {
          setIsPasswordRecovery(false);
          setSession(null);
          setRole(null);
        }}
      />
    );
  }

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  if (roleLoading || role === null) {
    return loadingScreen;
  }

  return (
    <div className="app-container">
      <Toast
        toasts={toasts}
        onDismiss={dismissToast}
      />

      <Sidebar
        activePage={activePage}
        setActivePage={navigateToPage}
        isDbConnected={isDbConnected}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        role={role}
        allowedPages={allowedPages}
      />

      <div className="main-wrapper">
        <Header
          pageTitle={currentMeta.title}
          pageSubtitle={currentMeta.subtitle}
          onRefresh={checkHealth}
          isRefreshing={isRefreshing}
          onToggleMobile={() =>
            setMobileOpen(!mobileOpen)
          }
        />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 24px'
        }}>
          <span style={{
            color: '#047857',
            fontWeight: 600
          }}>
            Logged in as: {role.toUpperCase()}
          </span>

          <button
            onClick={handleLogout}
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '9px 18px',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>

        {!isDbConnected && (
          <div style={{
            background: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px 32px'
          }}>
            <strong>Database Connection Alert: </strong>
            {dbErrorDetails || 'Connection unavailable'}

            <button
              className="btn btn-secondary btn-sm"
              onClick={checkHealth}
              style={{ marginLeft: 12 }}
            >
              Retry Connection
            </button>
          </div>
        )}

        <main className="page-container">
          {activePage === 'dashboard' && (
            <Dashboard
              setActivePage={navigateToPage}
              onOpenViewReservation={
                handleOpenViewReservation
              }
              addToast={addToast}
              role={role}
            />
          )}

          {activePage === 'medicines' && (
            <Medicines
              addToast={addToast}
              role={role}
            />
          )}

          {activePage === 'customers' &&
            role === 'admin' && (
              <Customers
                addToast={addToast}
                onOpenViewReservation={
                  handleOpenViewReservation
                }
              />
            )}

          {activePage === 'new-reservation' &&
            role === 'admin' && (
              <CreateReservation
                addToast={addToast}
                setActivePage={navigateToPage}
                onOpenViewReservation={
                  handleOpenViewReservation
                }
              />
            )}

          {activePage === 'reservations' &&
            role === 'admin' && (
              <Reservations
                addToast={addToast}
                selectedReservationId={
                  selectedReservationId
                }
                onClearSelectedId={() =>
                  setSelectedReservationId(null)
                }
              />
            )}

          {activePage === 'reports' &&
            role === 'admin' && (
              <Reports addToast={addToast} />
            )}
        </main>
      </div>
    </div>
  );
}
