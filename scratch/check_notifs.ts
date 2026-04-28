import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query("SELECT id, user_id, target_role, is_read, title FROM notifications LIMIT 10");
    console.log('Recent Notifications:', res.rows);
    
    const users = await pool.query("SELECT id, role, email FROM users LIMIT 10");
    console.log('Recent Users:', users.rows);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

check();
