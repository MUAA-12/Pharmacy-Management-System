
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { pool } = require('../config/db');

// Only these two roles are supported by our application.
const VALID_ROLES = new Set(['admin', 'user']);

// Initialize Supabase authentication client.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    realtime: {
      transport: WebSocket
    }
  }
);

// Verify Supabase access token.
async function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (
      typeof authorization !== 'string' ||
      !/^Bearer\s+\S+$/i.test(authorization.trim())
    ) {
      return res.status(401).json({
        success: false,
        error: 'Login required. Please provide a valid access token.'
      });
    }

    const token = authorization.trim().replace(/^Bearer\s+/i, '');

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please log in again.'
      });
    }

    // Never trust role values supplied by the browser.
    req.user = data.user;

    // Role must be loaded from our database.
    req.userRole = null;

    return next();
  } catch (error) {
    console.error('Authentication verification error:', error.message);

    return res.status(503).json({
      success: false,
      error: 'Authentication service is temporarily unavailable.'
    });
  }
}

// Verify the user's role against PostgreSQL.
// Missing or invalid roles are always denied.
function requireRole(...allowedRoles) {
  const permittedRoles = allowedRoles.filter(
    (role) => VALID_ROLES.has(role)
  );

  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.'
        });
      }

      // Fail closed if route configuration contains
      // no valid allowed roles.
      if (permittedRoles.length === 0) {
        console.error(
          'Route has no valid allowed roles:',
          allowedRoles
        );

        return res.status(403).json({
          success: false,
          error: 'Access denied.'
        });
      }

      const result = await pool.query(
        `
          SELECT role
          FROM public.user_roles
          WHERE user_id = $1
          LIMIT 1
        `,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'No role assigned to this account.'
        });
      }

      const databaseRole = result.rows[0].role;

      // Old staff accounts and unknown roles are rejected.
      if (!VALID_ROLES.has(databaseRole)) {
        return res.status(403).json({
          success: false,
          error: 'This account has an unsupported role.'
        });
      }

      if (!permittedRoles.includes(databaseRole)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: insufficient permissions.'
        });
      }

      // Controllers can now safely read the verified role.
      req.userRole = databaseRole;

      return next();
    } catch (error) {
      console.error('Role verification error:', error.message);

      return res.status(503).json({
        success: false,
        error: 'Unable to verify account permissions.'
      });
    }
  };
}

module.exports = {
  requireAuth,
  requireRole
};
