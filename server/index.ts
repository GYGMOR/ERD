import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test DB connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database', err.stack);
  } else {
    console.log('Connected to Database successfully at:', res.rows[0].now);
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
app.post('/api/auth/login', async (req, res): Promise<any> => {
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
    const ticketData = ticketDistResult.rows.map((row: any) => {
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

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port} and accessible on the network`);
});
