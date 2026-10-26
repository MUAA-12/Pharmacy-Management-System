
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load backend environment variables
dotenv.config({
  path: path.join(__dirname, '..', '.env')
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is missing. Configure Supabase PostgreSQL.'
  );
}

// Official Supabase Root CA certificate
const certificatePath = path.join(
  __dirname,
  '..',
  'certs',
  'prod-ca-2021.crt'
);

if (!fs.existsSync(certificatePath)) {
  throw new Error(
    'Supabase SSL certificate not found: ' + certificatePath
  );
}

const caCertificate = fs.readFileSync(
  certificatePath,
  'utf8'
);

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: databaseUrl,

  ssl: {
    ca: caCertificate,
    rejectUnauthorized: true
  },

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Handle unexpected idle connection errors
pool.on('error', (error) => {
  console.error(
    'PostgreSQL idle connection error:',
    error.message
  );
});

// Test secure PostgreSQL connection
async function testConnection() {
  try {
    const result = await pool.query(`
      SELECT
        CURRENT_DATABASE() AS database_name,
        CURRENT_USER AS database_user
    `);

    return {
      connected: true,
      message: 'Secure PostgreSQL connection successful',
      database: result.rows[0].database_name
    };
  } catch (error) {
    console.error('DATABASE CONNECTION ERROR:', {
      code: error.code,
      message: error.message
    });

    return {
      connected: false,
      message: 'PostgreSQL connection failed',
      code: error.code || null
    };
  }
}

module.exports = {
  pool,
  testConnection
};
