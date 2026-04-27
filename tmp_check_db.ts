import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in database:', res.rows.map(r => r.table_name));
    
    // Check users table specifically
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log('Users count:', usersCount.rows[0].count);
  } catch (err) {
    console.error('Error checking database:', err);
  } finally {
    await pool.end();
  }
}

check();
