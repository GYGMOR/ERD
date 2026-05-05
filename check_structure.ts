import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    const schemas = await pool.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog')");
    console.log('Schemas:', schemas.rows.map(r => r.schema_name));
    
    for (const schema of schemas.rows) {
        const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema.schema_name}'`);
        console.log(`Tables in ${schema.schema_name}:`, tables.rows.map(r => r.table_name));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
