import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test DB connection
pool.query('SELECT NOW()', (err: Error | null) => {
  if (err) {
    console.error('Error connecting to the database', err.stack);
  } else {
    console.log('Connected to Database successfully.');
  }
});

// Routes
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'ok', message: 'NexusService API is running' });
});

app.get('/api/test-db', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query('SELECT current_database()');
    res.status(200).json({ success: true, database: result.rows[0].current_database });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});

// Auth Route: Local Login
app.post('/api/auth/login', async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials or user inactive' });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, tenant_id: user.tenant_id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({ success: true, token, user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
});

// ─── User Management Routes ───────────────────────────────────────────────────
app.get('/api/users', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query(`SELECT id, tenant_id, first_name, last_name, email, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC`);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Server error fetching users' });
  }
});

app.post('/api/users', async (req: express.Request, res: express.Response) => {
  const { tenant_id, first_name, last_name, email, role, password } = req.body;
  if (!tenant_id || !first_name || !last_name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Alle Pflichtfelder sind erforderlich.' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(409).json({ success: false, error: 'E-Mail wird bereits verwendet.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id, email, first_name, last_name, role, is_active, created_at`,
      [tenant_id, first_name, last_name, email, passwordHash, role || 'employee']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Server error creating user' });
  }
});

app.patch('/api/users/:id', async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { role, is_active, first_name, last_name } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
        role = COALESCE($1, role),
        is_active = COALESCE($2, is_active),
        first_name = COALESCE($3, first_name),
        last_name = COALESCE($4, last_name),
        updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, first_name, last_name, role, is_active, updated_at`,
      [role, is_active, first_name, last_name, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'User not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Server error updating user' });
  }
});

// ─── Ticket Comments ──────────────────────────────────────────────────────────
app.get('/api/tickets/:id/comments', async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT c.*, u.first_name, u.last_name, u.email
       FROM ticket_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.ticket_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ success: false, error: 'Server error fetching comments' });
  }
});

app.post('/api/tickets/:id/comments', async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { user_id, body, is_internal } = req.body;
  if (!user_id || !body) {
    return res.status(400).json({ success: false, error: 'user_id and body are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO ticket_comments (ticket_id, user_id, body, is_internal)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, user_id, body, is_internal || false]
    );
    // Also update ticket updated_at
    await pool.query(`UPDATE tickets SET updated_at = NOW() WHERE id = $1`, [id]);

    // Fetch joined with user data
    const joined = await pool.query(
      `SELECT c.*, u.first_name, u.last_name, u.email
       FROM ticket_comments c LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );
    res.status(201).json({ success: true, data: joined.rows[0] });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ success: false, error: 'Server error creating comment' });
  }
});

// ─── Notifications ────────────────────────────────────────────────────────────
app.get('/api/notifications', async (req: express.Request, res: express.Response) => {
  try {
    // Derive "smart" notifications from existing data
    const overdueInv = await pool.query(`SELECT id, title, amount, due_date FROM invoices WHERE status = 'overdue' ORDER BY due_date ASC LIMIT 5`);
    const criticalTkts = await pool.query(`SELECT id, title, created_at FROM tickets WHERE priority = 'critical' AND status NOT IN ('closed','resolved') ORDER BY created_at DESC LIMIT 5`);
    const overdueProjects = await pool.query(`SELECT id, name, end_date FROM projects WHERE end_date < NOW() AND status NOT IN ('completed','cancelled') LIMIT 5`);

    const notifications: { id: string; type: string; title: string; body: string; created_at: string }[] = [];

    for (const inv of overdueInv.rows) {
      notifications.push({ id: `inv-${inv.id}`, type: 'warning', title: 'Überfällige Rechnung', body: `${inv.title} — CHF ${parseFloat(inv.amount).toFixed(2)} (fällig: ${new Date(inv.due_date).toLocaleDateString('de-CH')})`, created_at: inv.due_date });
    }
    for (const t of criticalTkts.rows) {
      notifications.push({ id: `tkt-${t.id}`, type: 'danger', title: 'Kritisches Ticket', body: t.title, created_at: t.created_at });
    }
    for (const p of overdueProjects.rows) {
      notifications.push({ id: `proj-${p.id}`, type: 'warning', title: 'Projekt überfällig', body: `${p.name} — Enddatum: ${new Date(p.end_date).toLocaleDateString('de-CH')}`, created_at: p.end_date });
    }

    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.status(200).json({ success: true, data: notifications.slice(0, 15) });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── Invoice CSV Export ───────────────────────────────────────────────────────
app.get('/api/invoices/export/csv', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query(`
      SELECT i.id, i.title, c.name as company, i.amount, i.status, i.due_date, i.created_at
      FROM invoices i LEFT JOIN companies c ON i.company_id = c.id
      ORDER BY i.created_at DESC
    `);
    const rows = result.rows;
    const header = ['ID', 'Titel', 'Firma', 'Betrag (CHF)', 'Status', 'Fälligkeit', 'Erstellt'];
    const csv = [
      header.join(';'),
      ...rows.map(r => [
        r.id,
        `"${(r.title || '').replace(/"/g, '""')}"`,
        `"${(r.company || '').replace(/"/g, '""')}"`,
        parseFloat(r.amount || 0).toFixed(2),
        r.status,
        r.due_date ? new Date(r.due_date).toLocaleDateString('de-CH') : '',
        new Date(r.created_at).toLocaleDateString('de-CH'),
      ].join(';')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rechnungen.csv"');
    res.send('\uFEFF' + csv); // BOM for Excel
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ success: false, error: 'Export failed' });
  }
});

// Dashboard Metrics Route
app.get('/api/dashboard/metrics', async (req: express.Request, res: express.Response) => {
  try {
    // Basic multi-query for MVP dashboard stats
    const openTicketsResult = await pool.query(`SELECT COUNT(*) as count FROM tickets WHERE status NOT IN ('closed', 'resolved')`);
    const criticalTicketsResult = await pool.query(`SELECT COUNT(*) as count FROM tickets WHERE status NOT IN ('closed', 'resolved') AND priority = 'critical'`);
    const revMtdResult = await pool.query(`SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE issue_date >= date_trunc('month', CURRENT_DATE)`);
    const activeProjectsResult = await pool.query(`SELECT COUNT(*) as count FROM projects WHERE status = 'in_progress'`);
    
    // Ticket status distribution for pie chart
    const ticketDistResult = await pool.query(`SELECT status, COUNT(*) as count FROM tickets GROUP BY status`);
    const ticketData = ticketDistResult.rows.map((row: { status: string, count: string }) => {
      let color = 'var(--color-info)';
      let name = row.status;
      if (row.status === 'new') { color = 'var(--color-primary)'; name = 'Neu'; }
      if (row.status === 'open') { color = 'var(--color-warning)'; name = 'Offen'; }
      if (row.status === 'in_progress') { color = 'var(--color-info)'; name = 'In Arbeit'; }
      if (row.status === 'closed' || row.status === 'resolved') { color = 'var(--color-success)'; name = 'Erledigt'; }
      if (row.status === 'pending') { color = 'var(--color-text-muted)'; name = 'Wartend'; }
      return { name, value: parseInt(row.count, 10), color };
    });

    res.status(200).json({
      success: true,
      metrics: {
        openTickets: parseInt(openTicketsResult.rows[0].count, 10),
        criticalTickets: parseInt(criticalTicketsResult.rows[0].count, 10),
        revenueMtd: parseFloat(revMtdResult.rows[0].total),
        activeProjects: parseInt(activeProjectsResult.rows[0].count, 10),
        satisfaction: 100 // Hardcoded for MVP
      },
      charts: {
        ticketData: ticketData.length ? ticketData : [{ name: 'Keine Tickets', value: 1, color: 'var(--color-border)' }]
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Server error loading dashboard metrics' });
  }
});

// --- CRM Routes ---
app.get('/api/companies', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
    res.status(200).json({ success: true, count: result.rowCount, data: result.rows });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ success: false, error: 'Server error fetching companies' });
  }
});

app.post('/api/companies', async (req: express.Request, res: express.Response) => {
  const { tenant_id, name, domain, industry, website, phone, street, city, postal_code, country, is_active } = req.body;
  if (!tenant_id || !name) {
    return res.status(400).json({ success: false, error: 'Tenant ID and Name are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO companies (tenant_id, name, domain, industry, website, phone, street, city, postal_code, country, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [tenant_id, name, domain, industry, website, phone, street, city, postal_code, country, is_active ?? true]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ success: false, error: 'Server error creating company' });
  }
});

app.get('/api/contacts', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query(`
      SELECT c.*, comp.name as company_name 
      FROM contacts c 
      LEFT JOIN companies comp ON c.company_id = comp.id 
      ORDER BY c.created_at DESC
    `);
    res.status(200).json({ success: true, count: result.rowCount, data: result.rows });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ success: false, error: 'Server error fetching contacts' });
  }
});

app.post('/api/contacts', async (req: express.Request, res: express.Response) => {
  const { tenant_id, company_id, first_name, last_name, email, phone, role } = req.body;
  if (!tenant_id || !first_name || !last_name) {
    return res.status(400).json({ success: false, error: 'Tenant ID, First and Last Name are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO contacts (tenant_id, company_id, first_name, last_name, email, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [tenant_id, company_id || null, first_name, last_name, email, phone, role]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ success: false, error: 'Server error creating contact' });
  }
});

app.get('/api/companies/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const company = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    if (company.rowCount === 0) return res.status(404).json({ success: false, error: 'Company not found' });
    const tickets = await pool.query(`SELECT t.*, a.first_name as assignee_first_name, a.last_name as assignee_last_name FROM tickets t LEFT JOIN users a ON t.assignee_id = a.id WHERE t.company_id = $1 ORDER BY t.created_at DESC`, [id]);
    const invoices = await pool.query('SELECT * FROM invoices WHERE company_id = $1 ORDER BY created_at DESC', [id]);
    const contacts = await pool.query('SELECT * FROM contacts WHERE company_id = $1 ORDER BY created_at DESC', [id]);
    res.status(200).json({ success: true, data: { company: company.rows[0], tickets: tickets.rows, invoices: invoices.rows, contacts: contacts.rows } });
  } catch (error) {
    console.error('Error fetching company detail:', error);
    res.status(500).json({ success: false, error: 'Server error fetching company detail' });
  }
});

app.get('/api/tickets/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT t.*, u.first_name as customer_first_name, u.last_name as customer_last_name,
             a.first_name as assignee_first_name, a.last_name as assignee_last_name,
             c.name as company_name
      FROM tickets t
      LEFT JOIN users u ON t.customer_id = u.id
      LEFT JOIN users a ON t.assignee_id = a.id
      LEFT JOIN companies c ON t.company_id = c.id
      WHERE t.id = $1
    `, [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Ticket not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ success: false, error: 'Server error fetching ticket' });
  }
});

app.patch('/api/tickets/:id', async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { status, priority, assignee_id, title, description } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tickets SET 
        status = COALESCE($1, status),
        priority = COALESCE($2, priority),
        assignee_id = COALESCE($3, assignee_id),
        title = COALESCE($4, title),
        description = COALESCE($5, description),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [status, priority, assignee_id, title, description, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Ticket not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ success: false, error: 'Server error updating ticket' });
  }
});

// --- Ticket Routes ---
app.get('/api/tickets', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.first_name as customer_first_name, u.last_name as customer_last_name,
             a.first_name as assignee_first_name, a.last_name as assignee_last_name,
             c.name as company_name
      FROM tickets t
      LEFT JOIN users u ON t.customer_id = u.id
      LEFT JOIN users a ON t.assignee_id = a.id
      LEFT JOIN companies c ON t.company_id = c.id
      ORDER BY t.created_at DESC
    `);
    res.status(200).json({ success: true, count: result.rowCount, data: result.rows });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ success: false, error: 'Server error fetching tickets' });
  }
});

app.post('/api/tickets', async (req: express.Request, res: express.Response) => {
  const { tenant_id, title, description, status, priority, type, company_id, customer_id, assignee_id } = req.body;
  
  if (!tenant_id || !title) {
    return res.status(400).json({ success: false, error: 'Tenant ID and Title are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tickets (tenant_id, title, description, status, priority, type, company_id, customer_id, assignee_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tenant_id, title, description, status || 'new', priority || 'medium', type || 'support', company_id, customer_id, assignee_id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ success: false, error: 'Server error creating ticket' });
  }
});

// --- Invoice / Quotes Routes ---
app.get('/api/invoices', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query(`
      SELECT i.*, c.name as company_name
      FROM invoices i
      LEFT JOIN companies c ON i.company_id = c.id
      ORDER BY i.created_at DESC
    `);
    res.status(200).json({ success: true, count: result.rowCount, data: result.rows });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, error: 'Server error fetching invoices' });
  }
});

app.post('/api/invoices', async (req: express.Request, res: express.Response) => {
  const { tenant_id, company_id, title, amount, status, due_date } = req.body;
  if (!tenant_id || !title) {
    return res.status(400).json({ success: false, error: 'Tenant ID and Title are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO invoices (tenant_id, company_id, title, amount, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenant_id, company_id || null, title, amount || 0, status || 'draft', due_date]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ success: false, error: 'Server error creating invoice' });
  }
});

// --- Projects Routes ---
app.get('/api/projects', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as company_name,
        (SELECT COUNT(*) FROM tickets t WHERE t.company_id = p.company_id)::int as ticket_count
      FROM projects p
      LEFT JOIN companies c ON p.company_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ success: false, error: 'Server error fetching projects' });
  }
});

app.post('/api/projects', async (req: express.Request, res: express.Response) => {
  const { tenant_id, company_id, name, description, status, priority, start_date, end_date } = req.body;
  if (!tenant_id || !name) {
    return res.status(400).json({ success: false, error: 'Tenant ID and Name are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO projects (tenant_id, company_id, name, description, status, priority, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [tenant_id, company_id || null, name, description, status || 'planning', priority || 'medium', start_date || null, end_date || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ success: false, error: 'Server error creating project' });
  }
});

app.patch('/api/projects/:id', async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { status, priority, name, description, end_date } = req.body;
  try {
    const result = await pool.query(
      `UPDATE projects SET
        status = COALESCE($1, status),
        priority = COALESCE($2, priority),
        name = COALESCE($3, name),
        description = COALESCE($4, description),
        end_date = COALESCE($5, end_date),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [status, priority, name, description, end_date, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Project not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, error: 'Server error updating project' });
  }
});

// Improved dashboard with real invoice revenue
app.get('/api/dashboard/revenue', async (req: express.Request, res: express.Response) => {
  try {
    const mtd = await pool.query(`SELECT COALESCE(SUM(amount::numeric), 0) as revenue FROM invoices WHERE status = 'paid' AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())`);
    const ytd = await pool.query(`SELECT COALESCE(SUM(amount::numeric), 0) as revenue FROM invoices WHERE status = 'paid' AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())`);
    const pending = await pool.query(`SELECT COALESCE(SUM(amount::numeric), 0) as revenue FROM invoices WHERE status IN ('sent', 'draft')`);
    const overdue = await pool.query(`SELECT COUNT(*) as count FROM invoices WHERE status = 'overdue'`);
    res.status(200).json({ success: true, data: { mtd: parseFloat(mtd.rows[0].revenue), ytd: parseFloat(ytd.rows[0].revenue), pending: parseFloat(pending.rows[0].revenue), overdue: parseInt(overdue.rows[0].count) } });
  } catch {
    res.status(500).json({ success: false, error: 'Error fetching revenue data' });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port} and accessible on the network`);
});
