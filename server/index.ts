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

// Helper to create notifications
const createNotification = async (notif: {
  tenant_id: string | null;
  user_id?: string | null;
  target_role?: string | null;
  type: string;
  entity_id: string | null;
  title: string;
  message: string;
  priority?: string;
  link?: string | null;
}) => {
  try {
    await pool.query(
      `INSERT INTO notifications (tenant_id, user_id, target_role, type, entity_id, title, message, priority, link)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        notif.tenant_id,
        notif.user_id || null,
        notif.target_role || null,
        notif.type,
        notif.entity_id,
        notif.title,
        notif.message,
        notif.priority || 'normal',
        notif.link || null
      ]
    );
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

app.get('/api/notifications', async (req: express.Request, res: express.Response) => {
  const userId = req.query.userId as string;
  const role = req.query.role as string;
  try {
    // Return notifications for the specific user OR for their role (if internal)
    const result = await pool.query(`
      SELECT * FROM notifications 
      WHERE (user_id = $1 OR target_role = $2 OR (target_role = 'admin' AND $2 = 'admin'))
      AND is_read = false
      ORDER BY created_at DESC 
      LIMIT 50
    `, [userId || null, role || null]);
    
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.patch('/api/notifications/:id/read', async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE notifications SET is_read = true, updated_at = NOW() WHERE id = $1', [id]);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update notification' });
  }
});

app.post('/api/notifications/read-all', async (req: express.Request, res: express.Response) => {
  const { userId, role } = req.body;
  try {
    await pool.query('UPDATE notifications SET is_read = true, updated_at = NOW() WHERE user_id = $1 OR target_role = $2', [userId, role]);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update notifications' });
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
    const contracts = await pool.query('SELECT * FROM contracts WHERE company_id = $1 ORDER BY created_at DESC', [id]);
    const contacts = await pool.query('SELECT * FROM contacts WHERE company_id = $1 ORDER BY created_at DESC', [id]);
    res.status(200).json({ success: true, data: { company: company.rows[0], tickets: tickets.rows, invoices: invoices.rows, contracts: contracts.rows, contacts: contacts.rows } });
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
    
    // Notification for assignment change
    if (assignee_id && typeof assignee_id === 'string') {
      const ticket = result.rows[0];
      await createNotification({
        tenant_id: ticket.tenant_id,
        user_id: assignee_id,
        type: 'ticket',
        entity_id: id,
        title: 'Ticket zugewiesen',
        message: `Das Ticket #${id.substring(0,6).toUpperCase()} "${ticket.title}" wurde Ihnen zugewiesen.`,
        priority: ticket.priority === 'critical' ? 'critical' : 'high',
        link: `/tickets/${id}`
      });
    }

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

    // Notification for new ticket (to admins/managers)
    await createNotification({
      tenant_id: tenant_id,
      target_role: 'admin',
      type: 'ticket',
      entity_id: result.rows[0].id,
      title: 'Neues Ticket erstellt',
      message: `Ein neues Ticket "${title}" wurde erstellt.`,
      priority: priority === 'critical' ? 'critical' : 'normal',
      link: `/tickets/${result.rows[0].id}`
    });

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

    // Notification for new invoice/quote
    await createNotification({
      tenant_id: tenant_id,
      target_role: 'manager',
      type: 'invoice',
      entity_id: result.rows[0].id,
      title: status === 'draft' ? 'Neue Offerte' : 'Neue Rechnung',
      message: `${status === 'draft' ? 'Offerte' : 'Rechnung'} "${title}" wurde erstellt.`,
      link: `/quotes?openQuote=${result.rows[0].id}`
    });

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

    // Notification for new project
    await createNotification({
      tenant_id: tenant_id,
      target_role: 'manager',
      type: 'project',
      entity_id: result.rows[0].id,
      title: 'Neues Projekt',
      message: `Projekt "${name}" wurde gestartet.`,
      link: `/projects?openProject=${result.rows[0].id}`
    });

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

// ─── Leads / Akquise Routes ───────────────────────────────────────────────────
app.get('/api/leads', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query(`
      SELECT l.*, u.first_name as assigned_first_name, u.last_name as assigned_last_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      ORDER BY l.created_at DESC
    `);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ success: false, error: 'Server error fetching leads' });
  }
});

app.post('/api/leads', async (req: express.Request, res: express.Response) => {
  const { tenant_id, company_name, website, industry, location, contact_name, contact_email, contact_phone, status, assigned_to, notes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO leads (tenant_id, company_name, website, industry, location, contact_name, contact_email, contact_phone, status, assigned_to, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [tenant_id, company_name, website, industry, location, contact_name, contact_email, contact_phone, status || 'new', assigned_to, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ success: false, error: 'Server error creating lead' });
  }
});

app.patch('/api/leads/:id', async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { status, assigned_to, notes, company_name } = req.body;
  try {
    const result = await pool.query(
      `UPDATE leads SET
        status = COALESCE($1, status),
        assigned_to = COALESCE($2, assigned_to),
        notes = COALESCE($3, notes),
        company_name = COALESCE($4, company_name),
        updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [status, assigned_to, notes, company_name, id]
    );
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ success: false, error: 'Server error updating lead' });
  }
});

// ─── Contracts / Verträge Routes ──────────────────────────────────────────────
app.get('/api/contracts', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query(`
      SELECT con.*, c.name as company_name, u.first_name as assigned_first_name, u.last_name as assigned_last_name
      FROM contracts con
      LEFT JOIN companies c ON con.company_id = c.id
      LEFT JOIN users u ON con.assigned_to = u.id
      ORDER BY con.created_at DESC
    `);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ success: false, error: 'Server error fetching contracts' });
  }
});

app.post('/api/contracts', async (req: express.Request, res: express.Response) => {
  const { tenant_id, title, contract_number, contract_type, company_id, contact_id, assigned_to, start_date, end_date, notice_period_days, amount, billing_interval, status, notes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO contracts (tenant_id, title, contract_number, contract_type, company_id, contact_id, assigned_to, start_date, end_date, notice_period_days, amount, billing_interval, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [tenant_id, title, contract_number, contract_type, company_id, contact_id, assigned_to, start_date, end_date, notice_period_days, amount, billing_interval, status || 'draft', notes]
    );

    // Notification for new contract
    await createNotification({
      tenant_id: tenant_id,
      target_role: 'admin',
      type: 'contract',
      entity_id: result.rows[0].id,
      title: 'Neuer Vertrag',
      message: `Vertrag "${title}" wurde angelegt.`,
      link: `/contracts?openContract=${result.rows[0].id}`
    });

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ success: false, error: 'Server error creating contract' });
  }
});

// ─── Products / Produkte Routes ───────────────────────────────────────────────
app.get('/api/products', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY name ASC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Server error fetching products' });
  }
});

app.post('/api/products', async (req: express.Request, res: express.Response) => {
  const { tenant_id, name, sku, category, description, price, tax_rate, unit, is_recurring, is_active } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO products (tenant_id, name, sku, category, description, price, tax_rate, unit, is_recurring, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [tenant_id, name, sku, category, description, price, tax_rate || 8.1, unit || 'Stück', is_recurring || false, is_active ?? true]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'Server error creating product' });
  }
});

// ─── Newsletters Routes ───────────────────────────────────────────────────────
app.get('/api/newsletters', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query('SELECT * FROM newsletters ORDER BY created_at DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching newsletters:', error);
    res.status(500).json({ success: false, error: 'Server error fetching newsletters' });
  }
});

app.post('/api/newsletters', async (req: express.Request, res: express.Response) => {
  const { tenant_id, subject, title, content, status, scheduled_at } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO newsletters (tenant_id, subject, title, content, status, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenant_id, subject, title, content, status || 'draft', scheduled_at]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating newsletter:', error);
    res.status(500).json({ success: false, error: 'Server error creating newsletter' });
  }
});

// ─── Knowledge Base Routes ────────────────────────────────────────────────────
app.get('/api/knowledge/articles', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query(`
      SELECT a.*, u.first_name as author_first_name, u.last_name as author_last_name
      FROM kb_articles a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching kb articles:', error);
    res.status(500).json({ success: false, error: 'Server error fetching articles' });
  }
});

app.post('/api/knowledge/articles', async (req: express.Request, res: express.Response) => {
  const { tenant_id, title, content, category, is_published, is_internal, user_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO kb_articles (tenant_id, title, content, category, is_published, is_internal, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [tenant_id, title, content, category, is_published ?? false, is_internal ?? true, user_id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating kb article:', error);
    res.status(500).json({ success: false, error: 'Server error creating article' });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port} and accessible on the network`);
});

