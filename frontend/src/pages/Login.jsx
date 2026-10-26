
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const initialForm = {
  fullName: '',
  username: '',
  email: '',
  dateOfBirth: '',
  password: '',
  confirmPassword: ''
};

export default function Login({
  onLogin,
  isRecoveryMode = false,
  onRecoveryComplete
}) {
  const [mode, setMode] = useState(
    isRecoveryMode ? 'reset' : 'login'
  );
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isRecoveryMode) {
      setMode('reset');
    }
  }, [isRecoveryMode]);

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        setError('');
        setMessage('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value
    }));
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setMessage('');
    setForm((previous) => ({
      ...previous,
      password: '',
      confirmPassword: ''
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    const email = form.email.trim().toLowerCase();

    if (
      (mode === 'signup' || mode === 'reset') &&
      form.password.length < 8
    ) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (
      (mode === 'signup' || mode === 'reset') &&
      form.password !== form.confirmPassword
    ) {
      setError('Passwords do not match.');
      return;
    }

    if (mode === 'signup') {
      const username = form.username.trim().toLowerCase();

      if (!/^[a-z0-9_]{3,25}$/.test(username)) {
        setError(
          'Username must contain 3-25 letters, numbers or underscores.'
        );
        return;
      }

      if (
        !form.fullName.trim() ||
        !form.dateOfBirth ||
        form.dateOfBirth > new Date().toISOString().slice(0, 10)
      ) {
        setError('Please enter valid registration details.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error: loginError } =
          await supabase.auth.signInWithPassword({
            email,
            password: form.password
          });

        if (loginError) throw loginError;

        if (data.session) {
          onLogin(data.session);
        }
      }

      if (mode === 'signup') {
        const { data, error: signupError } =
          await supabase.auth.signUp({
            email,
            password: form.password,
            options: {
              data: {
                full_name: form.fullName.trim(),
                username: form.username.trim().toLowerCase(),
                date_of_birth: form.dateOfBirth
              },
              emailRedirectTo: window.location.origin + '/'
            }
          });

        if (signupError) throw signupError;

        if (data.session) {
          onLogin(data.session);
        } else {
          changeMode('login');
          setMessage(
            'Registration submitted. Check your email for confirmation, then log in.'
          );
        }
      }

      if (mode === 'forgot') {
        const { error: forgotError } =
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/'
          });

        if (forgotError) throw forgotError;

        setMessage(
          'If your email is registered, a password reset link will be sent.'
        );
      }

      if (mode === 'reset') {
        const { error: resetError } =
          await supabase.auth.updateUser({
            password: form.password
          });

        if (resetError) throw resetError;

        const { error: signOutError } =
          await supabase.auth.signOut();

        if (signOutError) throw signOutError;

        setForm(initialForm);
        changeMode('login');

        if (onRecoveryComplete) {
          onRecoveryComplete();
        }

        setMessage(
          'Password updated successfully. Log in with your new password.'
        );
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const titles = {
    login: 'Login to Your Account',
    signup: 'Create Your Account',
    forgot: 'Forgot Password',
    reset: 'Reset Your Password'
  };

  const submitLabels = {
    login: 'Login',
    signup: 'Create Account',
    forgot: 'Send Reset Link',
    reset: 'Update Password'
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{
          color: '#047857',
          textAlign: 'center',
          marginBottom: 8
        }}>
          Pharmacy Management
        </h1>

        <p style={{
          textAlign: 'center',
          color: '#64748b',
          marginBottom: 24
        }}>
          {titles[mode]}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <label>Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) =>
                  updateField('fullName', e.target.value)
                }
                required
                maxLength={100}
                placeholder="Enter your full name"
                autoComplete="name"
                style={inputStyle}
              />

              <label>Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) =>
                  updateField('username', e.target.value)
                }
                required
                minLength={3}
                maxLength={25}
                placeholder="e.g. muaaz123"
                autoComplete="username"
                style={inputStyle}
              />

              <label>Date of Birth</label>
              <input
                type="date"
                value={form.dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) =>
                  updateField('dateOfBirth', e.target.value)
                }
                required
                style={inputStyle}
              />
            </>
          )}

          {mode !== 'reset' && (
            <>
              <label>Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  updateField('email', e.target.value)
                }
                required
                placeholder="Enter your email"
                autoComplete="email"
                style={inputStyle}
              />
            </>
          )}

          {mode !== 'forgot' && (
            <>
              <label>
                {mode === 'reset'
                  ? 'New Password'
                  : mode === 'signup'
                    ? 'Create Password'
                    : 'Password'}
              </label>

              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  updateField('password', e.target.value)
                }
                required
                minLength={mode === 'login' ? 1 : 8}
                placeholder="Enter password"
                autoComplete={
                  mode === 'login'
                    ? 'current-password'
                    : 'new-password'
                }
                style={inputStyle}
              />
            </>
          )}

          {(mode === 'signup' || mode === 'reset') && (
            <>
              <label>Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  updateField('confirmPassword', e.target.value)
                }
                required
                minLength={8}
                placeholder="Confirm password"
                autoComplete="new-password"
                style={inputStyle}
              />
            </>
          )}

          {error && (
            <p style={{ color: '#dc2626', fontSize: 14 }}>
              {error}
            </p>
          )}

          {message && (
            <p style={{ color: '#047857', fontSize: 14 }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={primaryButtonStyle}
          >
            {loading ? 'Please wait...' : submitLabels[mode]}
          </button>
        </form>

        {mode === 'login' && (
          <>
            <button
              type="button"
              onClick={() => changeMode('forgot')}
              style={linkStyle}
            >
              Forgot Password?
            </button>

            <p style={helperStyle}>
              Don't have an account?
            </p>

            <button
              type="button"
              onClick={() => changeMode('signup')}
              style={outlineButtonStyle}
            >
              Create Account / Sign Up
            </button>
          </>
        )}

        {(mode === 'signup' || mode === 'forgot') && (
          <button
            type="button"
            onClick={() => changeMode('login')}
            style={outlineButtonStyle}
          >
            Back to Login
          </button>
        )}
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #e0f2f1, #f0fdf4)',
  padding: 20,
  boxSizing: 'border-box'
};

const cardStyle = {
  background: '#ffffff',
  padding: 36,
  borderRadius: 16,
  width: '100%',
  maxWidth: 440,
  boxShadow: '0 12px 35px rgba(0,0,0,0.1)'
};

const inputStyle = {
  width: '100%',
  padding: 12,
  marginTop: 8,
  marginBottom: 18,
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  boxSizing: 'border-box'
};

const primaryButtonStyle = {
  width: '100%',
  padding: 13,
  marginTop: 12,
  background: '#059669',
  color: '#ffffff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600
};

const outlineButtonStyle = {
  ...primaryButtonStyle,
  background: 'transparent',
  color: '#047857',
  border: '1px solid #059669'
};

const linkStyle = {
  display: 'block',
  marginTop: 16,
  marginLeft: 'auto',
  background: 'none',
  border: 'none',
  color: '#059669',
  cursor: 'pointer',
  fontWeight: 600
};

const helperStyle = {
  textAlign: 'center',
  marginTop: 22,
  color: '#64748b'
};
