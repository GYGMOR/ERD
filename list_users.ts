import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    const res = await pool.query('SELECT id, email, tenant_id FROM users');
    console.log('Users:');
    res.rows.forEach(u => console.log(`- ${u.email} (ID: ${u.id}, Tenant: ${u.tenant_id})`));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
