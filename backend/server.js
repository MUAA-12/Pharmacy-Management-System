
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables first
dotenv.config({
  path: path.join(__dirname, '.env')
});

// Database connection
const { testConnection } = require('./config/db');

// Error handlers
const {
  errorHandler,
  notFoundHandler
} = require('./middleware/errorHandler');

// API routes
const medicineRoutes = require('./routes/medicineRoutes');
const customerRoutes = require('./routes/customerRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Explicitly allowed frontend domains
const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://pharmacy-management-system-black.vercel.app',
  'https://pharmacy-management-system-p5n9pt5dg-muaa-12.vercel.app',
  ...(process.env.FRONTEND_URL || '')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean)
]);

const corsOptions = {
  origin: (origin, callback) => {
    // Requests without Origin (e.g. server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    console.warn('CORS blocked origin:', origin);
    return callback(null, false);
  },

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'apikey',
    'X-Requested-With'
  ],

  optionsSuccessStatus: 204
};

// Enable CORS before routes and authentication
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    console.log(
      `[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();

  res.json({
    status: dbStatus.connected ? 'online' : 'degraded',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.connected,
      error: dbStatus.connected ? null : dbStatus.message
    }
  });
});

// Existing API routes
app.use('/api/medicines', medicineRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/reports', reportRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server locally
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`Pharmacy Management Server running on port ${PORT}`);

    const dbStatus = await testConnection();

    if (dbStatus.connected) {
      console.log('[DB SUCCESS]', dbStatus.message);
    } else {
      console.warn('[DB WARNING]', dbStatus.message);
    }
  });
}

// Export Express app for Vercel
module.exports = app;
