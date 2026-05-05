const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:Init1234%21@localhost:5432/postgres' });
async function test() {
  try {
    const res = await pool.query("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'companies'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.log('ERROR:', e.message);
  } finally {
    process.exit();
  }
}
test();
