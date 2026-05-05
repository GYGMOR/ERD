import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'tickets'
    `);
    console.log('Tickets tables found:');
    res.rows.forEach(r => console.log(`${r.table_schema}.${r.table_name}`));
    
    for (const r of res.rows) {
        const cols = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = '${r.table_schema}' AND table_name = '${r.table_name}'
        `);
        console.log(`Columns in ${r.table_schema}.${r.table_name}:`, cols.rows.map(c => c.column_name).includes('category') ? 'HAS category' : 'MISSING category');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
