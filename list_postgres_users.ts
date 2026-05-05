import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: 'postgres://postgres:Init1234!@localhost:5432/postgres',
});

async function run() {
  try {
    // Check if users table exists in public schema
    const tableExists = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')");
    if (tableExists.rows[0].exists) {
        const res = await pool.query('SELECT id, email FROM users');
        console.log('Users in postgres db:');
        res.rows.forEach(u => console.log(`- ${u.email}`));
    } else {
        console.log('No users table in postgres db');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
