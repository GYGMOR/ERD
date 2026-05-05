import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: 'postgres://postgres:Init1234!@localhost:5432/postgres',
});

async function run() {
  try {
    const res = await pool.query('SELECT datname FROM pg_database WHERE datistemplate = false');
    console.log('Databases:', res.rows.map(r => r.datname));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
