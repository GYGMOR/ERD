const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:Init1234%21@localhost:5432/postgres' });
async function test() {
  try {
    await pool.query('BEGIN');
    const t = '9663ea2d-6d67-48d6-9ae4-0ef016af30f0';
    const newUser = await pool.query("INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active) VALUES ($1, 'test3@test.com', 'test', 'Test', 'Test', 'customer', false) RETURNING id", [t]);
    const userId = newUser.rows[0].id;
    const companyResult = await pool.query("INSERT INTO companies (tenant_id, name, website, address) VALUES ($1, 'Test', 'test', 'test') RETURNING id", [t]);
    const companyId = companyResult.rows[0].id;
    await pool.query("INSERT INTO contacts (company_id, user_id, phone, is_primary) VALUES ($1, $2, '123', true)", [companyId, userId]);
    
    // Test the ticket creation without tenant_id
    await pool.query(
      `INSERT INTO tickets (customer_id, company_id, title, description, priority, status, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        userId, 
        companyId,
        `Neuregistrierung: Test Test`, 
        `Ein neuer Benutzer hat sich registriert und wartet auf Freischaltung.`,
        'high',
        'open',
        'registration'
      ]
    );

    await pool.query('ROLLBACK');
    console.log('SUCCESS');
  } catch (e) {
    await pool.query('ROLLBACK');
    console.log('ERROR:', e.message);
  } finally {
    process.exit();
  }
}
test();
