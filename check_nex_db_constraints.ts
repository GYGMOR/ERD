import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: 'postgres://postgres:Init1234!@localhost:5432/nex_db',
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'contacts'
    `);
    console.log('Constraints in nex_db.contacts table:');
    res.rows.forEach(r => console.log(`${r.column_name}: Nullable=${r.is_nullable}`));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
