import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbs = [ 'postgres', 'nexservice_db', 'nex_db', 'tradeflow', 'tradeflow_db' ];
const domains = ['gross-ict.ch', 'vierkorken.ch', 'gmail.com', 'sonnenber-baar.ch', 'online.gibz.ch'];

async function run() {
  for (const db of dbs) {
    const pool = new Pool({
      connectionString: `postgres://postgres:Init1234!@localhost:5432/${db}`,
    });
    try {
      const tableExists = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')");
      if (tableExists.rows[0].exists) {
        const res = await pool.query('SELECT email FROM users');
        const found = res.rows.filter(r => domains.some(d => r.email.includes(d)));
        if (found.length > 0) {
            console.log(`Found relevant users in ${db}:`);
            found.forEach(u => console.log(`  - ${u.email}`));
        }
      }
    } catch (err) {
      // console.error(`Error in ${db}:`, err.message);
    } finally {
      await pool.end();
    }
  }
}

run();
