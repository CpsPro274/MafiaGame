import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER || process.env.PGUSER || 'postgres',
  host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
  database: process.env.DB_NAME || process.env.PGDATABASE || 'mafiagame',
  password: String(process.env.DB_PASSWORD || process.env.PGPASSWORD || ''),
  port: Number(process.env.DB_PORT || process.env.PGPORT) || 5432,
});

pool.on('connect', () => {
  console.log('PostgreSQL Connected');
});

pool.on('error', (err) => {
  console.error('PostgreSQL client error:', err.message);
});

export const query = (text, params) => pool.query(text, params);
export default pool;