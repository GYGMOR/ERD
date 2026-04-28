import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', res.rows.map(r => r.table_name));
    
    const filesCount = await pool.query("SELECT COUNT(*) FROM files");
    console.log('Files count:', filesCount.rows[0].count);
    
    const notifCount = await pool.query("SELECT COUNT(*) FROM notifications");
    console.log('Notifications count:', notifCount.rows[0].count);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

check();
