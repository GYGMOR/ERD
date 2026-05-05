const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:Init1234!@localhost:5432/postgres'
});

async function listTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', res.rows.map(r => r.table_name));
    
    // Check contracts columns
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'contracts'
    `);
    console.log('Contracts Columns:', cols.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

listTables();
