import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: 'postgres://postgres:Init1234!@localhost:5432/tradeflow_db',
});

async function run() {
  try {
    const res = await pool.query('SELECT id, email FROM users');
    console.log('Users in tradeflow_db:');
    res.rows.forEach(u => console.log(`- ${u.email}`));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
