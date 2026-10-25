const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
if (!process.env.DATABASE_URL) console.warn('DATABASE_URL missing. Configure Supabase Postgres connection string.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: true }, max: 10 });
async function testConnection() {
  try { await pool.query('SELECT 1'); return { connected: true, message: 'PostgreSQL connected' }; }
  catch (error) {
  console.error('DATABASE CONNECTION ERROR:', error.message);
  return { connected: false, message: error.message };
}
}
module.exports = { pool, testConnection };
