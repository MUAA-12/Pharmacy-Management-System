const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { testConnection } = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
const medicineRoutes = require('./routes/medicineRoutes');
const customerRoutes = require('./routes/customerRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite dev server (usually localhost:5173) and local origins
app.use(
  cors({
    origin: (process.env.FRONTEND_URL || 'http://localhost:5173').split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger for viva / demonstration transparency
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check and database diagnostics endpoint
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

// API Routes
app.use('/api/medicines', medicineRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/reports', reportRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(` Pharmacy Management Server running on port ${PORT}`);
  console.log(` API Base URL: http://localhost:${PORT}/api`);
  console.log('====================================================');

  const dbStatus = await testConnection();
  if (dbStatus.connected) {
    console.log(` [DB SUCCESS] ${dbStatus.message}`);
  } else {
    console.warn(` [DB WARNING] Could not connect to PostgreSQL database:`);
    console.warn(`   ${dbStatus.message}`);
    console.warn(`   Please verify DATABASE_URL in backend/.env`);
  }
  console.log('====================================================');
});

module.exports = app;
