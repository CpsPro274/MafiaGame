import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mafiagame',
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
});

pool.on('connect', () => {
  console.log('PostgreSQL Connected');
});

pool.on('error', (err) => {
  console.error('PostgreSQL client error:', err.message);
});

export const query = (text, params) => pool.query(text, params);
export default pool;