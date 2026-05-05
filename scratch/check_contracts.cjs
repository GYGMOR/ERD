const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'contracts'
    `);
    console.log('Contracts Columns:', res.rows);
    
    const sample = await pool.query('SELECT * FROM contracts LIMIT 1');
    console.log('Sample Contract:', sample.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();
