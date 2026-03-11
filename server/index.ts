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

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port} and accessible on the network`);
});
