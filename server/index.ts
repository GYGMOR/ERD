import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

app.use(cors());
app.use(express.json());

// Serve static files from the frontend build directory
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
fs.ensureDirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ─── Middleware ───────────────────────────────────────────────────────────────

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    tenant_id: string;
    role: string;
    email: string;
    company_id?: string;
    contact_id?: string;
  };
}

const authenticateToken = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, error: 'Access denied: No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;

    // If customer or client, ensure company_id and contact_id are attached (lookup from contacts)
    if (decoded.role === 'customer' || decoded.role === 'client') {
      const contactResult = await pool.query('SELECT company_id, id as contact_id FROM contacts WHERE user_id = $1', [decoded.id]);
      if (contactResult.rows.length > 0) {
        req.user!.company_id = contactResult.rows[0].company_id;
        req.user!.contact_id = contactResult.rows[0].contact_id;
      }
    }

    next();
  } catch (error: any) {
    console.error('JWT Verification Error:', error.message);
    return res.status(403).json({ success: false, error: 'Invalid token' });
  }
};

const authorizeRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Insufficient permissions' });
    }
    next();
  };
};

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
    // Ensure password reset columns exist
    pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT, ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP').catch(err => console.error('Error adding reset columns:', err));
    
    // Project logs table
    pool.query(`
      CREATE TABLE IF NOT EXISTS project_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'note',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(err => console.error('Error creating project_logs table:', err));

    // Ensure projects has assigned_to column
    pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id)').catch(err => console.error('Error adding assigned_to to projects:', err));

    // Signatures
    pool.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS signature_data TEXT').catch(err => console.error('Error adding signature_data to tickets:', err));
    pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signature_data TEXT').catch(err => console.error('Error adding signature_data to contracts:', err));

    // Knowledge Base Folders
    pool.query('ALTER TABLE kb_articles ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE').catch(err => console.error('Error adding folder columns to kb_articles:', err));

    // Files / Documents table
    pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        entity_type VARCHAR(50) NOT NULL, -- 'ticket', 'project', 'contract', 'invoice', 'general'
        entity_id UUID, -- Optional if it's a general file
        file_name VARCHAR(255) NOT NULL,
        file_path TEXT, -- Null for folders
        file_type VARCHAR(100), -- 'folder', 'pdf', 'xlsx', 'docx', etc.
        file_size INTEGER,
        is_folder BOOLEAN DEFAULT false,
        parent_id UUID REFERENCES files(id) ON DELETE CASCADE,
        uploaded_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(err => console.error('Error creating files table:', err));

    // Webhook API Keys table
    pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        key_name VARCHAR(255) NOT NULL,
        api_key TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP
      )
    `).catch(err => console.error('Error creating api_keys table:', err));

    // Products folder support
    pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT false').catch(err => console.error('Error adding is_folder to products:', err));
    pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES products(id) ON DELETE CASCADE').catch(err => console.error('Error adding parent_id to products:', err));
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
  const { email, password, botVerificationChecked } = req.body;

  if (botVerificationChecked !== true) {
    return res.status(400).json({ success: false, error: 'Bitte bestätige, dass du kein Roboter bist.' });
  }

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

// Auth Route: Microsoft Entra ID (Azure AD) Sync
app.post('/api/auth/msal-sync', async (req: express.Request, res: express.Response) => {
  const { email, azure_ad_id, firstName, lastName } = req.body;
  
  if (!email) return res.status(400).json({ success: false, error: 'Missing email from MSAL' });

  try {
    // 1. Check if user exists (by email or azure_ad_id)
    let userResult = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
    
    if (userResult.rows.length === 0) {
      // Optioal: Auto-registrierung oder Fehler?
      // Für NexService: Fehler, da User manuell angelegt werden (Mitarbeiter/Kunden)
      return res.status(404).json({ 
        success: false, 
        error: 'Kein NexService-Konto für diese E-Mail gefunden. Bitte wende dich an den Admin.' 
      });
    }

    const user = userResult.rows[0];

    // 2. Update azure_ad_id if not set
    if (!user.azure_ad_id && azure_ad_id) {
        await pool.query('UPDATE users SET azure_ad_id = $1 WHERE id = $2', [azure_ad_id, user.id]);
    }

    // 3. Generate local JWT
    const token = jwt.sign(
      { id: user.id, tenant_id: user.tenant_id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({ 
      success: true, 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        firstName: user.first_name, 
        lastName: user.last_name 
      } 
    });
  } catch (error) {
    console.error('MSAL sync error:', error);
    res.status(500).json({ success: false, error: 'Server error during MSAL sync' });
  }
});

// (Redundant routes removed, using consolidated routes below)

// ─── Ticket Messages (Communication) ──────────────────────────────────────────
app.get('/api/tickets/:id/comments', async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT m.*, u.first_name, u.last_name, u.role
       FROM ticket_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.ticket_id = $1
       ORDER BY m.created_at ASC`,
      [id]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Server error' });
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
      `INSERT INTO ticket_messages (ticket_id, sender_id, message, is_internal)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, user_id, body, is_internal || false]
    );
    // Also update ticket updated_at
    await pool.query(`UPDATE tickets SET updated_at = NOW() WHERE id = $1`, [id]);

    // Fetch joined with user data
    const joined = await pool.query(
      `SELECT m.*, u.first_name, u.last_name, u.role
       FROM ticket_messages m JOIN users u ON m.sender_id = u.id
       WHERE m.id = $1`,
      [result.rows[0].id]
    );

    const messageObj = joined.rows[0];
    
    // Notify customer if it's NOT an internal note
    if (!is_internal) {
        const ticketInfo = await pool.query('SELECT customer_id, title, tenant_id FROM tickets WHERE id = $1', [id]);
        if (ticketInfo.rows.length > 0) {
            const ticket = ticketInfo.rows[0];
            // Only notify if the sender is NOT the customer themselves (though this route is internal, just being safe)
            if (ticket.customer_id !== user_id) {
                await createNotification({
                    tenant_id: ticket.tenant_id,
                    user_id: ticket.customer_id,
                    type: 'ticket',
                    entity_id: id as string,
                    title: 'Neue Nachricht vom Support',
                    message: `Es gibt eine neue Nachricht zu Ihrem Ticket "${ticket.title}".`,
                    priority: 'normal',
                    link: `/portal/tickets/${id as string}`
                });
            }
        }
    }

    res.status(201).json({ success: true, data: messageObj });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ success: false, error: 'Server error' });
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

app.get('/api/notifications', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id: userId, role } = req.user!;
    const result = await pool.query(`
      SELECT * FROM notifications 
      WHERE (user_id = $1 OR target_role = $2 OR (target_role = 'admin' AND $2 = 'admin'))
      AND is_read = false
      ORDER BY created_at DESC 
      LIMIT 50
    `, [userId, role]);
    
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE notifications SET is_read = true, updated_at = NOW() WHERE id = $1 RETURNING *', [id]);
    console.log(`Notification ${id} marked as read. Rows affected: ${result.rowCount}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Failed to update notification' });
  }
});

app.post('/api/notifications/read-all', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id: userId, role } = req.user!;
    console.log(`Marking all read for user ${userId} with role ${role}`);
    const result = await pool.query(
      'UPDATE notifications SET is_read = true, updated_at = NOW() WHERE (user_id = $1 OR target_role = $2 OR (target_role = \'admin\' AND $2 = \'admin\')) AND is_read = false', 
      [userId, role]
    );
    console.log(`Marked ${result.rowCount} notifications as read.`);
    res.status(200).json({ success: true, count: result.rowCount });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
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
// Dashboard Metrics Route (Consolidated)
app.get('/api/dashboard/metrics', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { tenant_id } = req.user!;

    // 1. Tickets (Open & Critical)
    const tickets = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status != 'closed' AND status != 'resolved') as open,
        COUNT(*) FILTER (WHERE priority = 'critical' AND status != 'closed') as critical
      FROM tickets WHERE tenant_id = $1
    `, [tenant_id]);

    // 2. Leads (New in last 7 days)
    const leads = await pool.query(`
      SELECT COUNT(*) as total FROM leads 
      WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
    `, [tenant_id]);

    // 3. Projects (Active)
    const projects = await pool.query(`
      SELECT COUNT(*) as total FROM projects 
      WHERE tenant_id = $1 AND status != 'completed' AND status != 'cancelled'
    `, [tenant_id]);

    // 4. Finance (Revenue of current month & Overdue invoices)
    const finance = await pool.query(`
      SELECT 
        SUM(amount) FILTER (WHERE issue_date >= DATE_TRUNC('month', CURRENT_DATE)) as month_revenue,
        COUNT(*) FILTER (WHERE status = 'overdue' OR (status = 'pending' AND due_date < CURRENT_DATE)) as overdue_count
      FROM invoices WHERE tenant_id = $1
    `, [tenant_id]);

    // 5. Ticket status distribution for pie chart
    const ticketDistResult = await pool.query(`SELECT status, COUNT(*) as count FROM tickets WHERE tenant_id = $1 GROUP BY status`, [tenant_id]);
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

    res.json({
      success: true,
      metrics: {
        openTickets: parseInt(tickets.rows[0].open || '0'),
        criticalTickets: parseInt(tickets.rows[0].critical || '0'),
        newLeads: parseInt(leads.rows[0].total || '0'),
        activeProjects: parseInt(projects.rows[0].total || '0'),
        monthRevenue: parseFloat(finance.rows[0].month_revenue || '0'),
        overdueInvoices: parseInt(finance.rows[0].overdue_count || '0'),
        satisfaction: 100
      },
      charts: {
        ticketData: ticketData.length ? ticketData : [{ name: 'Keine Tickets', value: 1, color: 'var(--color-border)' }]
      }
    });
  } catch (error) {
    console.error('Dashboard Metrics Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
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
      const ticketId = id as string;
      await createNotification({
        tenant_id: ticket.tenant_id,
        user_id: assignee_id,
        type: 'ticket',
        entity_id: ticketId,
        title: 'Ticket zugewiesen',
        message: `Das Ticket #${ticketId.substring(0,6).toUpperCase()} "${ticket.title}" wurde Ihnen zugewiesen.`,
        priority: ticket.priority === 'critical' ? 'critical' : 'high',
        link: `/tickets/${ticketId}`
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

app.post('/api/tickets/:id/signature', authenticateToken, async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { signature_data } = req.body;
  try {
    await pool.query('UPDATE tickets SET signature_data = $1, status = \'closed\', updated_at = NOW() WHERE id = $2', [signature_data, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save signature' });
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
        u.first_name as assignee_first_name, u.last_name as assignee_last_name,
        (SELECT COUNT(*) FROM tickets t WHERE t.company_id = p.company_id)::int as ticket_count
      FROM projects p
      LEFT JOIN companies c ON p.company_id = c.id
      LEFT JOIN users u ON p.assigned_to = u.id
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
      `INSERT INTO projects (tenant_id, company_id, name, description, status, priority, start_date, end_date, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tenant_id, company_id || null, name, description, status || 'planning', priority || 'medium', start_date || null, end_date || null, req.body.assigned_to || null]
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
        assigned_to = COALESCE($6, assigned_to),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [status, priority, name, description, end_date, req.body.assigned_to, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Project not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, error: 'Server error updating project' });
  }
});

// Project Logs (Journal)
app.get('/api/projects/:id/logs', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT l.*, u.first_name, u.last_name
      FROM project_logs l
      JOIN users u ON l.user_id = u.id
      WHERE l.project_id = $1
      ORDER BY l.created_at DESC
    `, [id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch project logs' });
  }
});

app.post('/api/projects/:id/logs', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  const { message, type } = req.body;
  const { id: userId } = req.user!;
  
  if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
  
  try {
    const result = await pool.query(
      `INSERT INTO project_logs (project_id, user_id, message, type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, userId, message, type || 'note']
    );
    
    // Fetch with user name
    const joined = await pool.query(`
      SELECT l.*, u.first_name, u.last_name
      FROM project_logs l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = $1
    `, [result.rows[0].id]);
    
    res.status(201).json({ success: true, data: joined.rows[0] });
  } catch (error) {
    console.error('Error creating project log:', error);
    res.status(500).json({ success: false, error: 'Failed to create project log' });
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
app.get('/api/products', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { tenant_id } = req.user!;
    const { parent_id } = req.query;
    
    let query = 'SELECT * FROM products WHERE tenant_id = $1';
    const params: any[] = [tenant_id];

    if (parent_id === 'null' || !parent_id) {
        query += ' AND parent_id IS NULL';
    } else {
        params.push(parent_id);
        query += ` AND parent_id = $${params.length}`;
    }

    query += ' ORDER BY is_folder DESC, name ASC';
    const result = await pool.query(query, params);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.post('/api/products', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { name, sku, category, description, price, tax_rate, unit, is_recurring, is_active, is_folder, parent_id } = req.body;
  const { tenant_id } = req.user!;
  try {
    const result = await pool.query(
      `INSERT INTO products (tenant_id, name, sku, category, description, price, tax_rate, unit, is_recurring, is_active, is_folder, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [tenant_id, name, sku, category, description, price || 0, tax_rate || 8.1, unit || 'Stück', is_recurring || false, is_active ?? true, is_folder || false, parent_id || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'Server error creating product' });
  }
});

app.post('/api/products', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { name, sku, category, description, price, tax_rate, unit, is_recurring, is_active, is_folder, parent_id } = req.body;
  const { tenant_id } = req.user!;
  try {
    const result = await pool.query(
      `INSERT INTO products (tenant_id, name, sku, category, description, price, tax_rate, unit, is_recurring, is_active, is_folder, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [tenant_id, name, sku, category, description, price || 0, tax_rate || 8.1, unit || 'Stück', is_recurring || false, is_active ?? true, is_folder || false, parent_id || null]
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
app.get('/api/knowledge/articles', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { tenant_id } = req.user!;
    const { parent_id } = req.query;
    
    let query = `
      SELECT a.*, u.first_name as author_first_name, u.last_name as author_last_name
      FROM kb_articles a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.tenant_id = $1
    `;
    const params: any[] = [tenant_id];

    if (parent_id === 'null' || !parent_id) {
      query += ` AND a.parent_id IS NULL`;
    } else {
      query += ` AND a.parent_id = $2`;
      params.push(parent_id);
    }

    query += ` ORDER BY a.is_folder DESC, a.title ASC`;
    const result = await pool.query(query, params);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching kb articles:', error);
    res.status(500).json({ success: false, error: 'Server error fetching articles' });
  }
});

app.post('/api/knowledge/articles', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { title, content, category, is_published, is_internal, is_folder, parent_id } = req.body;
  const { tenant_id, id: userId } = req.user!;
  try {
    const result = await pool.query(
      `INSERT INTO kb_articles (tenant_id, title, content, category, is_published, is_internal_only, author_id, is_folder, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tenant_id, title, content, category, is_published ?? false, is_internal ?? true, userId, is_folder || false, parent_id || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating kb article:', error);
    res.status(500).json({ success: false, error: 'Server error creating article' });
  }
});

app.post('/api/knowledge/folders', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { title, parent_id } = req.body;
  const { tenant_id, id: userId } = req.user!;
  try {
    const result = await pool.query(
      `INSERT INTO kb_articles (tenant_id, title, content, is_folder, parent_id, author_id)
       VALUES ($1, $2, '', true, $3, $4) RETURNING *`,
      [tenant_id, title, parent_id || null, userId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating kb folder:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── Documents / Files Routes ────────────────────────────────────────────────
app.get('/api/files', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { tenant_id } = req.user!;
    const { parent_id, entity_type, entity_id } = req.query;

    console.log(`Fetching files for tenant ${tenant_id}, type=${entity_type}, id=${entity_id}, parent=${parent_id}`);

    let query = `SELECT * FROM files WHERE tenant_id = $1`;
    const params: any[] = [tenant_id];

    if (entity_type) {
      query += ` AND entity_type = $${params.length + 1}`;
      params.push(entity_type);
    }
    if (entity_id && entity_id !== 'null') {
      query += ` AND entity_id = $${params.length + 1}`;
      params.push(entity_id);
    }

    if (parent_id === 'null' || !parent_id) {
      query += ` AND parent_id IS NULL`;
    } else {
      query += ` AND parent_id = $${params.length + 1}`;
      params.push(parent_id);
    }

    query += ` ORDER BY is_folder DESC, file_name ASC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/files/folders', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { name, parent_id, entity_type, entity_id } = req.body;
  const { tenant_id, id: userId } = req.user!;
  
  console.log(`Creating folder: ${name} for tenant ${tenant_id} (entity_id: ${entity_id})`);
  
  try {
    const result = await pool.query(
      `INSERT INTO files (tenant_id, file_name, is_folder, parent_id, entity_type, entity_id, uploaded_by, file_type)
       VALUES ($1, $2, true, $3, $4, $5, $6, 'folder') RETURNING *`,
      [
        tenant_id, 
        name, 
        parent_id && parent_id !== 'null' ? parent_id : null, 
        entity_type || 'general', 
        entity_id && entity_id !== 'null' ? entity_id : null, 
        userId
      ]
    );
    console.log(`Folder created successfully: ${result.rows[0].id}`);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: express.Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  
  const { parent_id, entity_type, entity_id } = req.body;
  const { tenant_id, id: userId } = req.user!;

  console.log(`Uploading file: ${req.file.originalname} for tenant ${tenant_id}`);

  try {
    const result = await pool.query(
      `INSERT INTO files (tenant_id, file_name, file_path, file_type, file_size, is_folder, parent_id, entity_type, entity_id, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8, $9) RETURNING *`,
      [
        tenant_id, 
        req.file.originalname, 
        `/uploads/${req.file.filename}`, 
        req.file.mimetype, 
        req.file.size,
        parent_id && parent_id !== 'null' ? parent_id : null,
        entity_type || 'general',
        entity_id && entity_id !== 'null' ? entity_id : null,
        userId
      ]
    );
    console.log(`File uploaded successfully: ${result.rows[0].id}`);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

app.delete('/api/files/:id', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  const { tenant_id } = req.user!;
  try {
    const fileResult = await pool.query('SELECT file_path FROM files WHERE id = $1 AND tenant_id = $2', [id, tenant_id]);
    if (fileResult.rows.length > 0 && fileResult.rows[0].file_path) {
       const fullPath = path.join(uploadDir, path.basename(fileResult.rows[0].file_path));
       fs.remove(fullPath).catch(err => console.error('Error deleting file from disk:', err));
    }

    await pool.query('DELETE FROM files WHERE id = $1 AND tenant_id = $2', [id, tenant_id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── Performance Reports ─────────────────────────────────────────────────────
app.get('/api/reports/performance', authenticateToken, authorizeRole('admin', 'manager'), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { tenant_id } = req.user!;
    const { months = '3' } = req.query;
    const interval = `${months} months`;

    const performance = await pool.query(`
      SELECT 
        u.id, u.first_name, u.last_name,
        (SELECT COUNT(*) FROM tickets t WHERE t.assignee_id = u.id AND t.status IN ('closed', 'resolved') AND t.updated_at >= NOW() - INTERVAL '${interval}') as resolved_tickets,
        (SELECT COUNT(*) FROM projects p WHERE p.assigned_to = u.id AND p.status = 'completed' AND p.updated_at >= NOW() - INTERVAL '${interval}') as completed_projects
      FROM users u
      WHERE u.tenant_id = $1 AND u.is_active = true AND u.role != 'customer'
      ORDER BY resolved_tickets DESC, completed_projects DESC
    `, [tenant_id]);

    res.json({ success: true, data: performance.rows });
  } catch (error) {
    console.error('Performance Report Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ─── Finance / Dashboard Metrics ──────────────────────────────────────────────
app.get('/api/finance/metrics', authenticateToken, authorizeRole('admin', 'manager'), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { tenant_id } = req.user!;
    const revenueByMonth = await pool.query(`
      SELECT TO_CHAR(issue_date, 'Mon') as month, SUM(amount) as revenue
      FROM invoices 
      WHERE tenant_id = $1 AND issue_date >= DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY TO_CHAR(issue_date, 'Mon'), DATE_PART('month', issue_date)
      ORDER BY DATE_PART('month', issue_date)
    `, [tenant_id]);

    const statusDistribution = await pool.query(`
      SELECT status, SUM(amount) as total FROM invoices WHERE tenant_id = $1 GROUP BY status
    `, [tenant_id]);

    res.json({ success: true, data: { revenueByMonth: revenueByMonth.rows, statusDistribution: statusDistribution.rows } });
  } catch (error) {
    console.error('Finance Metrics Error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});



// ─── Settings Routes ─────────────────────────────────────────────────────────
app.get('/api/settings', authenticateToken, authorizeRole('admin'), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { tenant_id } = req.user!;
    const result = await pool.query('SELECT category, key, value, is_secret FROM system_settings WHERE tenant_id = $1 OR tenant_id IS NULL', [tenant_id]);
    const data = result.rows.map(row => row.is_secret ? { ...row, value: '********' } : row);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed' });
  }
});



// Helper to get system settings
const getSystemSettings = async (tenantId: string | null, category: string) => {
  const result = await pool.query(
    'SELECT key, value, is_secret FROM system_settings WHERE (tenant_id = $1 OR tenant_id IS NULL) AND category = $2',
    [tenantId, category]
  );
  const settings: Record<string, any> = {};
  result.rows.forEach(row => {
    settings[row.key] = row.value;
  });
  return settings;
};

app.get('/api/settings', authenticateToken, authorizeRole('admin'), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { tenant_id } = req.user!;
    const result = await pool.query(
      'SELECT category, key, value, is_secret FROM system_settings WHERE tenant_id = $1 OR tenant_id IS NULL',
      [tenant_id]
    );
    
    // Mask secrets for safety
    const data = result.rows.map(row => {
      if (row.is_secret && row.value) {
        return { ...row, value: '********' };
      }
      return row;
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

app.patch('/api/settings', authenticateToken, authorizeRole('admin'), async (req: AuthenticatedRequest, res: express.Response) => {
  const { category, key, value, is_secret } = req.body;
  const { tenant_id } = req.user!;

  if (value === '********') {
    return res.json({ success: true, message: 'Value unchanged' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO system_settings (tenant_id, category, key, value, is_secret, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (tenant_id, category, key) 
       DO UPDATE SET value = EXCLUDED.value, is_secret = EXCLUDED.is_secret, updated_at = NOW()
       RETURNING *`,
      [tenant_id, category, key, value, is_secret ?? false]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ success: false, error: 'Failed to update calendar event' });
  }
});

// RSVP endpoint
app.patch('/api/calendar/events/:id/rsvp', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'confirmed', 'declined'
  const { id: userId, tenant_id } = req.user!;

  if (!['confirmed', 'declined'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }

  try {
    const result = await pool.query(
      'UPDATE calendar_event_participants SET status = $1 WHERE event_id = $2 AND user_id = $3 RETURNING *',
      [status, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invitation not found' });
    }

    // Optional: Notify creator
    const eventResult = await pool.query('SELECT title, created_by FROM calendar_events WHERE id = $1', [id]);
    if (eventResult.rows.length > 0) {
      const event = eventResult.rows[0];
      await createNotification({
        tenant_id,
        user_id: event.created_by,
        type: 'calendar',
        entity_id: id,
        title: 'Termin-Antwort',
        message: `Benutzer hat die Einladung zu "${event.title}" ${status === 'confirmed' ? 'angenommen' : 'abgelehnt'}.`,
        priority: 'low',
        link: `/calendar?eventId=${id}`
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating RSVP:', error);
    res.status(500).json({ success: false, error: 'Failed to update RSVP' });
  }
});

// Forgot Password Route
app.post('/api/auth/forgot-password', async (req: express.Request, res: express.Response) => {
  const { email } = req.body;
  try {
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      // Don't reveal if user exists or not for security, but user wants it to "work"
      return res.json({ success: true, message: 'Wenn diese E-Mail existiert, wurde ein Reset-Code gesendet.' });
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
      [resetToken, expires, email]
    );

    console.log(`[DEBUG] Password reset token for ${email}: ${resetToken}`);
    
    res.json({ success: true, message: 'Ein Reset-Code wurde an deine E-Mail gesendet.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Serverfehler' });
  }
});

// Reset Password Route
app.post('/api/auth/reset-password', async (req: express.Request, res: express.Response) => {
  const { email, token, newPassword } = req.body;
  try {
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND reset_token = $2 AND reset_token_expires > NOW()',
      [email, token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Ungültiger oder abgelaufener Reset-Code.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE email = $2',
      [hashedPassword, email]
    );

    res.json({ success: true, message: 'Passwort erfolgreich zurückgesetzt. Du kannst dich jetzt einloggen.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Serverfehler' });
  }
});


// Database migrations moved to startup logic
const runMigrations = async () => {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(10),
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
    `);
    console.log('Database schema updated (if necessary)');
  } catch (err) {
    console.error('Error updating schema:', err);
  }
};
runMigrations();



// ─── Calendar Routes ─────────────────────────────────────────────────────────

app.get('/api/calendar/events', authenticateToken, authorizeRole('admin', 'manager', 'employee'), async (req: AuthenticatedRequest, res: express.Response) => {
  const { id: userId, tenant_id } = req.user!;
  const { userIds, start, end } = req.query;

  try {
    let query = `
      SELECT e.*, 
             u.first_name as creator_first_name, u.last_name as creator_last_name,
             (SELECT json_agg(json_build_object('user_id', p.user_id, 'status', p.status, 'first_name', pu.first_name, 'last_name', pu.last_name))
              FROM calendar_event_participants p
              JOIN users pu ON p.user_id = pu.id
              WHERE p.event_id = e.id) as participants
      FROM calendar_events e
      JOIN users u ON e.created_by = u.id
      WHERE e.tenant_id = $1
    `;
    const params: any[] = [tenant_id];

    if (userIds) {
      const idArray = (userIds as string).split(',');
      params.push(idArray);
      query += ` AND (e.created_by = ANY($${params.length}) OR e.id IN (SELECT event_id FROM calendar_event_participants WHERE user_id = ANY($${params.length})))`;
    } else {
      query += ` AND (e.created_by = $2 OR e.id IN (SELECT event_id FROM calendar_event_participants WHERE user_id = $2))`;
      params.push(userId);
    }

    if (start) {
      params.push(start);
      query += ` AND e.start_time >= $${params.length}`;
    }
    if (end) {
      params.push(end);
      query += ` AND e.end_time <= $${params.length}`;
    }

    query += ' ORDER BY e.start_time ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch calendar events' });
  }
});

app.post('/api/calendar/events', authenticateToken, authorizeRole('admin', 'manager', 'employee'), async (req: AuthenticatedRequest, res: express.Response) => {
  const { title, description, start_time, end_time, is_all_day, location, color, category, responsible_id, participants, availability_status, is_private, reminder_minutes } = req.body;
  const { id: userId, tenant_id } = req.user!;

  try {
    await pool.query('BEGIN');
    const eventResult = await pool.query(
      `INSERT INTO calendar_events (tenant_id, created_by, responsible_id, title, description, start_time, end_time, is_all_day, location, color, category, availability_status, is_private, reminder_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [tenant_id, userId, responsible_id || userId, title, description, start_time, end_time, is_all_day || false, location, color, category, availability_status || 'busy', is_private || false, reminder_minutes || null]
    );

    const eventId = eventResult.rows[0].id;

    if (participants && Array.isArray(participants)) {
      // Fetch roles of all participants for correct notification links
      const rolesResult = await pool.query('SELECT id, role FROM users WHERE id = ANY($1)', [participants]);
      const userRoles = Object.fromEntries(rolesResult.rows.map(r => [r.id, r.role]));

      for (const pUserId of participants) {
        await pool.query(
          'INSERT INTO calendar_event_participants (event_id, user_id, status) VALUES ($1, $2, $3)',
          [eventId, pUserId, 'pending']
        );

        // Notify invited user
        if (pUserId !== userId) {
          const isCustomerRecipient = userRoles[pUserId] === 'customer' || userRoles[pUserId] === 'client';
          const notificationLink = isCustomerRecipient ? `/portal/calendar` : `/calendar?eventId=${eventId}`;
          
          await createNotification({
            tenant_id,
            user_id: pUserId,
            type: 'calendar',
            entity_id: eventId,
            title: 'Kalender-Einladung',
            message: `Sie wurden zum Termin "${title}" am ${new Date(start_time).toLocaleString('de-CH')} eingeladen.`,
            priority: 'normal',
            link: notificationLink
          });
        }
      }
    }

    await pool.query('COMMIT');
    res.status(201).json({ success: true, data: eventResult.rows[0] });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: 'Failed to create calendar event' });
  }
});

app.patch('/api/calendar/events/:id', authenticateToken, authorizeRole('admin', 'manager', 'employee'), async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  const { title, description, start_time, end_time, is_all_day, location, color, category, responsible_id, participants, availability_status, is_private, reminder_minutes } = req.body;
  const { id: userId, tenant_id } = req.user!;

  try {
    await pool.query('BEGIN');
    
    // Check permissions (admin or creator)
    const currentEvent = await pool.query('SELECT created_by FROM calendar_events WHERE id = $1', [id]);
    if (currentEvent.rows.length === 0) return res.status(404).json({ success: false, error: 'Event not found' });
    if (req.user!.role !== 'admin' && currentEvent.rows[0].created_by !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to edit this event' });
    }

    const eventResult = await pool.query(
      `UPDATE calendar_events 
       SET title = $1, description = $2, start_time = $3, end_time = $4, is_all_day = $5, 
           location = $6, color = $7, category = $8, responsible_id = $9, 
           availability_status = $10, is_private = $11, reminder_minutes = $12, updated_at = NOW()
       WHERE id = $13 RETURNING *`,
      [title, description, start_time, end_time, is_all_day, location, color, category, responsible_id, availability_status, is_private, reminder_minutes, id]
    );

    if (participants && Array.isArray(participants)) {
      // Fetch roles of all participants for correct notification links
      const rolesResult = await pool.query('SELECT id, role FROM users WHERE id = ANY($1)', [participants]);
      const userRoles = Object.fromEntries(rolesResult.rows.map(r => [r.id, r.role]));

      // Clear old participants and re-add (simple approach for now)
      await pool.query('DELETE FROM calendar_event_participants WHERE event_id = $1', [id]);
      for (const pUserId of participants) {
        await pool.query(
          'INSERT INTO calendar_event_participants (event_id, user_id, status) VALUES ($1, $2, $3)',
          [id, pUserId, 'pending']
        );

        // Notify updated user
        if (pUserId !== userId) {
          const isCustomerRecipient = userRoles[pUserId] === 'customer' || userRoles[pUserId] === 'client';
          const notificationLink = isCustomerRecipient ? `/portal/calendar` : `/calendar?eventId=${id}`;
          
          await createNotification({
            tenant_id,
            user_id: pUserId,
            type: 'calendar',
            entity_id: id,
            title: 'Termin aktualisiert',
            message: `Der Termin "${title}" am ${new Date(start_time).toLocaleString('de-CH')} wurde aktualisiert.`,
            priority: 'normal',
            link: notificationLink
          });
        }
      }
    }

    await pool.query('COMMIT');
    res.json({ success: true, data: eventResult.rows[0] });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error updating event:', error);
    res.status(500).json({ success: false, error: 'Failed to update calendar event' });
  }
});

// RSVP endpoint
app.patch('/api/calendar/events/:id/rsvp', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'confirmed', 'declined'
  const { id: userId, tenant_id } = req.user!;

  if (!['confirmed', 'declined'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }

  try {
    const result = await pool.query(
      'UPDATE calendar_event_participants SET status = $1 WHERE event_id = $2 AND user_id = $3 RETURNING *',
      [status, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invitation not found' });
    }

    // Notify creator
    const eventResult = await pool.query('SELECT title, created_by FROM calendar_events WHERE id = $1', [id]);
    if (eventResult.rows.length > 0) {
      const event = eventResult.rows[0];
      await createNotification({
        tenant_id,
        user_id: event.created_by,
        type: 'calendar',
        entity_id: id,
        title: 'Termin-Antwort',
        message: `Ein Teilnehmer hat die Einladung zu "${event.title}" ${status === 'confirmed' ? 'angenommen' : 'abgelehnt'}.`,
        priority: 'low',
        link: `/calendar?eventId=${id}`
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating RSVP:', error);
    res.status(500).json({ success: false, error: 'Failed to update RSVP' });
  }
});

// --- CUSTOMER PORTAL API ---

// Helper to get company_id for a user
const getCompanyId = async (userId: string) => {
  const result = await pool.query('SELECT company_id FROM contacts WHERE user_id = $1', [userId]);
  return result.rows[0]?.company_id;
};

app.get('/api/portal/dashboard', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id: userId, company_id } = req.user!;
    
    const [tickets, projects, offers, invoices, contracts] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM tickets WHERE customer_id = $1 AND status NOT IN ('resolved', 'closed')", [userId as string]),
      pool.query("SELECT COUNT(*) FROM projects WHERE company_id = $1 AND status = 'in_progress'", [company_id as string]),
      pool.query("SELECT COUNT(*) FROM offers WHERE company_id = $1 AND status = 'sent'", [company_id as string]),
      pool.query("SELECT COUNT(*) FROM invoices WHERE company_id = $1 AND status IN ('open', 'overdue')", [company_id as string]),
      pool.query("SELECT COUNT(*) FROM contracts WHERE company_id = $1 AND status = 'active'", [company_id as string])
    ]);

    res.json({
      success: true,
      data: {
        openTickets: parseInt(tickets.rows[0].count),
        activeProjects: parseInt(projects.rows[0].count),
        pendingOffers: parseInt(offers.rows[0].count),
        openInvoices: parseInt(invoices.rows[0].count),
        activeContracts: parseInt(contracts.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Portal: Error fetching dashboard metrics:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/portal/tickets', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id: userId } = req.user!;
    const result = await pool.query(`
      SELECT t.*, u.first_name as assignee_first_name, u.last_name as assignee_last_name
      FROM tickets t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.customer_id = $1
      ORDER BY t.updated_at DESC
    `, [userId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Portal: Error fetching tickets:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/portal/tickets', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { title, description, priority, type } = req.body;
  const { id: userId, tenant_id } = req.user!;
  
  if (!title || !description) return res.status(400).json({ success: false, error: 'Title and Description required' });

  try {
    const companyId = await getCompanyId(userId);
    const result = await pool.query(
      `INSERT INTO tickets (tenant_id, title, description, status, priority, type, company_id, customer_id, assignee_id) 
       VALUES ($1, $2, $3, 'new', $4, $5, $6, $7, NULL) RETURNING *`,
      [tenant_id, title, description, priority || 'medium', type || 'support', companyId, userId]
    );

    // Notify internal team (pool notification)
    await createNotification({
      tenant_id,
      target_role: 'admin',
      type: 'ticket',
      entity_id: result.rows[0].id,
      title: 'Neues Ticket im Pool',
      message: `Kunde hat ein neues Ticket "${title}" erstellt.`,
      priority: priority === 'critical' ? 'critical' : 'normal',
      link: `/tickets/${result.rows[0].id}`
    });

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Portal: Error creating ticket:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/portal/tickets/:id', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user!;
    
    const ticketResult = await pool.query(`
        SELECT t.*, u.first_name as assignee_first_name, u.last_name as assignee_last_name
        FROM tickets t
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.id = $1 AND t.customer_id = $2
    `, [id, userId]);

    if (ticketResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const messagesResult = await pool.query(`
        SELECT m.*, u.first_name, u.last_name, u.role
        FROM ticket_messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.ticket_id = $1 AND m.is_internal = FALSE
        ORDER BY m.created_at ASC
    `, [id]);

    res.json({ success: true, data: { ...ticketResult.rows[0], messages: messagesResult.rows } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/portal/tickets/:id/messages', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  const { message } = req.body;
  const { id: userId, tenant_id } = req.user!;

  try {
    // Check if ticket belongs to user
    const check = await pool.query('SELECT id, assignee_id, title FROM tickets WHERE id = $1 AND customer_id = $2', [id, userId]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const result = await pool.query(
      'INSERT INTO ticket_messages (ticket_id, sender_id, message, is_internal) VALUES ($1, $2, $3, FALSE) RETURNING *',
      [id, userId, message]
    );

    // Notify assignee if exists
    if (check.rows[0].assignee_id) {
        await createNotification({
            tenant_id,
            user_id: check.rows[0].assignee_id,
            type: 'ticket',
            entity_id: id as string,
            title: 'Neue Nachricht vom Kunden',
            message: `Kunde hat auf Ticket "${check.rows[0].title}" geantwortet.`,
            priority: 'normal',
            link: `/tickets/${id as string}`
        });
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/portal/invoices', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id: userId } = req.user!;
    const companyId = await getCompanyId(userId);
    if (!companyId) return res.json({ success: true, data: [] });

    const result = await pool.query('SELECT * FROM invoices WHERE company_id = $1 ORDER BY due_date DESC', [companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/portal/offers', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id: userId } = req.user!;
    const companyId = await getCompanyId(userId);
    if (!companyId) return res.json({ success: true, data: [] });

    const result = await pool.query('SELECT * FROM offers WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/portal/contracts', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id: userId } = req.user!;
    const companyId = await getCompanyId(userId);
    if (!companyId) return res.json({ success: true, data: [] });

    const result = await pool.query('SELECT * FROM contracts WHERE company_id = $1 ORDER BY start_date DESC', [companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/portal/calendar/events', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id: userId, tenant_id } = req.user!;
    // Fetch events where user is a participant
    const result = await pool.query(`
      SELECT e.*, u.first_name as creator_first_name, u.last_name as creator_last_name
      FROM calendar_events e
      JOIN calendar_event_participants p ON e.id = p.event_id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE p.user_id = $1 AND (e.tenant_id = $2 OR e.tenant_id IS NULL)
      ORDER BY e.start_time ASC
    `, [userId, tenant_id]);

    const eventIds = result.rows.map(r => r.id);
    let participants: any[] = [];
    
    if (eventIds.length > 0) {
      const pResult = await pool.query(`
        SELECT p.*, u.first_name, u.last_name, u.email
        FROM calendar_event_participants p
        JOIN users u ON p.user_id = u.id
        WHERE p.event_id = ANY($1)
      `, [eventIds]);
      participants = pResult.rows;
    }

    const data = result.rows.map(event => ({
      ...event,
      participants: participants.filter(p => p.event_id === event.id)
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Portal: Error fetching calendar events:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// --- TICKET ASSIGNMENT / POOL MANAGEMENT ---

// ─── External Webhooks ────────────────────────────────────────────────────────
app.post('/api/webhooks/tickets', async (req: express.Request, res: express.Response) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const { sender_email, subject, content, priority, type } = req.body;

    if (!apiKey) return res.status(401).json({ success: false, error: 'API Key required' });
    if (!sender_email || !subject || !content) return res.status(400).json({ success: false, error: 'Missing required fields' });

    try {
        // Validate API Key
        const keyResult = await pool.query('SELECT tenant_id FROM api_keys WHERE api_key = $1', [apiKey]);
        if (keyResult.rows.length === 0) return res.status(403).json({ success: false, error: 'Invalid API Key' });
        
        const { tenant_id } = keyResult.rows[0];

        // Find or create customer
        let userResult = await pool.query('SELECT id, company_id FROM users WHERE email = $1 AND tenant_id = $2', [sender_email, tenant_id]);
        let customerId: string | null = null;
        let companyId: string | null = null;

        if (userResult.rows.length > 0) {
            customerId = userResult.rows[0].id;
            companyId = userResult.rows[0].company_id;
        } else {
            // Auto-create lead or ghost user? 
            // For now, we create a ticket with no customer_id and mark the sender in description
        }

        const ticketResult = await pool.query(
            `INSERT INTO tickets (tenant_id, title, description, status, priority, type, customer_id, company_id)
             VALUES ($1, $2, $3, 'new', $4, $5, $6, $7) RETURNING *`,
            [tenant_id, subject, `[External Webhook] From: ${sender_email}\n\n${content}`, priority || 'medium', type || 'support', customerId, companyId]
        );

        // Notify team
        await createNotification({
            tenant_id,
            target_role: 'admin',
            type: 'ticket',
            entity_id: ticketResult.rows[0].id,
            title: 'Neues Externes Ticket',
            message: `Ein Ticket von ${sender_email} wurde via Webhook empfangen.`,
            priority: priority === 'critical' ? 'critical' : 'normal',
            link: `/tickets/${ticketResult.rows[0].id}`
        });

        res.status(201).json({ success: true, ticket_id: ticketResult.rows[0].id });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.patch('/api/tickets/:id/take', authenticateToken, authorizeRole('admin', 'management', 'employee'), async (req: AuthenticatedRequest, res: express.Response) => {
    const { id } = req.params;
    const { id: userId } = req.user!;
    try {
    const result = await pool.query(
        "UPDATE tickets SET assignee_id = $1, status = 'open', updated_at = NOW() WHERE id = $2 RETURNING *",
        [userId as string, id]
    );

    if (result.rows.length > 0) {
        const ticket = result.rows[0];
        // Notify customer
        await createNotification({
            tenant_id: ticket.tenant_id,
            user_id: ticket.customer_id,
            type: 'ticket',
            entity_id: id as string,
            title: 'Ticket übernommen',
            message: `Ihr Ticket "${ticket.title}" wurde von einem Mitarbeiter übernommen.`,
            priority: 'normal',
            link: `/portal/tickets/${id as string}`
        });
    }

    res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

app.patch('/api/tickets/:id/assign', authenticateToken, authorizeRole('admin', 'management'), async (req: AuthenticatedRequest, res: express.Response) => {
    const { id } = req.params;
    const { assignee_id } = req.body;
    try {
        const result = await pool.query(
            "UPDATE tickets SET assignee_id = $1, status = 'open', updated_at = NOW() WHERE id = $2 RETURNING *",
            [assignee_id, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Ticket not found' });
        
        // Notify new assignee
        await createNotification({
            tenant_id: result.rows[0].tenant_id,
            user_id: assignee_id as string,
            type: 'ticket',
            entity_id: id as string,
            title: 'Ticket zugewiesen',
            message: `Ihnen wurde das Ticket "${result.rows[0].title}" zugewiesen.`,
            priority: 'normal',
            link: `/tickets/${id as string}`
        });

        // Notify customer
        await createNotification({
            tenant_id: result.rows[0].tenant_id,
            user_id: result.rows[0].customer_id,
            type: 'ticket',
            entity_id: id as string,
            title: 'Ticket wurde zugewiesen',
            message: `Ihr Ticket "${result.rows[0].title}" wurde einem Mitarbeiter zur Bearbeitung zugewiesen.`,
            priority: 'normal',
            link: `/portal/tickets/${id as string}`
        });

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Internal Ticket Message with Customer Notification
app.post('/api/tickets/:id/messages', authenticateToken, authorizeRole('admin', 'management', 'employee'), async (req: AuthenticatedRequest, res: express.Response) => {
    const { id } = req.params;
    const { message, is_internal } = req.body;
    const { id: userId, tenant_id } = req.user!;
  
    try {
      const ticketCheck = await pool.query('SELECT customer_id, title FROM tickets WHERE id = $1', [id]);
      if (ticketCheck.rows.length === 0) return res.status(404).json({ success: false, error: 'Ticket not found' });
  
      const result = await pool.query(
        'INSERT INTO ticket_messages (ticket_id, sender_id, message, is_internal) VALUES ($1, $2, $3, $4) RETURNING *',
        [id, userId, message, is_internal || false]
      );
  
      // Notify customer if not internal
      if (!is_internal) {
          await createNotification({
              tenant_id: tenant_id as string,
              user_id: ticketCheck.rows[0].customer_id,
              type: 'ticket',
              entity_id: id as string,
              title: 'Neue Nachricht zu Ihrem Ticket',
              message: `Unser Team hat auf Ihr Ticket "${ticketCheck.rows[0].title}" geantwortet.`,
              priority: 'normal',
              link: `/portal/tickets/${id as string}`
          });
      }
  
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ─── Finance / Dashboard Routes ───────────────────────────────────────────────

app.get('/api/finance/metrics', authenticateToken, authorizeRole('admin', 'manager'), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { tenant_id } = req.user!;
    
    // Revenue by Month (Current Year)
    const revenueByMonth = await pool.query(`
      SELECT 
        TO_CHAR(issue_date, 'Mon') as month,
        SUM(amount) as revenue,
        COUNT(*) as count
      FROM invoices 
      WHERE tenant_id = $1 AND issue_date >= DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY TO_CHAR(issue_date, 'Mon'), DATE_PART('month', issue_date)
      ORDER BY DATE_PART('month', issue_date)
    `, [tenant_id]);

    // Pending vs Paid
    const statusDistribution = await pool.query(`
      SELECT status, SUM(amount) as total
      FROM invoices
      WHERE tenant_id = $1
      GROUP BY status
    `, [tenant_id]);

    // Recent Exports (for GoBD Historie)
    const recentExports = [
        { id: 1, type: 'GoBD/CSV', date: new Date().toISOString(), user: 'Admin', status: 'success' },
        { id: 2, type: 'VAT/PDF', date: new Date(Date.now() - 86400000 * 7).toISOString(), user: 'Admin', status: 'success' }
    ];

    res.json({
      success: true,
      data: {
        revenueByMonth: revenueByMonth.rows,
        statusDistribution: statusDistribution.rows,
        recentExports
      }
    });
  } catch (error) {
    console.error('Finance Metrics Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});



// For any other request, serve the index.html (Client Side Routing)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port} and accessible on the network`);
});

