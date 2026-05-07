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
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { Resend } from 'resend';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

console.log('[DEBUG] Available Env Var Names:', Object.keys(process.env).filter(k => !k.startsWith('npm_')));

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

app.use(cors());
// Stripe webhooks need the raw body for signature verification
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

// Resend Email Setup
const resendApiKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim().replace(/^["']|["']$/g, '') : null;
if (!resendApiKey) {
  console.warn('WARNING: RESEND_API_KEY is not set. Emails will not be sent.');
}
const resend = new Resend(resendApiKey || 'missing_key');
const EMAIL_NO_REPLY = 'HED-IT <no-reply@hed-it.ch>';
const EMAIL_INFO = 'HED-IT <info@hed-it.ch>';
const EMAIL_ADMIN_INTERNAL = 'joel.hediger@hed-it.ch';

// ─── Stripe Setup ─────────────────────────────────────────────────────────────
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY as string)
  : null;
if (!stripe) console.warn('WARNING: STRIPE_SECRET_KEY not set — payments disabled.');

async function getOrCreateStripeCustomer(companyId: string): Promise<string> {
  const comp = await pool.query('SELECT stripe_customer_id, name, email FROM companies WHERE id = $1', [companyId]);
  if (!comp.rows[0]) throw new Error('Company not found');
  if (comp.rows[0].stripe_customer_id) return comp.rows[0].stripe_customer_id;
  const customer = await stripe!.customers.create({
    name: comp.rows[0].name,
    email: comp.rows[0].email,
    metadata: { company_id: companyId },
  });
  await pool.query('UPDATE companies SET stripe_customer_id = $1 WHERE id = $2', [customer.id, companyId]);
  return customer.id;
}

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
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@db:5432/postgres'
});

// Database Migrations / Schema Checks
async function runMigrations() {
  try {
    // Add last_device to users if not exists
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_device TEXT');
    console.log('[INFO] Database schema verified.');
  } catch (err) {
    console.error('[CRITICAL] Migration failed:', err);
  }
}

// Test DB connection and run migrations
const connectWithRetry = () => {
  pool.query('SELECT NOW()', async (err) => {
    if (err) {
      console.error('Error connecting to the database, retrying in 5s...', err.message);
      setTimeout(connectWithRetry, 5000);
    } else {
      console.log('Connected to Database successfully.');
      await runMigrations();
      await initDatabase();
    }
  });
};

async function initDatabase() {
  try {
    // 1. Extensions
    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"').catch(() => {});

    // 2. Base columns
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT, ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP').catch(() => {});
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_device TEXT').catch(() => {});
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT').catch(() => {});
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false').catch(() => {});

    // 2b. Company columns
    await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT').catch(() => {});
    await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT').catch(() => {});
    await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT').catch(() => {});
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT').catch(() => {});
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP').catch(() => {});
    await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry TEXT').catch(() => {});

    // 3. Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'note',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID,
        file_name VARCHAR(255) NOT NULL,
        file_path TEXT,
        file_type VARCHAR(100),
        file_size INTEGER,
        is_folder BOOLEAN DEFAULT false,
        parent_id UUID REFERENCES files(id) ON DELETE CASCADE,
        uploaded_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        key_name VARCHAR(255) NOT NULL,
        api_key TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP
      )
    `).catch(() => {});

    // 4. Additional columns & migrations
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id)').catch(() => {});
    await pool.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS signature_data TEXT').catch(() => {});
    await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signature_data TEXT').catch(() => {});
    await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signature_date TIMESTAMP').catch(() => {});
    await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_type TEXT').catch(() => {});
    await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS discount_percent DECIMAL DEFAULT 0').catch(() => {});
    await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS items JSONB').catch(() => {});
    await pool.query('ALTER TABLE kb_articles ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE').catch(() => {});
    await pool.query('ALTER TABLE files ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT false').catch(() => {});
    await pool.query('ALTER TABLE files ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES files(id) ON DELETE CASCADE').catch(() => {});
    await pool.query('ALTER TABLE files ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50)').catch(() => {});
    await pool.query('ALTER TABLE files ADD COLUMN IF NOT EXISTS entity_id UUID').catch(() => {});
    await pool.query('ALTER TABLE files ADD COLUMN IF NOT EXISTS tenant_id UUID').catch(() => {});
    await pool.query('ALTER TABLE files ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP').catch(() => {});
    await pool.query('ALTER TABLE files ALTER COLUMN file_path DROP NOT NULL').catch(() => {});
    await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP').catch(() => {});
    await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_role VARCHAR(50)').catch(() => {});
    await pool.query('ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT, ADD COLUMN IF NOT EXISTS attachment_name TEXT').catch(() => {});
    // Products table (may not exist in older deployments)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(12,2) DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'Stück',
        category VARCHAR(100),
        tax_rate DECIMAL(5,2) DEFAULT 8.1,
        is_recurring BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        is_folder BOOLEAN DEFAULT FALSE,
        parent_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `).catch(() => {});
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT false').catch(() => {});
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES products(id) ON DELETE CASCADE').catch(() => {});

    // 5. Contacts table migrations - ensure all columns exist
    await pool.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tenant_id UUID').catch(() => {});
    await pool.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NOT NULL DEFAULT \'\'').catch(() => {});
    await pool.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NOT NULL DEFAULT \'\'').catch(() => {});
    await pool.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email VARCHAR(255)').catch(() => {});
    await pool.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role VARCHAR(100)').catch(() => {});
    await pool.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE').catch(() => {});
    await pool.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE').catch(() => {});
    await pool.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id UUID').catch(() => {});
    await pool.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP').catch(() => {});

    // 6. Backfill: Sync contact first_name/last_name/email from linked users if empty
    await pool.query(`
      UPDATE contacts c 
      SET first_name = u.first_name, 
          last_name = u.last_name, 
          email = COALESCE(c.email, u.email)
      FROM users u 
      WHERE c.user_id = u.id 
        AND (c.first_name = '' OR c.first_name IS NULL OR c.last_name = '' OR c.last_name IS NULL)
    `).catch((err: any) => console.log('[INFO] Contact backfill skipped:', err.message));

    // 7. Proposals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        company_id UUID,
        proposal_number TEXT,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        items JSONB DEFAULT '[]',
        subtotal DECIMAL(12,2) DEFAULT 0,
        tax_total DECIMAL(12,2) DEFAULT 0,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        total DECIMAL(12,2) DEFAULT 0,
        notes TEXT,
        valid_until DATE,
        signed_at TIMESTAMP,
        signature_data TEXT,
        rejected_at TIMESTAMP,
        rejected_reason TEXT,
        contract_id UUID,
        created_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `).catch(() => {});

    // 8. Invoice & contract additions for proposal workflow
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_interval TEXT DEFAULT \'one_time\'').catch(() => {});
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE').catch(() => {});
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS items JSONB').catch(() => {});
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS proposal_id UUID').catch(() => {});
    await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS proposal_id UUID').catch(() => {});
    await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS next_invoice_date DATE').catch(() => {});

    console.log('[INFO] Database initialization complete.');
  } catch (err) {
    console.error('[CRITICAL] initDatabase failed:', err);
  }
}

connectWithRetry();

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
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Ungültige Anmeldedaten.' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ 
        success: false, 
        error: 'Ihr Konto wird derzeit noch geprüft. Wir schalten Sie in der Regel innerhalb von 24-48 Stunden frei.' 
      });
    }
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      return res.status(200).json({ 
        success: true, 
        requires2FA: true, 
        userId: user.id,
        email: user.email 
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        tenant_id: user.tenant_id, 
        role: user.role, 
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({ success: true, token, user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
});

// Auth Route: Register
app.post('/api/auth/register', async (req: express.Request, res: express.Response) => {
  const { email, password, firstName, lastName, phone, botVerificationChecked, companyName, domain, address } = req.body;

  if (botVerificationChecked !== true) {
    return res.status(400).json({ success: false, error: 'Bitte bestätige, dass du kein Roboter bist.' });
  }
  
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Telefonnummer ist zwingend erforderlich.' });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Diese E-Mail Adresse wird bereits verwendet.' });
    }

    // Get default tenant (or create if none)
    let tenantId;
    const tenantResult = await pool.query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length > 0) {
      tenantId = tenantResult.rows[0].id;
    } else {
      const newTenant = await pool.query('INSERT INTO tenants (name) VALUES ($1) RETURNING id', ['HED-IT Management']);
      tenantId = newTenant.rows[0].id;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user (INACTIVE by default for approval)
    const newUser = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, role`,
      [tenantId, email, passwordHash, firstName, lastName, 'customer', false]
    );

    const userId = newUser.rows[0].id;

    let companyId = null;
    if (companyName) {
      const companyResult = await pool.query(
        'INSERT INTO companies (tenant_id, name, website, address) VALUES ($1, $2, $3, $4) RETURNING id',
        [tenantId, companyName, domain || null, address || null]
      );
      companyId = companyResult.rows[0].id;
    }

    // Connect user and company via contacts table, correctly using its schema
    await pool.query(
      'INSERT INTO contacts (tenant_id, company_id, user_id, phone, first_name, last_name, email) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [tenantId, companyId, userId, phone, firstName, lastName, email]
    );

    // CREATE SYSTEM TICKET FOR APPROVAL
    const ticketResult = await pool.query(
      `INSERT INTO tickets (tenant_id, customer_id, company_id, title, description, priority, status, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        tenantId,
        userId, 
        companyId,
        `Neuregistrierung: ${firstName} ${lastName}`, 
        `Ein neuer Benutzer hat sich registriert und wartet auf Freischaltung.\nE-Mail: ${email}\nName: ${firstName} ${lastName}\nFirma: ${companyName || '-'}\nWebseite: ${domain || '-'}`,
        'high',
        'open',
        'registration'
      ]
    );

    // NOTIFY ADMINS & MANAGERS
    await createNotification({
      tenant_id: tenantId,
      target_role: 'admin',
      type: 'ticket',
      entity_id: ticketResult.rows[0].id,
      title: 'Neue Benutzer-Registrierung',
      message: `${firstName} ${lastName} wartet auf Freischaltung.`,
      priority: 'high',
      link: `/tickets/${ticketResult.rows[0].id}`
    });

    // Also notify managers
    await createNotification({
      tenant_id: tenantId,
      target_role: 'manager',
      type: 'ticket',
      entity_id: ticketResult.rows[0].id,
      title: 'Neue Benutzer-Registrierung',
      message: `${firstName} ${lastName} wartet auf Freischaltung.`,
      priority: 'high',
      link: `/tickets/${ticketResult.rows[0].id}`
    });

    // INTERNAL EMAIL NOTIFICATION
    try {
      await resend.emails.send({
        from: EMAIL_INFO,
        to: [EMAIL_ADMIN_INTERNAL],
        subject: `NEUE REGISTRIERUNG: ${firstName} ${lastName}`,
        html: `
          <div style="font-family: sans-serif;">
            <h2>Neue Registrierung im Portal</h2>
            <p>Ein neuer Benutzer hat sich registriert und wartet auf Freischaltung:</p>
            <ul>
              <li><strong>Name:</strong> ${firstName} ${lastName}</li>
              <li><strong>E-Mail:</strong> ${email}</li>
            </ul>
            <a href="https://tool.hed-it.ch/tickets/${ticketResult.rows[0].id}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Zum Ticket</a>
          </div>
        `
      });
    } catch (err) { console.error('Failed to send registration info email:', err); }

    // Also notify employees
    await createNotification({
      tenant_id: tenantId,
      target_role: 'employee',
      type: 'ticket',
      entity_id: ticketResult.rows[0].id,
      title: 'Neue Benutzer-Registrierung',
      message: `${firstName} ${lastName} wartet auf Freischaltung.`,
      priority: 'high',
      link: `/tickets/${ticketResult.rows[0].id}`
    });

    res.status(201).json({ success: true, message: 'Registrierung erfolgreich. Wir prüfen Ihr Konto innerhalb von 24-48 Stunden.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Serverfehler bei der Registrierung: ' + (error as any).message });
  }
});

// Auth Route: Forgot Password
app.post('/api/auth/forgot-password', async (req: express.Request, res: express.Response) => {
  const { email } = req.body;

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      // Don't reveal that the user doesn't exist for security
      return res.status(200).json({ success: true, message: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' });
    }

    const userId = userResult.rows[0].id;
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, expires, userId]
    );

    const resetLink = `${process.env.APP_URL || 'https://hed-it.ch'}/reset-password?token=${resetToken}`;

    const sendResult = await resend.emails.send({
      from: EMAIL_NO_REPLY,
      to: [email],
      subject: 'Passwort zurücksetzen',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Passwort zurücksetzen</h2>
          <p>Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.</p>
          <p>Klicke auf den folgenden Link, um ein neues Passwort festzulegen:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Passwort zurücksetzen</a>
          <p>Dieser Link ist für 1 Stunde gültig.</p>
          <p>Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.</p>
        </div>
      `
    });
    console.log('[DEBUG] Password reset email sent. Result:', sendResult);

    res.status(200).json({ success: true, message: 'Link zum Zurücksetzen gesendet.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Senden der E-Mail' });
  }
});

// Auth Route: Reset Password
app.post('/api/auth/reset-password', async (req: express.Request, res: express.Response) => {
  const { token, password } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Ungültiger oder abgelaufener Token.' });
    }

    const userId = userResult.rows[0].id;
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, userId]
    );

    res.status(200).json({ success: true, message: 'Passwort erfolgreich geändert.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Zurücksetzen des Passworts' });
  }
});

// --- USERS MANAGEMENT ---

app.get('/api/users', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { tenant_id } = req.user!;
    const { includeCustomers } = req.query;
    
    let query = 'SELECT id, tenant_id, first_name, last_name, email, role, is_active, last_device, created_at, updated_at FROM users WHERE tenant_id = $1';
    
    if (includeCustomers !== 'true') {
      // By default, maybe we show all? 
      // The frontend uses includeCustomers=true when they want clients, but actually they might just want all.
      // Let's just return all users for this tenant for now, but ordered by created_at.
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, [tenant_id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Server error fetching users' });
  }
});

app.post('/api/users', authenticateToken, authorizeRole('admin', 'manager'), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { first_name, last_name, email, role, password, tenant_id } = req.body;
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ success: false, error: 'E-Mail bereits verwendet.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (tenant_id, first_name, last_name, email, role, password_hash, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id, first_name, last_name, email, role, is_active, created_at`,
      [tenant_id || req.user!.tenant_id, first_name, last_name, email, role || 'employee', passwordHash]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Server error creating user' });
  }
});

app.patch('/api/users/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { tenant_id } = req.user!;

    let setClauses = [];
    let values = [];
    let i = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (['first_name', 'last_name', 'email', 'role', 'is_active'].includes(key)) {
        setClauses.push(`${key} = $${i}`);
        values.push(value);
        i++;
      }
    }

    if (setClauses.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });

    values.push(id);
    values.push(tenant_id);

    const query = `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${i-1} AND tenant_id = $${i} RETURNING id, first_name, last_name, email, role, is_active, created_at`;
    
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Server error updating user' });
  }
});

// Admin Route: Delete User & associated company
app.delete('/api/users/:id', authenticateToken, authorizeRole('admin'), async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  const { tenant_id } = req.user!;

  try {
    // Start transaction
    await pool.query('BEGIN');

    // 1. Find the company associated with this user
    const contactRes = await pool.query('SELECT company_id FROM contacts WHERE user_id = $1', [id]);
    
    // 2. Delete the user (this cascades to contacts in a proper schema, but we do it manually to be safe)
    await pool.query('DELETE FROM contacts WHERE user_id = $1', [id]);
    
    // 3. Delete the tickets associated with the user
    await pool.query('DELETE FROM tickets WHERE customer_id = $1', [id]);
    
    // 4. Delete the company if one was found
    if (contactRes.rows.length > 0 && contactRes.rows[0].company_id) {
      await pool.query('DELETE FROM companies WHERE id = $1 AND tenant_id = $2', [contactRes.rows[0].company_id, tenant_id]);
    }

    // 5. Finally, delete the user
    const userRes = await pool.query('DELETE FROM users WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenant_id]);
    
    if (userRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
    }

    await pool.query('COMMIT');
    res.json({ success: true, message: 'Benutzer und Firma erfolgreich gelöscht' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Server error deleting user' });
  }
});

// Admin Route: Approve User
app.post('/api/admin/users/:id/approve', authenticateToken, authorizeRole('admin', 'manager'), async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;

  try {
    const userResult = await pool.query('UPDATE users SET is_active = true WHERE id = $1 RETURNING tenant_id, email, first_name, last_name', [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden.' });
    }

    const { tenant_id, email, first_name, last_name } = userResult.rows[0];

    // Check if a company already exists for this user (created during registration)
    const existingContact = await pool.query('SELECT company_id FROM contacts WHERE user_id = $1', [id]);
    let companyId = existingContact.rows.length > 0 ? existingContact.rows[0].company_id : null;

    if (!companyId) {
      // No company was created during registration - create one now
      const companyResult = await pool.query(
        'INSERT INTO companies (tenant_id, name, is_active) VALUES ($1, $2, true) RETURNING id',
        [tenant_id, `${first_name} ${last_name}`]
      );
      companyId = companyResult.rows[0].id;

      // Link the contact to this new company
      await pool.query('UPDATE contacts SET company_id = $1 WHERE user_id = $2', [companyId, id]);
    }

    // Close the related registration ticket if exists
    await pool.query("UPDATE tickets SET status = 'closed' WHERE customer_id = $1 AND category = 'registration'", [id]);

    // Send Approval Email (Try-catch to prevent blocking approval if SMTP is not configured)
    try {
      await resend.emails.send({
        from: EMAIL_INFO,
        to: [email],
        subject: 'Dein Konto wurde freigeschaltet!',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Willkommen bei HED-IT, ${first_name}!</h2>
            <p>Dein Konto wurde erfolgreich geprüft und freigeschaltet.</p>
            <p>Du kannst dich jetzt im Kundenportal einloggen und alle Funktionen nutzen.</p>
            <a href="https://hed-it.ch/login" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Zum Login</a>
            <p>Viel Spaß!</p>
            <p>Dein HED-IT Team</p>
          </div>
        `
      });
    } catch (mailError) {
      console.error('Failed to send approval email:', mailError);
      // We don't throw here, because the user is already activated in the DB.
    }

    res.status(200).json({ success: true, message: 'Benutzer erfolgreich freigeschaltet.' });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ success: false, error: 'Fehler bei der Freischaltung' });
  }
});

// Admin Route: Reject User
app.post('/api/admin/users/:id/reject', authenticateToken, authorizeRole('admin', 'manager'), async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;

  try {
    // Fetch user info before deletion for the email
    const userResult = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [id]);
    
    if (userResult.rows.length > 0) {
      const { email, first_name } = userResult.rows[0];
      
      // Send Rejection Email
      try {
        await resend.emails.send({
          from: EMAIL_INFO,
          to: [email],
          subject: 'Information zu deiner Registrierung bei HED-IT',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hallo ${first_name},</h2>
              <p>Vielen Dank für dein Interesse an unserem Kundenportal.</p>
              <p>Leider konnten wir deine Registrierung nach einer internen Prüfung aktuell nicht freischalten.</p>
              <p>Solltest du Fragen dazu haben, kannst du uns gerne unter info@hed-it.ch kontaktieren.</p>
              <p>Beste Grüße,<br>Dein HED-IT Team</p>
            </div>
          `
        });
      } catch (mailError) {
        console.error('Failed to send rejection email:', mailError);
      }
    }

    // Delete all associated tickets first (to avoid foreign key errors)
    await pool.query('DELETE FROM tickets WHERE customer_id = $1', [id]);

    // Delete user and all associated data (contacts, etc.)
    await pool.query('DELETE FROM contacts WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM users WHERE id = $1 AND is_active = false', [id]);

    res.status(200).json({ success: true, message: 'Registrierung abgelehnt und Benutzer gelöscht.' });
  } catch (error) {
    console.error('Rejection error:', error);
    res.status(500).json({ success: false, error: 'Fehler bei der Ablehnung' });
  }
});

// Admin Route: Reset 2FA for a user
app.post('/api/admin/users/:id/reset-2fa', authenticateToken, authorizeRole('admin'), async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1', [id]);
    res.json({ success: true, message: '2FA wurde zurückgesetzt. Der User muss es beim nächsten Mal neu einrichten.' });
  } catch (error) {
    console.error('2FA reset error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Zurücksetzen von 2FA' });
  }
});

// 2FA: Verify during login
app.post('/api/auth/2fa/login-verify', async (req: express.Request, res: express.Response) => {
  const { userId, code } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    
    const user = userResult.rows[0];
    const isValid = await verify({ token: code, secret: user.two_factor_secret });
    
    if (!isValid) return res.status(401).json({ success: false, error: 'Ungültiger 2FA Code' });

    // Store device info
    const userAgent = req.headers['user-agent'] || 'Unbekanntes Gerät';
    await pool.query('UPDATE users SET last_device = $1 WHERE id = $2', [userAgent, user.id]);

    const token = jwt.sign(
      { 
        id: user.id, 
        tenant_id: user.tenant_id, 
        role: user.role, 
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ success: true, token, user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name } });
  } catch (error) {
    res.status(500).json({ success: false, error: '2FA verification failed' });
  }
});

// 2FA: Setup (Request secret and QR)
app.post('/api/auth/2fa/setup', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { id, email } = req.user!;
  const secret = generateSecret();
  // Set service name and user email for better app identification
  const otpauth = generateURI({ secret, label: email, issuer: 'HED-IT' });
  
  try {
    const qrCodeUrl = await QRCode.toDataURL(otpauth);
    // Store secret temporarily but don't enable yet
    await pool.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [secret, id]);
    res.json({ success: true, qrCodeUrl, secret });
  } catch (error) {
    console.error('2FA Setup Error:', error);
    res.status(500).json({ success: false, error: '2FA Setup failed' });
  }
});

// 2FA: Enable (Verify first code)
app.post('/api/auth/2fa/enable', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.user!;
  const { code } = req.body;
  try {
    const userResult = await pool.query('SELECT two_factor_secret FROM users WHERE id = $1', [id]);
    const secret = userResult.rows[0].two_factor_secret;
    
    const isValid = await verify({ token: code, secret });
    if (!isValid) return res.status(400).json({ success: false, error: 'Ungültiger Code' });
    
    await pool.query('UPDATE users SET two_factor_enabled = true WHERE id = $1', [id]);
    res.json({ success: true, message: '2FA erfolgreich aktiviert' });
  } catch (error) {
    console.error('2FA Enable Error:', error);
    res.status(500).json({ success: false, error: 'Failed to enable 2FA' });
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
      { 
        id: user.id, 
        tenant_id: user.tenant_id, 
        role: user.role, 
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
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

app.post('/api/tickets/:id/comments', authenticateToken, async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const body = req.body.body || req.body.message;
  const { is_internal } = req.body;
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user!.id;
  const tenant_id = authReq.user!.tenant_id;

  if (!body) {
    return res.status(400).json({ success: false, error: 'Message body is required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, message, is_internal)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, userId, body, is_internal || false]
    );
    // Also update ticket updated_at
    await pool.query(`UPDATE tickets SET updated_at = NOW() WHERE id = $1`, [id]);

    // Notify customer if message is from staff and NOT internal
    if (!is_internal && authReq.user!.role !== 'customer') {
      const ticketInfo = await pool.query(`
        SELECT t.title, u.email, u.first_name 
        FROM tickets t JOIN users u ON t.customer_id = u.id 
        WHERE t.id = $1`, [id]);
      
      if (ticketInfo.rows.length > 0) {
        const { email, first_name, title } = ticketInfo.rows[0];
        if (email && email.includes('@')) {
          try {
            await resend.emails.send({
              from: EMAIL_INFO,
              to: [email],
              subject: `Update zu Ihrem Ticket: ${title}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h3>Hallo ${first_name},</h3>
                <p>Es gibt eine neue Nachricht zu Ihrem Ticket <b>"${title}"</b>.</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  ${body}
                </div>
                <a href="https://hed-it.ch/portal/tickets" style="display: inline-block; padding: 12px 24px; background: #00f2ff; color: #000; text-decoration: none; border-radius: 8px; font-weight: bold;">Im Portal antworten</a>
              </div>
            `
          });
        } catch (err) { console.error('Failed to send ticket update mail:', err); }
      }
    }
}

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
            // Only notify if the sender is NOT the customer themselves
            if (ticket.customer_id !== userId) {
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
      WHERE (user_id = $1 OR target_role = $2 OR (target_role = 'admin' AND ($2 = 'admin' OR $2 = 'manager')) OR (target_role = 'manager' AND ($2 = 'admin' OR $2 = 'manager')))
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
    const docCount = await pool.query('SELECT COUNT(*) FROM files WHERE entity_type = \'company\' AND entity_id = $1', [id]);
    
    res.status(200).json({ success: true, data: { 
      company: company.rows[0], 
      tickets: tickets.rows, 
      invoices: invoices.rows, 
      contracts: contracts.rows, 
      contacts: contacts.rows,
      documentCount: parseInt(docCount.rows[0].count || '0')
    } });
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

app.patch('/api/tickets/:id', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  const { tenant_id } = req.user!;
  console.log(`[DEBUG] Updating ticket ${id} for tenant ${tenant_id}. Body:`, req.body);
  
  try {
    let setClauses = [];
    let values = [];
    let i = 1;

    // Allowed fields to update
    const allowedFields = ['status', 'priority', 'assignee_id', 'title', 'description', 'type', 'company_id', 'customer_id'];

    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${i}`);
        // Convert empty string to null for UUID fields
        if (['assignee_id', 'company_id', 'customer_id'].includes(key) && value === '') {
          values.push(null);
        } else {
          values.push(value);
        }
        i++;
      }
    }

    if (setClauses.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });

    setClauses.push(`updated_at = NOW()`);
    values.push(id);
    
    let query;
    if (req.user!.role === 'admin') {
      query = `UPDATE tickets SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`;
    } else {
      values.push(tenant_id);
      query = `UPDATE tickets SET ${setClauses.join(', ')} WHERE id = $${i} AND (tenant_id = $${i+1} OR tenant_id IS NULL) RETURNING *`;
    }

    console.log(`[DEBUG] Executing query: ${query} with values:`, values);
    
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Ticket not found or unauthorized' });
    
    // Notification + email for assignment change
    const newAssigneeId = req.body.assignee_id;
    if (newAssigneeId && typeof newAssigneeId === 'string') {
      const ticket = result.rows[0];
      await createNotification({
        tenant_id: ticket.tenant_id,
        user_id: newAssigneeId,
        type: 'ticket',
        entity_id: id,
        title: 'Ticket zugewiesen',
        message: `Das Ticket #${id.substring(0,6).toUpperCase()} "${ticket.title}" wurde Ihnen zugewiesen.`,
        priority: ticket.priority === 'critical' ? 'critical' : 'high',
        link: `/tickets/${id}`
      });

      try {
        const assigneeRes = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [newAssigneeId]);
        if (assigneeRes.rows.length > 0 && assigneeRes.rows[0].email) {
          const { email: assigneeEmail, first_name } = assigneeRes.rows[0];
          const priorityLabel: Record<string, string> = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' };
          await resend.emails.send({
            from: 'HED-IT <info@hed-it.ch>',
            to: assigneeEmail,
            subject: `Ticket zugewiesen: ${ticket.title}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
                <div style="background:#1e3a5f;padding:28px 32px">
                  <h2 style="color:#fff;margin:0;font-size:20px">HED-IT Ticketsystem</h2>
                  <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Ticket-Zuweisung</p>
                </div>
                <div style="padding:32px">
                  <p style="margin:0 0 16px">Hallo ${first_name || 'Team'},</p>
                  <p style="margin:0 0 24px;color:#334155">Das folgende Ticket wurde Ihnen zugewiesen:</p>
                  <div style="background:#f8fafc;border-left:4px solid #1e3a5f;border-radius:4px;padding:20px;margin-bottom:24px">
                    <p style="margin:0 0 8px;font-weight:700;font-size:16px">${ticket.title}</p>
                    <p style="margin:0;color:#64748b;font-size:13px">Priorität: <strong>${priorityLabel[ticket.priority] || ticket.priority}</strong></p>
                    ${ticket.description ? `<p style="margin:12px 0 0;font-size:13px;color:#64748b">${ticket.description}</p>` : ''}
                  </div>
                  <a href="https://hed-it.ch/tickets/${id}" style="display:inline-block;background:#1e3a5f;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px">Ticket öffnen →</a>
                </div>
                <div style="background:#f1f5f9;padding:16px 32px;text-align:center;font-size:11px;color:#94a3b8">
                  HED-IT GmbH · Automatische Benachrichtigung · Bitte nicht antworten
                </div>
              </div>`
          });
        }
      } catch (emailErr) {
        console.error('Failed to send assignee email:', emailErr);
      }
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

app.post('/api/tickets', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { title, description, status, priority, type, company_id, customer_id, assignee_id } = req.body;
  const { tenant_id: userTenantId, id: userId } = req.user!;
  
  // Use tenant_id from token if not provided in body (safer)
  const tenant_id = req.body.tenant_id || userTenantId;

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

    // INTERNAL EMAIL NOTIFICATION
    try {
      await resend.emails.send({
        from: EMAIL_INFO,
        to: [EMAIL_ADMIN_INTERNAL],
        subject: `NEUES TICKET: ${title}`,
        html: `
          <div style="font-family: sans-serif;">
            <h2>Ein neues Ticket wurde erstellt</h2>
            <p><strong>Titel:</strong> ${title}</p>
            <p><strong>Priorität:</strong> ${priority || 'normal'}</p>
            <p><strong>Beschreibung:</strong> ${description || 'Keine'}</p>
            <a href="https://tool.hed-it.ch/tickets/${result.rows[0].id}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Ticket öffnen</a>
          </div>
        `
      });
    } catch (err) { console.error('Failed to send internal ticket notification:', err); }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ success: false, error: 'Server error creating ticket' });
  }
});

// ─── Public Inquiry Route (from hed-it-web) ──────────────────────────────────
app.post('/api/public/inquiry', upload.single('pdf'), async (req: express.Request, res: express.Response) => {
  const { subject, details, customer } = req.body;
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  // Check if user is logged in
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as any;
      userId = decoded.id;
    } catch (e) {}
  }
  
  try {
    // 1. Get first tenant
    const tenantResult = await pool.query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) return res.status(500).json({ success: false, error: 'No tenant found' });
    const tenant_id = tenantResult.rows[0].id;

    // 2. Create Ticket
    const ticketResult = await pool.query(
      `INSERT INTO tickets (tenant_id, title, description, status, priority, type) 
       VALUES ($1, $2, $3, 'new', 'medium', 'support') RETURNING *`,
      [tenant_id, subject, details || 'Keine Details angegeben']
    );
    const ticketId = ticketResult.rows[0].id;

    // 3. Attach PDF if present
    if (req.file) {
      let companyId: string | null = null;
      if (userId) {
        const cRes = await pool.query('SELECT company_id FROM contacts WHERE user_id = $1', [userId]);
        companyId = cRes.rows[0]?.company_id;
      }

      await pool.query(
        `INSERT INTO files (tenant_id, file_name, file_path, file_type, file_size, entity_type, entity_id, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [tenant_id, req.file.originalname, `/uploads/${req.file.filename}`, req.file.mimetype, req.file.size, companyId ? 'company' : 'ticket', companyId || ticketId, userId]
      );
    }

    // 4. Create Notification
    await createNotification({
      tenant_id: tenant_id,
      target_role: 'admin',
      type: 'ticket',
      entity_id: ticketId,
      title: 'Neue Web-Anfrage',
      message: `Eine neue Anfrage "${subject}" wurde über die Webseite gesendet.`,
      priority: 'normal',
      link: `/tickets/${ticketId}`
    });

    // INTERNAL EMAIL NOTIFICATION
    try {
      await resend.emails.send({
        from: EMAIL_INFO,
        to: [EMAIL_ADMIN_INTERNAL],
        subject: `WEB-ANFRAGE: ${subject}`,
        html: `
          <div style="font-family: sans-serif;">
            <h2>Neue Anfrage über die Webseite</h2>
            <p><strong>Betreff:</strong> ${subject}</p>
            <p><strong>Details:</strong> ${details || 'Keine'}</p>
            <a href="https://tool.hed-it.ch/tickets/${ticketId}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Zum Ticket</a>
          </div>
        `
      });
    } catch (err) { console.error('Failed to send internal inquiry notification:', err); }

    res.status(201).json({ success: true, ticketId });
  } catch (error) {
    console.error('Public inquiry error:', error);
    res.status(500).json({ success: false, error: 'Failed to process inquiry' });
  }
});

// --- Signature & Automated Billing ---
app.post('/api/portal/sign-proposal', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id: userId } = req.user!;
    const { documentId, totalAmount, projectName } = req.body;
    
    const companyId = await getCompanyId(userId);
    if (!companyId) return res.status(403).json({ success: false, error: 'No company association found' });

    // 1. Mark document as signed in metadata
    await pool.query('UPDATE files SET metadata = jsonb_set(COALESCE(metadata, \'{}\'), \'{signed}\', \'"true"\'::jsonb) WHERE id = $1', [documentId]);

    // 2. Create Deposit Invoice (50%)
    const depositAmount = parseFloat(totalAmount) * 0.5;
    const invResult = await pool.query(
      `INSERT INTO invoices (tenant_id, company_id, title, amount, status, issue_date, due_date, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL \'14 days\', NOW()) RETURNING *`,
      [req.user!.tenant_id, companyId, `Anzahlung (50%): ${projectName}`, depositAmount, 'open']
    );

    // 3. Create Ticket for Admin
    await pool.query(
      'INSERT INTO tickets (tenant_id, title, description, company_id, status, priority) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user!.tenant_id, `Projekt signiert: ${projectName}`, `Kunde hat das Angebot signiert. Anzahlung wurde generiert (INV-${invResult.rows[0].id.substring(0,6).toUpperCase()}).`, companyId, 'new', 'critical']
    );

    // 4. Notify Customer
    await resend.emails.send({
      from: EMAIL_INFO,
      to: [req.user!.email],
      subject: `Projekt gestartet: ${projectName}`,
      html: `<h3>Vielen Dank für Ihr Vertrauen!</h3><p>Sie haben das Projekt <b>${projectName}</b> erfolgreich signiert. Wir starten nun mit der Vorbereitung.</p><p>Die Anzahlungsrechnung (50%) finden Sie ab sofort in Ihrem Portal.</p>`
    });

    res.json({ success: true, invoice: invResult.rows[0] });
  } catch (error) {
    console.error('Signature error:', error);
    res.status(500).json({ success: false, error: 'Server error during signature' });
  }
});

// --- Swiss QR Helper ---
const generateSwissQR = async (amount: number, iban: string, reference: string, recipient: any) => {
  // ISO 20022 Swiss QR Format (SPC)
  const spc = [
    'SPC', // Type
    '0200', // Version
    '1', // Coding
    iban.replace(/\s/g, ''), // Account
    'S', // Recipient Type (Service)
    recipient.name,
    recipient.address,
    recipient.zip + ' ' + recipient.city,
    '', // Empty
    '', // Empty
    'CH', // Country
    '', // Unused
    '', // Unused
    '', // Unused
    '', // Unused
    '', // Unused
    '', // Unused
    amount.toFixed(2),
    'CHF',
    'S', // Debtor Type
    'Kunde Name',
    'Strasse 1',
    '8000 Zürich',
    '', // Empty
    '', // Empty
    'CH',
    'NON', // Ref Type
    '', // Ref
    `INV-${reference}`, // Unstructured Msg
    'EPD' // End
  ].join('\r\n');

  return await QRCode.toDataURL(spc, { 
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 200
  });
};

app.get('/api/invoices/:id/pdf', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const inv = await pool.query('SELECT i.*, c.name as company_name FROM invoices i JOIN companies c ON i.company_id = c.id WHERE i.id = $1', [id]);
    if (inv.rowCount === 0) return res.status(404).send('Invoice not found');
    
    const invoice = inv.rows[0];
    const doc = new jsPDF() as any;
    
    // Header & Design
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('HED-IT RECHNUNG', 20, 25);
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.text(`RECHNUNGS-NR: INV-${invoice.id.substring(0,8).toUpperCase()}`, 140, 55);
    doc.text(`DATUM: ${new Date(invoice.issue_date).toLocaleDateString('de-CH')}`, 140, 60);
    
    doc.setFontSize(12);
    doc.text('EMPFÄNGER:', 20, 70);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.company_name, 20, 76);
    
    // Table
    autoTable(doc as any, {
      startY: 90,
      head: [['Beschreibung', 'Betrag']],
      body: [[invoice.title, `CHF ${parseFloat(invoice.amount).toFixed(2)}`]],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] }
    });
    
    // QR Bill Section (Bottom)
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.line(0, 200, 210, 200); // Perforation line
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Zahlteil', 5, 205);
    doc.text('Empfangsschein', 140, 205);
    
    const qrData = await generateSwissQR(
      parseFloat(invoice.amount), 
      'CH00 0000 0000 0000 0000 0', // TEST IBAN
      invoice.id.substring(0,8),
      { name: 'HED-IT Joel Hediger', address: 'Teststrasse 1', zip: '8000', city: 'Zürich' }
    );
    
    doc.addImage(qrData, 'PNG', 5, 210, 45, 45);
    
    doc.setFontSize(8);
    doc.text('Konto / Zahlbar an:', 55, 215);
    doc.setFont('helvetica', 'normal');
    doc.text('CH00 0000 0000 0000 0000 0\nHED-IT Joel Hediger\n8000 Zürich', 55, 220);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Währung / Betrag:', 55, 240);
    doc.text('CHF ' + parseFloat(invoice.amount).toFixed(2), 55, 245);
    
    const pdfOutput = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(pdfOutput));
  } catch (error) {
    console.error('PDF error:', error);
    res.status(500).send('Error generating PDF');
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
      [tenant_id, company_id || null, title, amount || 0, status || 'draft', due_date || null]
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

    // Send email to customer when invoice is "sent" (not draft)
    if (status === 'sent' && company_id) {
      try {
        const contactRes = await pool.query(
          `SELECT email, first_name FROM contacts WHERE company_id = $1 AND email IS NOT NULL ORDER BY is_primary DESC LIMIT 1`,
          [company_id]
        );
        if (contactRes.rows.length > 0 && contactRes.rows[0].email) {
          const { email: custEmail, first_name } = contactRes.rows[0];
          const invoice = result.rows[0];
          const amountFmt = parseFloat(amount || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 });
          const dueFmt = due_date ? new Date(due_date).toLocaleDateString('de-CH') : 'N/A';
          await resend.emails.send({
            from: 'HED-IT <info@hed-it.ch>',
            to: custEmail,
            subject: `Ihre Rechnung: ${title}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
                <div style="background:#1e3a5f;padding:28px 32px">
                  <h2 style="color:#fff;margin:0;font-size:20px">HED-IT GmbH</h2>
                  <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Ihre neue Rechnung</p>
                </div>
                <div style="padding:32px">
                  <p style="margin:0 0 16px">Hallo ${first_name || 'Kunde'},</p>
                  <p style="margin:0 0 24px;color:#334155">Eine neue Rechnung wurde für Sie erstellt. Sie können diese jederzeit im Kundenportal einsehen.</p>
                  <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #e2e8f0">
                    <div style="display:flex;justify-content:space-between;margin-bottom:12px">
                      <span style="color:#64748b;font-size:13px">Beschreibung:</span>
                      <span style="font-weight:700;font-size:13px">${title}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:12px">
                      <span style="color:#64748b;font-size:13px">Betrag:</span>
                      <span style="font-weight:800;font-size:16px;color:#1e3a5f">CHF ${amountFmt}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between">
                      <span style="color:#64748b;font-size:13px">Fälligkeitsdatum:</span>
                      <span style="font-weight:700;font-size:13px;color:#dc2626">${dueFmt}</span>
                    </div>
                  </div>
                  <a href="https://portal.hed-it.ch/portal/invoices" style="display:inline-block;background:#1e3a5f;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px">Rechnung im Portal ansehen →</a>
                </div>
                <div style="background:#f1f5f9;padding:16px 32px;text-align:center;font-size:11px;color:#94a3b8">
                  HED-IT GmbH · Bei Fragen: info@hed-it.ch · Bitte nicht auf diese E-Mail antworten
                </div>
              </div>`
          });
        }
      } catch (emailErr) {
        console.error('Failed to send invoice email:', emailErr);
      }
    }

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
  const { tenant_id, title, contract_number, contract_type, company_id, contact_id, assigned_to, start_date, end_date, notice_period_days, amount, billing_interval, status, notes, client_type, discount_percent, items } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO contracts (tenant_id, title, contract_number, contract_type, company_id, contact_id, assigned_to, start_date, end_date, notice_period_days, amount, billing_interval, status, notes, client_type, discount_percent, items)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
      [tenant_id, title, contract_number, contract_type, company_id, contact_id, assigned_to, start_date, end_date, notice_period_days, amount, billing_interval, status || 'pending_signature', notes, client_type, discount_percent || 0, JSON.stringify(items || [])]
    );

    const contract = result.rows[0];

    // Notification for new contract
    await createNotification({
      tenant_id: tenant_id,
      target_role: 'admin',
      type: 'contract',
      entity_id: contract.id,
      title: 'Neuer Vertrag',
      message: `Vertrag "${title}" wurde angelegt.`,
      link: `/contracts?openContract=${contract.id}`
    });

    // Send Email to Customer if company_id is provided
    if (company_id) {
      // Fallback: any contact with email if no primary found
      const contactRes = await pool.query(
        'SELECT email, first_name FROM contacts WHERE company_id = $1 AND email IS NOT NULL AND email != \'\' ORDER BY is_primary DESC LIMIT 1',
        [company_id]
      );
      const customerEmail = contactRes.rows[0]?.email;
      const customerName = contactRes.rows[0]?.first_name || 'Sehr geehrte Damen und Herren';

      const billingLabel = billing_interval === 'monthly' ? 'Monatlich' :
                           billing_interval === 'yearly' ? 'Jährlich' :
                           billing_interval === 'quarterly' ? 'Quartalsweise' :
                           billing_interval === 'one_time' ? 'Einmalig' : billing_interval;

      if (customerEmail) {
        await resend.emails.send({
          from: EMAIL_INFO,
          to: customerEmail,
          subject: `Ihr Vertrag wartet auf Ihre Unterschrift – ${title}`,
          html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0">
  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b">
    <tr><td style="padding:28px 40px">
      <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.5px">HED-IT</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:3px;letter-spacing:0.5px;text-transform:uppercase">Web & Marketing Solutions</div>
    </td></tr>
  </table>
  <!-- Hero -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#2563eb">
    <tr><td style="padding:24px 40px">
      <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:1px">Vertrag zur Unterschrift bereit</div>
    </td></tr>
  </table>
  <!-- Body -->
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:20px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <tr><td style="padding:40px">
        <p style="margin:0 0 24px;font-size:16px;color:#1e293b">Guten Tag <strong>${customerName}</strong>,</p>
        <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7">wir haben einen neuen Dienstleistungsvertrag für Sie vorbereitet. Bitte prüfen Sie die Details und signieren Sie den Vertrag digital in Ihrem Kundenportal.</p>

        <!-- Contract Box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:28px">
          <tr><td style="padding:20px 24px;border-bottom:1px solid #e2e8f0">
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px">Vertragsbezeichnung</div>
            <div style="font-size:18px;font-weight:800;color:#1e293b">${title}</div>
          </td></tr>
          <tr><td style="padding:16px 24px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;width:50%">
                  <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Betrag</div>
                  <div style="font-size:20px;font-weight:800;color:#2563eb">CHF ${parseFloat(amount).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</div>
                </td>
                <td style="padding:6px 0">
                  <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Abrechnungsintervall</div>
                  <div style="font-size:15px;font-weight:700;color:#1e293b">${billingLabel}</div>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>

        <!-- CTA -->
        <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:6px;background:#2563eb">
          <a href="https://portal.hed-it.ch/portal/contracts" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:0.2px">Jetzt Vertrag prüfen &amp; signieren →</a>
        </td></tr></table>

        <p style="margin:28px 0 0;font-size:12px;color:#94a3b8;line-height:1.6">Falls Sie Fragen haben, stehen wir Ihnen jederzeit zur Verfügung.<br>Kontaktieren Sie uns unter <a href="mailto:info@hed-it.ch" style="color:#2563eb;text-decoration:none">info@hed-it.ch</a></p>
      </td></tr>
    </table>
  </td></tr></table>
  <!-- Footer -->
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:24px 40px;text-align:center">
    <div style="font-size:12px;color:#94a3b8;line-height:1.8">
      <strong style="color:#64748b">HED-IT Joel Hediger</strong> | Web &amp; Marketing Solutions<br>
      <a href="mailto:info@hed-it.ch" style="color:#2563eb;text-decoration:none">info@hed-it.ch</a> &nbsp;·&nbsp; <a href="https://www.hed-it.ch" style="color:#2563eb;text-decoration:none">www.hed-it.ch</a><br>
      <span style="font-size:11px;color:#cbd5e1">© ${new Date().getFullYear()} HED-IT. Alle Rechte vorbehalten.</span>
    </div>
  </td></tr></table>
</td></tr></table>
</body></html>`
        }).catch(err => console.error('Error sending contract email:', err));
      }
    }

    res.status(201).json({ success: true, data: contract });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ success: false, error: 'Server error creating contract' });
  }
});

// ─── Products / Produkte Routes ───────────────────────────────────────────────

// Seed default product catalog for this tenant
app.post('/api/products/seed-defaults', authenticateToken, authorizeRole('admin'), async (req: AuthenticatedRequest, res: express.Response) => {
  const { tenant_id } = req.user!;
  try {
    // Ensure columns exist
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES products(id) ON DELETE SET NULL`);

    const existing = await pool.query('SELECT COUNT(*) FROM products WHERE tenant_id = $1', [tenant_id]);
    if (parseInt(existing.rows[0].count) > 0) {
      return res.json({ success: false, error: 'Produkte bereits vorhanden. Bitte zuerst alle löschen oder direkt hinzufügen.' });
    }

    const defaults = [
      // Webprojekte
      { name: 'Landing Page',            category: 'Webprojekte',     description: 'Einseitige Webseite',                              price: 1500,   recurring: false, unit: 'Projekt' },
      { name: 'Unternehmenswebseite',    category: 'Webprojekte',     description: 'Mehrseitige Website',                              price: 3500,   recurring: false, unit: 'Projekt' },
      { name: 'Webshop',                 category: 'Webprojekte',     description: 'Online-Shop mit Zahlungsabwicklung',               price: 8000,   recurring: false, unit: 'Projekt' },
      { name: 'Web Applikation',         category: 'Webprojekte',     description: 'Massgeschneiderte Web-App',                        price: 12000,  recurring: false, unit: 'Projekt' },
      { name: 'Mobile App',              category: 'Webprojekte',     description: 'Native iOS/Android App',                           price: 15000,  recurring: false, unit: 'Projekt' },
      // Design
      { name: 'Template Basiert',        category: 'Design',          description: 'Bewährte Vorlagen – im Basispreis inklusive',      price: 0,      recurring: false, unit: 'Pauschal' },
      { name: 'Individuelles Design',    category: 'Design',          description: 'Design nach Ihren Wünschen',                       price: 2000,   recurring: false, unit: 'Pauschal' },
      { name: 'Premium / 3D Design',     category: 'Design',          description: 'Hochwertige Animationen & 3D-Elemente',            price: 4500,   recurring: false, unit: 'Pauschal' },
      // Features
      { name: 'CMS Integration',         category: 'Features',        description: 'Inhalte selbst bearbeiten',                        price: 1600,   recurring: false, unit: 'Pauschal' },
      { name: 'SEO Optimierung',         category: 'Features',        description: 'Bessere Sichtbarkeit bei Google',                  price: 1200,   recurring: false, unit: 'Pauschal' },
      { name: 'Mehrsprachigkeit',        category: 'Features',        description: 'Website in mehreren Sprachen',                     price: 2100,   recurring: false, unit: 'Pauschal' },
      { name: 'Erweiterte Analyse',      category: 'Features',        description: 'Detaillierte Besucherstatistiken',                 price: 800,    recurring: false, unit: 'Pauschal' },
      { name: 'Newsletter Setup',        category: 'Features',        description: 'E-Mail Marketing Integration',                     price: 1200,   recurring: false, unit: 'Pauschal' },
      // Monthly services
      { name: 'SEO Paket Pro',           category: 'Monthly',         description: 'Optimierung für Top-Rankings bei Google',          price: 120,    recurring: true,  unit: 'Monat' },
      { name: 'Newsletter System',       category: 'Monthly',         description: 'E-Mail Marketing System inkl. Vorlagen',           price: 49,     recurring: true,  unit: 'Monat' },
      { name: 'Extended Security / WAF', category: 'Monthly',         description: 'WAF & DDoS Schutz mit 24/7 Überwachung',           price: 29,     recurring: true,  unit: 'Monat' },
      { name: 'Cloud Speicher 1TB',      category: 'Monthly',         description: 'Sicheres Cloud-Backup für Firmendaten',            price: 15,     recurring: true,  unit: 'Monat' },
      { name: 'Backup & Recovery',       category: 'Monthly',         description: 'Automatische Datensicherung & Wiederherstellung',  price: 29,     recurring: true,  unit: 'Monat' },
      { name: 'Microsoft 365 Lizenz',    category: 'Monthly',         description: 'Microsoft 365 Business Basic Lizenz',              price: 12.5,   recurring: true,  unit: 'Monat' },
      { name: 'Extended Support 24/7',   category: 'Monthly',         description: 'Rund-um-die-Uhr Support & Monitoring',             price: 49,     recurring: true,  unit: 'Monat' },
      { name: 'Wartung & Hosting',       category: 'Monthly',         description: 'Hosting, Updates, SSL & technische Wartung',       price: 39,     recurring: true,  unit: 'Monat' },
      // Hourly rates
      { name: 'Consulting / Stunde',     category: 'Dienstleistung',  description: 'Beratung & Konzeption',                           price: 120,    recurring: false, unit: 'Stunde' },
      { name: 'Entwicklung / Stunde',    category: 'Dienstleistung',  description: 'Umsetzung & Programmierung',                      price: 140,    recurring: false, unit: 'Stunde' },
      { name: 'Support / Stunde',        category: 'Dienstleistung',  description: 'Technischer Support',                             price: 95,     recurring: false, unit: 'Stunde' },
    ];

    for (const p of defaults) {
      await pool.query(
        `INSERT INTO products (tenant_id, name, category, description, price, tax_rate, unit, is_recurring, is_active)
         VALUES ($1, $2, $3, $4, $5, 8.1, $6, $7, true)`,
        [tenant_id, p.name, p.category, p.description, p.price, p.unit, p.recurring]
      );
    }

    res.json({ success: true, message: `${defaults.length} Standardprodukte wurden erfolgreich eingefügt.` });
  } catch (error) {
    console.error('Seed products error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Einfügen der Produkte.' });
  }
});

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

// Helper for cleaning UUIDs
const cleanUUID = (id: any) => (id && id !== 'null' && id !== '' && id !== 'undefined') ? id : null;

app.get('/api/files', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { tenant_id } = req.user!;
    const { parent_id, entity_type, entity_id } = req.query;

    console.log(`Fetching files for tenant ${tenant_id}, type=${entity_type}, id=${entity_id}, parent=${parent_id}`);

    let query = `SELECT * FROM files WHERE tenant_id = $1::UUID`;
    const params: any[] = [tenant_id];

    if (entity_type) {
      query += ` AND entity_type = $${params.length + 1}`;
      params.push(entity_type);
    }
    
    const cleanEntityId = cleanUUID(entity_id);
    if (cleanEntityId) {
      query += ` AND entity_id = $${params.length + 1}::UUID`;
      params.push(cleanEntityId);
    }

    const cleanParentId = cleanUUID(parent_id);
    if (!cleanParentId) {
      query += ` AND parent_id IS NULL`;
    } else {
      query += ` AND parent_id = $${params.length + 1}::UUID`;
      params.push(cleanParentId);
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
  
  console.log(`Creating folder: ${name} for tenant ${tenant_id}`);
  
  try {
    const result = await pool.query(
      `INSERT INTO files (tenant_id, file_name, is_folder, parent_id, entity_type, entity_id, uploaded_by, file_type)
       VALUES ($1::UUID, $2, true, $3::UUID, $4, $5::UUID, $6::UUID, 'folder') RETURNING *`,
      [
        tenant_id, 
        name, 
        cleanUUID(parent_id), 
        entity_type || 'general', 
        cleanUUID(entity_id), 
        userId
      ]
    );
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

  try {
    const result = await pool.query(
      `INSERT INTO files (tenant_id, file_name, file_path, file_type, file_size, is_folder, parent_id, entity_type, entity_id, uploaded_by)
       VALUES ($1::UUID, $2, $3, $4, $5, false, $6::UUID, $7, $8::UUID, $9::UUID) RETURNING *`,
      [
        tenant_id, 
        req.file.originalname, 
        `/uploads/${req.file.filename}`, 
        req.file.mimetype, 
        req.file.size,
        cleanUUID(parent_id),
        entity_type || 'general',
        cleanUUID(entity_id),
        userId
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });

    // --- Email Notification ---
    try {
      const isCustomerUpload = req.user!.role === 'customer' || req.user!.role === 'client';
      const fileName = req.file.originalname;

      if (isCustomerUpload) {
        // Notify Admin
        await resend.emails.send({
          from: EMAIL_INFO,
          to: [EMAIL_ADMIN_INTERNAL],
          subject: `Neues Dokument von Kunde: ${fileName}`,
          html: `<h3>Dokumenten-Upload</h3><p>Der Kunde <b>${req.user!.email}</b> hat ein neues Dokument hochgeladen: <b>${fileName}</b></p>`
        });
      } else if (entity_type === 'company' && entity_id) {
        // Notify Customer Contacts
        const contactsResult = await pool.query('SELECT email, first_name FROM contacts WHERE company_id = $1 AND email IS NOT NULL', [entity_id]);
        for (const contact of contactsResult.rows) {
          await resend.emails.send({
            from: EMAIL_INFO,
            to: [contact.email],
            subject: `Neues Dokument für Sie verfügbar: ${fileName}`,
            html: `<h3>Hallo ${contact.first_name}</h3><p>Wir haben ein neues Dokument für Sie im Portal hochgeladen: <b>${fileName}</b></p><p>Sie finden es ab sofort in Ihrem Dokumenten-Center.</p><br><a href="https://portal.hed-it.ch/portal/documents">Zum Portal</a>`
          });
        }
      }
    } catch (mailErr) {
      console.error('Failed to send upload notification email:', mailErr);
    }
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

    // 1. User Productivity Ranking
    const performance = await pool.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.email,
        (SELECT COUNT(*) FROM tickets t WHERE t.assignee_id = u.id AND t.status IN ('closed', 'resolved') AND t.updated_at >= NOW() - INTERVAL '${interval}') as resolved_tickets,
        (SELECT COUNT(*) FROM projects p WHERE p.assigned_to = u.id AND p.status = 'completed' AND p.updated_at >= NOW() - INTERVAL '${interval}') as completed_projects,
        (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600)::numeric, 1) FROM tickets t WHERE t.assignee_id = u.id AND t.status IN ('closed', 'resolved') AND t.updated_at >= NOW() - INTERVAL '${interval}') as avg_resolution_hours
      FROM users u
      WHERE u.tenant_id = $1 AND u.is_active = true AND u.role != 'customer'
      ORDER BY resolved_tickets DESC, completed_projects DESC
    `, [tenant_id]);

    // 2. Ticket Status Distribution for Chart
    const statusStats = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM tickets 
      WHERE tenant_id = $1 AND updated_at >= NOW() - INTERVAL '${interval}'
      GROUP BY status
    `, [tenant_id]);

    // 3. Monthly Trend
    const trend = await pool.query(`
      SELECT 
        TO_CHAR(updated_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM tickets
      WHERE tenant_id = $1 AND status IN ('closed', 'resolved') AND updated_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(updated_at, 'YYYY-MM')
      ORDER BY month ASC
    `, [tenant_id]);

    res.json({ 
      success: true, 
      data: {
        ranking: performance.rows,
        statusDistribution: statusStats.rows,
        trend: trend.rows
      }
    });
  } catch (error) {
    console.error('Performance Report Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});




// ─── Timeline (aggregated activity feed) ──────────────────────────────────────
app.get('/api/timeline', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { tenant_id } = req.user!;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await pool.query(`
      SELECT * FROM (
        SELECT id, company_id, 'ticket_created' as event_type, title, description, id as related_id, created_at
        FROM tickets WHERE tenant_id = $1
        UNION ALL
        SELECT id, company_id, 'contract_signed' as event_type, title, NULL as description, id as related_id, updated_at as created_at
        FROM contracts WHERE tenant_id = $1 AND status IN ('active', 'pending_signature')
        UNION ALL
        SELECT id, company_id, 'invoice_sent' as event_type,
          'Rechnung ' || invoice_number as title, NULL as description, id as related_id, issue_date::timestamptz as created_at
        FROM invoices WHERE tenant_id = $1
      ) events
      ORDER BY created_at DESC
      LIMIT $2
    `, [tenant_id, limit]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── Settings Routes ─────────────────────────────────────────────────────────

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


// Database migrations are now handled in the startup logic at the top of this file.



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
const getCompanyId = async (userId: string): Promise<string | null> => {
  // 1. contacts.user_id
  const contactRow = await pool.query('SELECT company_id FROM contacts WHERE user_id=$1 AND company_id IS NOT NULL LIMIT 1', [userId]);
  if (contactRow.rows[0]?.company_id) return contactRow.rows[0].company_id;

  // 2. match by email (fallback for accounts not yet linked to a contact)
  const userRow = await pool.query('SELECT email FROM users WHERE id=$1', [userId]);
  const email = userRow.rows[0]?.email;
  if (email) {
    const emailRow = await pool.query('SELECT company_id FROM contacts WHERE email=$1 AND company_id IS NOT NULL LIMIT 1', [email]);
    if (emailRow.rows[0]?.company_id) return emailRow.rows[0].company_id;
  }
  return null;
};

app.get('/api/portal/dashboard', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id: userId } = req.user!;
    const company_id = req.user!.company_id || await getCompanyId(userId);

    const [tickets, projects, offers, invoices, contracts] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM tickets WHERE customer_id = $1 AND status NOT IN ('resolved', 'closed')", [userId as string]),
      company_id ? pool.query("SELECT COUNT(*) FROM projects WHERE company_id = $1 AND status = 'in_progress'", [company_id]) : Promise.resolve({ rows: [{ count: '0' }] }),
      company_id ? pool.query("SELECT COUNT(*) FROM offers WHERE company_id = $1 AND status = 'sent'", [company_id]) : Promise.resolve({ rows: [{ count: '0' }] }),
      company_id ? pool.query("SELECT COUNT(*) FROM invoices WHERE company_id = $1 AND status IN ('open', 'overdue')", [company_id]) : Promise.resolve({ rows: [{ count: '0' }] }),
      company_id ? pool.query("SELECT COUNT(*) FROM contracts WHERE company_id = $1 AND status = 'active'", [company_id]) : Promise.resolve({ rows: [{ count: '0' }] }),
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
  const message = req.body.message || req.body.body;
  const { id: userId, tenant_id, firstName, lastName } = req.user!;

  try {
    // Check if ticket belongs to user
    const check = await pool.query('SELECT id, assignee_id, title FROM tickets WHERE id = $1 AND customer_id = $2', [id, userId]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const result = await pool.query(
      'INSERT INTO ticket_messages (ticket_id, sender_id, message, is_internal) VALUES ($1, $2, $3, FALSE) RETURNING *',
      [id, userId, message]
    );

    // Notify assignee via internal notification & Email
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

        // Send Email to Assignee
        const assignee = await pool.query('SELECT email FROM users WHERE id = $1', [check.rows[0].assignee_id]);
        if (assignee.rows.length > 0 && assignee.rows[0].email && assignee.rows[0].email.includes('@')) {
          try {
            await resend.emails.send({
              from: EMAIL_INFO,
              to: [assignee.rows[0].email],
              subject: `Kunden-Antwort: ${check.rows[0].title}`,
              html: `<p>Der Kunde <b>${firstName} ${lastName}</b> hat auf das Ticket "${check.rows[0].title}" geantwortet:</p><p><i>${message}</i></p><a href="https://tool.hed-it.ch/tickets/${id}">Im Admin-Tool ansehen</a>`
            });
          } catch (err) { console.error('Failed to send mail to staff:', err); }
        }
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/portal/tickets/:id/attachments', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  const { id: userId, tenant_id, firstName, lastName } = req.user!;
  const file = req.file;

  if (!file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  try {
    const attachmentUrl = `/uploads/${file.filename}`;
    const attachmentName = file.originalname;

    const result = await pool.query(
      'INSERT INTO ticket_messages (ticket_id, sender_id, message, is_internal, attachment_url, attachment_name) VALUES ($1, $2, $3, FALSE, $4, $5) RETURNING *',
      [id, userId, `Anhang: ${attachmentName}`, attachmentUrl, attachmentName]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Attachment upload error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/portal/invoices', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id: userId } = req.user!;
    const companyId = await getCompanyId(userId);
    if (!companyId) return res.json({ success: true, data: [] });

    const result = await pool.query('SELECT * FROM invoices WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
    // Ensure amount is string/number for the frontend
    const cleaned = result.rows.map(r => ({ ...r, amount: r.amount || 0 }));
    res.json({ success: true, data: cleaned });
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
    const cleaned = result.rows.map(r => ({ ...r, status: r.status || 'sent' }));
    res.json({ success: true, data: cleaned });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/portal/projects', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id: userId } = req.user!;
    const companyId = await getCompanyId(userId);
    if (!companyId) return res.json({ success: true, data: [] });

    const result = await pool.query(
      `SELECT p.*,
        COALESCE(p.completion_percentage, 0) as completion_percentage
       FROM projects p
       WHERE p.company_id = $1
       ORDER BY p.created_at DESC`,
      [companyId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Portal projects error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/portal/contracts', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id: userId } = req.user!;
    const companyId = await getCompanyId(userId);
    if (!companyId) return res.json({ success: true, data: [] });

    // Fetch structured contracts with company name and items
    const contractsRes = await pool.query(
      `SELECT c.*, co.name as company_name FROM contracts c LEFT JOIN companies co ON c.company_id=co.id WHERE c.company_id = $1 ORDER BY c.start_date DESC`,
      [companyId]
    );

    // Fetch uploaded files linked to company (that might be contracts)
    const filesRes = await pool.query('SELECT *, \'file\' as source FROM files WHERE entity_type = \'company\' AND entity_id = $1 ORDER BY created_at DESC', [companyId]);

    // Merge them (structured first, then files)
    const merged = [
      ...contractsRes.rows.map(c => ({
        id: c.id,
        contract_number: c.contract_number || 'CON-' + c.id.substring(0, 8).toUpperCase(),
        name: c.service_name || c.name || c.title,
        title: c.title || c.service_name || c.name,
        type: c.type || 'Service',
        status: c.status,
        date: c.start_date || c.created_at,
        source: 'contract',
        monthly_value: c.monthly_price || c.amount || 0,
        payment_cycle: c.payment_cycle || c.billing_interval || 'Monatlich',
        items: c.items,
        company_name: c.company_name,
        discount_percent: c.discount_percent || 0,
        notes: c.notes,
        total: c.amount || 0,
        created_at: c.created_at,
      })),
      ...filesRes.rows.map(f => ({
        id: f.id,
        name: f.file_name,
        type: 'Dokument',
        status: 'active',
        date: f.created_at,
        source: 'file',
        path: f.file_path
      }))
    ];

    res.json({ success: true, data: merged });
  } catch (error) {
    console.error('Portal: Error fetching contracts/files:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/portal/contracts/:id/sign', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  const { signatureData } = req.body;

  try {
    const contractRes = await pool.query(
      `UPDATE contracts
       SET status = 'active', signature_data = $1, signature_date = NOW()
       WHERE id = $2 RETURNING *`,
      [signatureData, id]
    );

    if (contractRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    const contract = contractRes.rows[0];

    // Generate unique invoice number
    const invNumber = `RE-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;

    // Calculate due date based on billing_interval
    const issueDate = new Date();
    let dueDate = new Date();

    if (contract.billing_interval === 'monthly') {
      // Next 20th of month + 10 days payment term = 30th
      const now = new Date();
      const targetDay20 = new Date(now.getFullYear(), now.getMonth(), 20);
      if (now.getDate() >= 20) targetDay20.setMonth(targetDay20.getMonth() + 1);
      dueDate = new Date(targetDay20);
      dueDate.setDate(dueDate.getDate() + 10); // +10 days = 30th
    } else if (contract.billing_interval === 'yearly') {
      dueDate.setDate(dueDate.getDate() + 30);
    } else if (contract.billing_interval === 'quarterly') {
      dueDate.setDate(dueDate.getDate() + 30);
    } else {
      // one_time or anything else
      dueDate.setDate(dueDate.getDate() + 30);
    }

    const invoiceRes = await pool.query(
      `INSERT INTO invoices (tenant_id, company_id, invoice_number, title, amount, status, issue_date, due_date, contract_id, tax_rate)
       VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $8, 8.1) RETURNING *`,
      [
        contract.tenant_id,
        contract.company_id,
        invNumber,
        `Rechnung zu Vertrag: ${contract.title}`,
        contract.amount,
        issueDate,
        dueDate,
        contract.id
      ]
    );
    const invoice = invoiceRes.rows[0];

    // Notify admin in-app
    await createNotification({
      tenant_id: contract.tenant_id,
      target_role: 'admin',
      type: 'contract',
      entity_id: contract.id,
      title: 'Vertrag signiert',
      message: `Der Vertrag "${contract.title}" wurde vom Kunden signiert.`,
      link: `/contracts?openContract=${contract.id}`
    });

    // Fetch customer contact
    const contactRes = await pool.query(
      `SELECT email, first_name FROM contacts WHERE company_id = $1 AND email IS NOT NULL AND email != '' ORDER BY is_primary DESC LIMIT 1`,
      [contract.company_id]
    );
    const customerEmail = contactRes.rows[0]?.email;
    const customerName = contactRes.rows[0]?.first_name || 'Sehr geehrte Damen und Herren';

    const billingLabel = contract.billing_interval === 'monthly' ? 'Monatlich' :
                         contract.billing_interval === 'yearly' ? 'Jährlich' :
                         contract.billing_interval === 'quarterly' ? 'Quartalsweise' : 'Einmalig';

    const billingInfo = contract.billing_interval === 'monthly'
      ? 'Diese Rechnung erscheint monatlich am 20. des Monats und ist jeweils 10 Tage später fällig.'
      : contract.billing_interval === 'yearly'
      ? 'Diese Leistung wird jährlich in Rechnung gestellt.'
      : contract.billing_interval === 'quarterly'
      ? 'Diese Leistung wird quartalsweise in Rechnung gestellt.'
      : 'Diese Rechnung ist eine Einmalzahlung.';

    // Send confirmation email to customer
    if (customerEmail) {
      await resend.emails.send({
        from: EMAIL_INFO,
        to: customerEmail,
        subject: `Vertrag signiert – Rechnung ${invNumber}`,
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td>
  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b">
    <tr><td style="padding:28px 40px">
      <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.5px">HED-IT</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:3px;letter-spacing:0.5px;text-transform:uppercase">Web & Marketing Solutions</div>
    </td></tr>
  </table>
  <!-- Hero -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#16a34a">
    <tr><td style="padding:24px 40px">
      <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1px">✓ Vertrag erfolgreich signiert</div>
    </td></tr>
  </table>
  <!-- Body -->
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:20px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <tr><td style="padding:40px">
        <p style="margin:0 0 24px;font-size:16px;color:#1e293b">Guten Tag <strong>${customerName}</strong>,</p>
        <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7">vielen Dank! Ihr Vertrag wurde erfolgreich digital signiert. Nachfolgend finden Sie Ihre erste Rechnung.</p>

        <!-- Contract Box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:20px">
          <tr><td style="padding:16px 20px">
            <div style="font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px">Signierter Vertrag</div>
            <div style="font-size:16px;font-weight:800;color:#1e293b">${contract.title}</div>
            <div style="font-size:12px;color:#475569;margin-top:4px">Signiert am ${new Date().toLocaleDateString('de-CH')} um ${new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} Uhr</div>
          </td></tr>
        </table>

        <!-- Invoice Box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:28px">
          <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0">
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px">Rechnung erstellt</div>
            <div style="font-size:15px;font-weight:700;color:#1e293b">${invNumber}</div>
          </td></tr>
          <tr><td style="padding:16px 20px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0;width:33%">
                  <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Betrag</div>
                  <div style="font-size:20px;font-weight:800;color:#2563eb">CHF ${parseFloat(contract.amount).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</div>
                </td>
                <td style="padding:4px 0;width:33%">
                  <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Fällig am</div>
                  <div style="font-size:15px;font-weight:700;color:#1e293b">${dueDate.toLocaleDateString('de-CH')}</div>
                </td>
                <td style="padding:4px 0">
                  <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Intervall</div>
                  <div style="font-size:15px;font-weight:700;color:#1e293b">${billingLabel}</div>
                </td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:12px 20px;background:#fffbeb;border-top:1px solid #fde68a;border-radius:0 0 8px 8px">
            <div style="font-size:12px;color:#92400e">ℹ️ ${billingInfo}</div>
          </td></tr>
        </table>

        <!-- CTA -->
        <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:6px;background:#2563eb">
          <a href="https://portal.hed-it.ch/portal/invoices" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#fff;text-decoration:none">Rechnung im Portal ansehen →</a>
        </td></tr></table>

        <p style="margin:28px 0 0;font-size:12px;color:#94a3b8;line-height:1.6">Bei Fragen stehen wir Ihnen jederzeit zur Verfügung.<br><a href="mailto:info@hed-it.ch" style="color:#2563eb;text-decoration:none">info@hed-it.ch</a></p>
      </td></tr>
    </table>
  </td></tr></table>
  <!-- Footer -->
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:24px 40px;text-align:center">
    <div style="font-size:12px;color:#94a3b8;line-height:1.8">
      <strong style="color:#64748b">HED-IT Joel Hediger</strong> | Web &amp; Marketing Solutions<br>
      <a href="mailto:info@hed-it.ch" style="color:#2563eb;text-decoration:none">info@hed-it.ch</a> &nbsp;·&nbsp; <a href="https://www.hed-it.ch" style="color:#2563eb;text-decoration:none">www.hed-it.ch</a><br>
      <span style="font-size:11px;color:#cbd5e1">© ${new Date().getFullYear()} HED-IT. Alle Rechte vorbehalten.</span>
    </div>
  </td></tr></table>
</td></tr></table>
</body></html>`
      }).catch(err => console.error('Error sending signing confirmation email:', err));
    }

    // Notify admin by email
    await resend.emails.send({
      from: EMAIL_INFO,
      to: EMAIL_ADMIN_INTERNAL,
      subject: `Vertrag signiert: ${contract.title}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b"><tr><td style="padding:20px 32px">
    <div style="font-size:20px;font-weight:900;color:#fff">HED-IT</div><div style="font-size:10px;color:rgba(255,255,255,0.5)">Intern – Vertragsbenachrichtigung</div>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:16px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;padding:32px">
      <tr><td>
        <h2 style="margin:0 0 16px;font-size:18px;color:#16a34a">✓ Vertrag signiert</h2>
        <p style="color:#475569;font-size:14px"><strong>${customerName}</strong> hat den Vertrag <strong>"${contract.title}"</strong> digital signiert.</p>
        <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;margin:16px 0">
          <tr style="background:#f8fafc"><td style="font-size:12px;color:#64748b;font-weight:700">Rechnungsnummer</td><td style="font-size:13px;font-weight:700;color:#1e293b">${invNumber}</td></tr>
          <tr><td style="font-size:12px;color:#64748b;font-weight:700">Betrag</td><td style="font-size:13px;font-weight:700;color:#2563eb">CHF ${parseFloat(contract.amount).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</td></tr>
          <tr style="background:#f8fafc"><td style="font-size:12px;color:#64748b;font-weight:700">Fälligkeitsdatum</td><td style="font-size:13px;color:#1e293b">${dueDate.toLocaleDateString('de-CH')}</td></tr>
          <tr><td style="font-size:12px;color:#64748b;font-weight:700">Signiert am</td><td style="font-size:13px;color:#1e293b">${new Date().toLocaleString('de-CH')}</td></tr>
        </table>
        <a href="https://portal.hed-it.ch/contracts?openContract=${contract.id}" style="display:inline-block;background:#1e293b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:700">Vertrag anzeigen →</a>
      </td></tr>
    </table>
  </td></tr></table>
</td></tr></table>
</body></html>`
    }).catch(err => console.error('Error sending admin contract notification:', err));

    res.json({ success: true, message: 'Vertrag erfolgreich signiert!', invoiceNumber: invNumber });
  } catch (error) {
    console.error('Error signing contract:', error);
    res.status(500).json({ success: false, error: 'Server error during signing' });
  }
});

app.get('/api/portal/contracts/:id/pdf', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT con.*, c.name as company_name, c.address as company_address, c.city as company_city, c.zip as company_zip, c.email as company_email
      FROM contracts con
      LEFT JOIN companies c ON con.company_id = c.id
      WHERE con.id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).send('Not found');
    const contract = result.rows[0];

    const doc = new jsPDF() as any;
    const W = 210;
    const H = 297;

    // ─── Header ───────────────────────────────────────────────────────────────
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, W, 48, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('HED-IT', 20, 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('Web & Marketing Solutions', 20, 30);
    doc.text('info@hed-it.ch  ·  www.hed-it.ch', 20, 36);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('DIENSTLEISTUNGSVERTRAG', W - 20, 22, { align: 'right' });
    const contractNum = contract.contract_number || contract.id.substring(0, 8).toUpperCase();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Nr: ${contractNum}`, W - 20, 30, { align: 'right' });
    doc.text(`Datum: ${new Date().toLocaleDateString('de-CH')}`, W - 20, 36, { align: 'right' });

    // ─── Vertragsparteien ─────────────────────────────────────────────────────
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('AUFTRAGNEHMER', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('HED-IT Joel Hediger', 20, 67);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Web & Marketing Solutions', 20, 73);
    doc.text('Schweiz', 20, 79);
    doc.text('info@hed-it.ch', 20, 85);

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('AUFTRAGGEBER', 115, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(contract.company_name || 'Nicht angegeben', 115, 67);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    if (contract.company_address) doc.text(contract.company_address, 115, 73);
    if (contract.company_zip || contract.company_city) doc.text(`${contract.company_zip || ''} ${contract.company_city || ''}`.trim(), 115, 79);
    if (contract.company_email) doc.text(contract.company_email, 115, 85);

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, 93, W - 20, 93);

    // ─── Vertragsdetails ──────────────────────────────────────────────────────
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('VERTRAGSDETAILS', 20, 101);

    const billingLabel = contract.billing_interval === 'monthly' ? 'Monatlich' :
                         contract.billing_interval === 'yearly' ? 'Jährlich' :
                         contract.billing_interval === 'quarterly' ? 'Quartalsweise' :
                         contract.billing_interval === 'one_time' ? 'Einmalig' : contract.billing_interval;
    const clientTypeLabel = contract.client_type === 'business' ? 'B2B (Unternehmen)' :
                            contract.client_type === 'association' ? 'Verein' : 'Einzelperson (Privat)';

    const details = [
      ['Vertragsbezeichnung', contract.title],
      ['Vertragstyp', contract.contract_type || 'Dienstleistungsvertrag'],
      ['Abrechnungsintervall', billingLabel],
      ['Startdatum', contract.start_date ? new Date(contract.start_date).toLocaleDateString('de-CH') : '-'],
      ['Enddatum', contract.end_date ? new Date(contract.end_date).toLocaleDateString('de-CH') : 'Unbefristet'],
      ['Kundentyp', clientTypeLabel],
      ...(contract.discount_percent > 0 ? [['Rabatt', `${contract.discount_percent}%`]] : []),
    ];

    autoTable(doc as any, {
      startY: 105,
      body: details,
      theme: 'plain',
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, textColor: [100, 116, 139], fontSize: 9 }, 1: { fontSize: 10, textColor: [30, 41, 59] } },
      styles: { cellPadding: { top: 3, bottom: 3, left: 0, right: 4 } },
      margin: { left: 20, right: 20 },
    });

    // ─── Leistungsübersicht ───────────────────────────────────────────────────
    const items = contract.items
      ? (typeof contract.items === 'string' ? JSON.parse(contract.items) : contract.items)
      : [];

    const afterDetails = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('LEISTUNGSÜBERSICHT', 20, afterDetails);

    const tableRows = items.length > 0
      ? items.map((item: any) => [
          item.title || '-',
          item.description || '',
          (item.quantity || 1).toString(),
          `CHF ${parseFloat(item.unit_price || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}`,
          `${parseFloat(item.tax_rate || 8.1).toFixed(1)}%`,
          `CHF ${parseFloat(item.total_price || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}`,
        ])
      : [['Gemäss Vertrag', '', '1', `CHF ${parseFloat(contract.amount).toFixed(2)}`, '8.1%', `CHF ${parseFloat(contract.amount).toFixed(2)}`]];

    const subtotal = items.reduce((s: number, i: any) => s + (parseFloat(i.total_price) || 0), 0) || parseFloat(contract.amount);
    const tax = items.reduce((s: number, i: any) => s + ((parseFloat(i.total_price) || 0) * ((parseFloat(i.tax_rate) || 8.1) / 100)), 0);
    const discountAmt = subtotal * ((contract.discount_percent || 0) / 100);
    const total = subtotal - discountAmt + tax;

    const footRows: any[] = [
      ['', '', '', '', 'Zwischensumme:', `CHF ${subtotal.toLocaleString('de-CH', { minimumFractionDigits: 2 })}`],
    ];
    if (discountAmt > 0) footRows.push(['', '', '', '', `Rabatt (${contract.discount_percent}%):`, `-CHF ${discountAmt.toLocaleString('de-CH', { minimumFractionDigits: 2 })}`]);
    footRows.push(['', '', '', '', 'MwSt (8.1%):', `CHF ${tax.toLocaleString('de-CH', { minimumFractionDigits: 2 })}`]);
    footRows.push(['', '', '', '', 'GESAMTBETRAG:', `CHF ${total.toLocaleString('de-CH', { minimumFractionDigits: 2 })}`]);

    autoTable(doc as any, {
      startY: afterDetails + 4,
      head: [['Position', 'Beschreibung', 'Menge', 'Einzelpreis', 'MwSt', 'Total']],
      body: tableRows,
      foot: footRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 55 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 28, halign: 'right' },
      },
      margin: { left: 20, right: 20 },
    });

    // ─── Bemerkungen ──────────────────────────────────────────────────────────
    let afterTable = (doc as any).lastAutoTable.finalY + 10;
    if (contract.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('BEMERKUNGEN', 20, afterTable);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const splitNotes = doc.splitTextToSize(contract.notes, W - 40);
      doc.text(splitNotes, 20, afterTable + 6);
      afterTable += 6 + splitNotes.length * 5;
    }

    // ─── Unterschriften ───────────────────────────────────────────────────────
    const sigY = Math.max(afterTable + 10, H - 80);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, sigY + 20, 88, sigY + 20);
    doc.line(112, sigY + 20, 180, sigY + 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('HED-IT Joel Hediger – Auftragnehmer', 20, sigY + 25);
    doc.text('Auftraggeber', 112, sigY + 25);
    doc.text(`Ort/Datum: ________________________`, 20, sigY + 32);
    doc.text(`Ort/Datum: ________________________`, 112, sigY + 32);

    if (contract.signature_date) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74);
      doc.setFontSize(9);
      doc.text(`✓ Elektronisch signiert am ${new Date(contract.signature_date).toLocaleString('de-CH')}`, 112, sigY + 40);
      if (contract.signature_data && contract.signature_data.startsWith('data:image')) {
        try {
          doc.addImage(contract.signature_data, 'PNG', 112, sigY - 18, 60, 18);
        } catch (_) { /* signature image optional */ }
      }
    }

    // ─── Footer ───────────────────────────────────────────────────────────────
    doc.setFillColor(30, 41, 59);
    doc.rect(0, H - 18, W, 18, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('HED-IT Joel Hediger  ·  Web & Marketing Solutions  ·  info@hed-it.ch  ·  www.hed-it.ch', W / 2, H - 10, { align: 'center' });
    doc.text('Alle Preise in CHF  ·  Zahlbar gemäss Rechnung  ·  Gerichtsstand: Schweiz', W / 2, H - 5, { align: 'center' });

    const pdfOutput = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Vertrag_${contractNum.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`);
    res.send(Buffer.from(pdfOutput));
  } catch (error) {
    console.error('Error generating contract PDF:', error);
    res.status(500).send('Error generating PDF');
  }
});

app.post('/api/portal/contracts/upgrade', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { serviceId, serviceName, price, type } = req.body;
  const { id: userId, tenant_id, firstName, lastName } = req.user!;

  // Predefined small upgrades that get auto-activated
  const AUTO_UPGRADES = ['seo', 'newsletter', 'security', 'cloud'];
  const isAutoUpgrade = AUTO_UPGRADES.includes(serviceId);

  try {
    const companyId = await getCompanyId(userId);

    await pool.query('BEGIN');

    if (isAutoUpgrade) {
      // --- AUTO-ACTIVATE: Small monthly upgrades ---
      // 1. Create contract immediately
      const priceMatch = String(price).match(/(\d+(\.\d+)?)/);
      const monthlyPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;

      await pool.query(
        `INSERT INTO contracts (tenant_id, company_id, service_name, type, status, start_date, monthly_price, payment_cycle)
         VALUES ($1, $2, $3, 'service', 'active', NOW(), $4, 'monthly')`,
        [tenant_id, companyId, serviceName, monthlyPrice]
      );

      // 2. Create first invoice
      const invNumber = 'RE-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 100000).toString().padStart(5, '0');
      await pool.query(
        `INSERT INTO invoices (tenant_id, company_id, invoice_number, status, amount, issue_date, due_date, title)
         VALUES ($1, $2, $3, 'open', $4, NOW(), NOW() + interval '30 days', $5)`,
        [tenant_id, companyId, invNumber, monthlyPrice, `${serviceName} – Erste Monatsrechnung`]
      );

      // 3. Create setup ticket for internal team
      const ticketResult = await pool.query(
        `INSERT INTO tickets (tenant_id, company_id, customer_id, title, description, status, priority, category)
         VALUES ($1, $2, $3, $4, $5, 'new', 'high', 'setup') RETURNING id`,
        [
          tenant_id, companyId, userId,
          `Setup: ${serviceName}`,
          `Kunde ${firstName} ${lastName} hat "${serviceName}" gebucht.\nVertrag & Rechnung wurden automatisch erstellt.\nBitte Service aufschalten.`
        ]
      );

      // 4. Notify admin
      await createNotification({
        tenant_id,
        target_role: 'admin',
        type: 'ticket',
        entity_id: ticketResult.rows[0].id,
        title: `Neue Buchung: ${serviceName}`,
        message: `${firstName} ${lastName} hat "${serviceName}" gebucht. Vertrag & Rechnung erstellt – bitte Service aufschalten.`,
        priority: 'high',
        link: `/tickets/${ticketResult.rows[0].id}`
      });

      // 5. Notify customer
      await createNotification({
        tenant_id,
        user_id: userId,
        type: 'contract',
        entity_id: companyId,
        title: 'Service aktiviert!',
        message: `Ihr Service "${serviceName}" wurde aktiviert. Die erste Rechnung finden Sie unter Rechnungen.`,
        priority: 'high',
        link: `/portal/contracts`
      });

      // 6. Email to admin
      try {
        await resend.emails.send({
          from: EMAIL_INFO,
          to: ['info@hed-it.ch'],
          subject: `NEUE BUCHUNG (Auto): ${serviceName} von ${firstName} ${lastName}`,
          html: `<h3>Automatische Buchung im Portal</h3><p>Kunde: ${firstName} ${lastName}</p><p>Service: ${serviceName}</p><p>Preis: ${monthlyPrice} CHF / Monat</p><p><b>Vertrag & Rechnung wurden automatisch erstellt.</b></p><a href="https://tool.hed-it.ch/tickets/${ticketResult.rows[0].id}">Setup-Ticket öffnen</a>`
        });
      } catch (err) { console.error('Failed to send upgrade mail:', err); }

      await pool.query('COMMIT');
      res.json({ success: true, message: 'Service wurde aktiviert! Vertrag und Rechnung wurden erstellt.' });

    } else {
      // --- MANUAL APPROVAL: Calculator / large project requests ---
      const ticketResult = await pool.query(
        `INSERT INTO tickets (tenant_id, company_id, customer_id, title, description, status, priority, category)
         VALUES ($1, $2, $3, $4, $5, 'new', 'high', 'upgrade_request') RETURNING id`,
        [
          tenant_id, companyId, userId,
          `Projekt-Anfrage: ${serviceName}`,
          `Der Kunde möchte den Service "${serviceName}" buchen.\nKosten: ${price}\nTyp: ${type === 'monthly' ? 'Monatlich' : 'Einmalig'}`
        ]
      );

      await createNotification({
        tenant_id,
        target_role: 'admin',
        type: 'ticket',
        entity_id: ticketResult.rows[0].id,
        title: 'Neue Projekt-Anfrage',
        message: `${firstName} ${lastName} hat eine Projekt-Anfrage für "${serviceName}" gestellt.`,
        priority: 'high',
        link: `/tickets/${ticketResult.rows[0].id}`
      });

      try {
        await resend.emails.send({
          from: EMAIL_INFO,
          to: ['info@hed-it.ch'],
          subject: `PROJEKT-ANFRAGE: ${serviceName} von ${firstName} ${lastName}`,
          html: `<h3>Neue Projekt-Anfrage im Portal</h3><p>Kunde: ${firstName} ${lastName}</p><p>Service: ${serviceName}</p><p>Geschätzter Preis: ${price}</p><p><b>Benötigt Admin-Genehmigung.</b></p><a href="https://tool.hed-it.ch/tickets/${ticketResult.rows[0].id}">Ticket öffnen</a>`
        });
      } catch (err) { console.error('Failed to send upgrade mail:', err); }

      await pool.query('COMMIT');
      res.json({ success: true, message: 'Ihre Anfrage wurde gesendet. Wir melden uns in Kürze bei Ihnen.' });
    }
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Upgrade error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// --- Portal Profile Endpoints ---
app.get('/api/portal/profile', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id: userId } = req.user!;
    const contactResult = await pool.query('SELECT * FROM contacts WHERE user_id = $1', [userId]);
    if (contactResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Contact not found' });
    
    const contact = contactResult.rows[0];
    let company = null;
    if (contact.company_id) {
      const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [contact.company_id]);
      if (companyResult.rows.length > 0) company = companyResult.rows[0];
    }
    
    res.json({ success: true, data: { contact, company } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error fetching profile' });
  }
});

app.patch('/api/portal/profile', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { firstName, lastName, phone, companyName, website, industry, address } = req.body;
  const { id: userId, tenant_id } = req.user!;

  try {
    console.log('[DEBUG] Profile update request:', { userId, tenant_id, firstName, lastName, companyName });
    
    // 1. Update User & Contact
    await pool.query('UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3', [firstName, lastName, userId]);
    
    const contactUpdate = await pool.query(
      'UPDATE contacts SET first_name = $1, last_name = $2, phone = $3 WHERE user_id = $4 RETURNING company_id',
      [firstName, lastName, phone, userId]
    );

    let companyId = contactUpdate.rows.length > 0 ? contactUpdate.rows[0].company_id : null;

    if (contactUpdate.rows.length === 0) {
      // Create contact if it doesn't exist
      const newContact = await pool.query(
        'INSERT INTO contacts (tenant_id, user_id, first_name, last_name, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [tenant_id, userId, firstName, lastName, phone]
      );
    }

    // 2. Update or Create Company
    if (companyId) {
      await pool.query(
        'UPDATE companies SET name = $1, website = $2, industry = $3, address = $4 WHERE id = $5',
        [companyName || `${firstName} ${lastName}`, website || '', industry || '', address || '', companyId]
      );
    } else if (companyName || website || industry || address) {
      // Only create company if at least some info is provided
      const newCompany = await pool.query(
        'INSERT INTO companies (tenant_id, name, website, industry, address) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [tenant_id, companyName || `${firstName} ${lastName}`, website || '', industry || '', address || '']
      );
      companyId = newCompany.rows[0].id;
      await pool.query('UPDATE contacts SET company_id = $1 WHERE user_id = $2', [companyId, userId]);
    }

    res.json({ success: true, message: 'Profil erfolgreich aktualisiert.' });
  } catch (error) {
    console.error('[CRITICAL] Profile update error:', error);
    res.status(500).json({ success: false, error: 'Server error updating profile' });
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

app.post('/api/tickets/:id/approve-upgrade', authenticateToken, authorizeRole('admin', 'management'), async (req: AuthenticatedRequest, res: express.Response) => {
    const { id } = req.params;
    try {
        const ticketRes = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
        if (ticketRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Ticket not found' });
        const ticket = ticketRes.rows[0];

        // Parse price, service name, and type from description
        const desc = ticket.description || '';
        const lines = desc.split('\n');
        let price = 0;
        let service_name = 'Upgrade';
        let isMonthly = true;
        
        for (const line of lines) {
            if (line.includes('Kosten:')) {
                const match = line.match(/(\d+(\.\d+)?)/);
                if (match) price = parseFloat(match[1]);
            }
            if (line.includes('Service "')) {
                const match = line.match(/Service "(.*?)"/);
                if (match) service_name = match[1];
            }
            if (line.includes('Typ: Einmalig')) {
                isMonthly = false;
            }
        }

        if (isMonthly) {
            // Create new contract for recurring monthly costs
            await pool.query(
                `INSERT INTO contracts (tenant_id, company_id, title, status, billing_interval, amount, start_date)
                 VALUES ($1, $2, $3, 'active', 'monthly', $4, NOW())`,
                [ticket.tenant_id, ticket.company_id, service_name, price]
            );
        } else {
            // For one-time costs, generate an immediate invoice
            const year = new Date().getFullYear();
            const invSeq = await pool.query("SELECT nextval('invoice_number_seq') as seq");
            const invNumber = `RE-${year}-${String(invSeq.rows[0]?.seq || Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
            await pool.query(
                `INSERT INTO invoices (tenant_id, company_id, invoice_number, title, status, amount, issue_date, due_date)
                 VALUES ($1, $2, $3, $4, 'sent', $5, NOW(), NOW() + interval '30 days')`,
                [ticket.tenant_id, ticket.company_id, invNumber, service_name, price]
            );
        }

        // Update ticket
        await pool.query('UPDATE tickets SET status = \'closed\', updated_at = NOW() WHERE id = $1', [id]);

        // Notify customer
        await createNotification({
            tenant_id: ticket.tenant_id,
            user_id: ticket.customer_id,
            type: 'contract',
            entity_id: ticket.company_id,
            title: 'Upgrade aktiviert',
            message: `Ihr gewünschtes Upgrade "${service_name}" wurde erfolgreich aktiviert!`,
            priority: 'high',
            link: `/portal/contracts`
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error approving upgrade:', error);
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



// ─── Contract Expiry Warning (cron-trigger or manual) ──────────────────────────
const sendContractExpiryWarnings = async () => {
  try {
    const expiring = await pool.query(`
      SELECT c.*, comp.name as company_name,
        EXTRACT(DAY FROM (c.end_date - CURRENT_DATE)) as days_left
      FROM contracts c
      LEFT JOIN companies comp ON c.company_id = comp.id
      WHERE c.status = 'active'
        AND c.end_date IS NOT NULL
        AND c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
      ORDER BY c.end_date ASC
    `);

    for (const contract of expiring.rows) {
      const daysLeft = Math.round(contract.days_left);
      if (daysLeft !== 30 && daysLeft !== 60) continue;

      // Admin warning
      await resend.emails.send({
        from: 'HED-IT <info@hed-it.ch>',
        to: 'joel.hediger@hed-it.ch',
        subject: `Vertrag läuft in ${daysLeft} Tagen ab: ${contract.title}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
            <div style="background:#1e3a5f;padding:28px 32px">
              <h2 style="color:#fff;margin:0;font-size:20px">HED-IT · Vertragswarnung</h2>
            </div>
            <div style="padding:32px">
              <p>Der folgende Vertrag läuft in <strong>${daysLeft} Tagen</strong> ab:</p>
              <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:4px;margin:16px 0">
                <p style="margin:0;font-weight:700">${contract.title}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#64748b">Firma: ${contract.company_name || '-'} · Enddatum: ${new Date(contract.end_date).toLocaleDateString('de-CH')}</p>
              </div>
              <a href="https://hed-it.ch/contracts" style="display:inline-block;background:#1e3a5f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700">Vertrag ansehen →</a>
            </div>
          </div>`
      });

      // Customer warning
      if (contract.company_id) {
        const contactRes = await pool.query(
          `SELECT email, first_name FROM contacts WHERE company_id = $1 AND email IS NOT NULL ORDER BY is_primary DESC LIMIT 1`,
          [contract.company_id]
        );
        if (contactRes.rows.length > 0 && contactRes.rows[0].email) {
          const { email: custEmail, first_name } = contactRes.rows[0];
          await resend.emails.send({
            from: 'HED-IT <info@hed-it.ch>',
            to: custEmail,
            subject: `Ihr Vertrag läuft in ${daysLeft} Tagen ab`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
                <div style="background:#1e3a5f;padding:28px 32px">
                  <h2 style="color:#fff;margin:0;font-size:20px">HED-IT GmbH</h2>
                  <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Vertragsablauf</p>
                </div>
                <div style="padding:32px">
                  <p>Hallo ${first_name || 'Kunde'},</p>
                  <p>Ihr Vertrag <strong>${contract.title}</strong> läuft in <strong>${daysLeft} Tagen</strong> ab (${new Date(contract.end_date).toLocaleDateString('de-CH')}).</p>
                  <p>Falls Sie den Vertrag verlängern oder anpassen möchten, kontaktieren Sie uns gerne.</p>
                  <a href="https://portal.hed-it.ch/portal/contracts" style="display:inline-block;background:#1e3a5f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700">Vertrag im Portal ansehen →</a>
                </div>
                <div style="background:#f1f5f9;padding:16px 32px;text-align:center;font-size:11px;color:#94a3b8">
                  HED-IT GmbH · info@hed-it.ch
                </div>
              </div>`
          });
        }
      }
    }
  } catch (err) {
    console.error('Contract expiry warning error:', err);
  }
};

// Run contract expiry check daily at startup and every 24h
setInterval(sendContractExpiryWarnings, 24 * 60 * 60 * 1000);
sendContractExpiryWarnings();

// ─── Proposals (Offerten) ─────────────────────────────────────────────────────

// Helper: create invoices from proposal items grouped by billing_interval
async function createInvoicesFromProposal(proposal: any, contractId: string): Promise<void> {
  const items: any[] = typeof proposal.items === 'string' ? JSON.parse(proposal.items) : (proposal.items || []);
  const groups: Record<string, any[]> = {};
  for (const item of items) {
    const interval = item.billing_interval || 'one_time';
    if (!groups[interval]) groups[interval] = [];
    groups[interval].push(item);
  }

  const intervalLabel = (i: string) =>
    i === 'monthly' ? 'Monatlich' : i === 'quarterly' ? 'Quartalsweise' : i === 'yearly' ? 'Jährlich' : 'Einmalig';
  const nextDate = (i: string) => {
    const d = new Date();
    if (i === 'monthly') d.setMonth(d.getMonth() + 1);
    else if (i === 'quarterly') d.setMonth(d.getMonth() + 3);
    else if (i === 'yearly') d.setFullYear(d.getFullYear() + 1);
    return d;
  };

  for (const [interval, grpItems] of Object.entries(groups)) {
    const subtotal = grpItems.reduce((s, i) => s + (parseFloat(i.total_price) || 0), 0);
    const taxTotal = grpItems.reduce((s, i) => s + (parseFloat(i.total_price) || 0) * ((parseFloat(i.tax_rate) || 8.1) / 100), 0);
    const total = subtotal + taxTotal;
    const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30);
    const invNum = `RE-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
    await pool.query(
      `INSERT INTO invoices (tenant_id, company_id, invoice_number, title, amount, status, issue_date, due_date, contract_id, proposal_id, billing_interval, is_recurring, items, tax_rate)
       VALUES ($1,$2,$3,$4,$5,'sent',NOW(),$6,$7,$8,$9,$10,$11,8.1)`,
      [proposal.tenant_id, proposal.company_id, invNum,
       `${proposal.title} – ${intervalLabel(interval)}`,
       total.toFixed(2), dueDate, contractId, proposal.id,
       interval, interval !== 'one_time', JSON.stringify(grpItems)]
    );
    // Update contract next_invoice_date for recurring
    if (interval !== 'one_time') {
      await pool.query(
        `UPDATE contracts SET next_invoice_date = $1 WHERE id = $2`,
        [nextDate(interval).toISOString().split('T')[0], contractId]
      ).catch(() => {});
    }
  }
}

// Cron: generate recurring invoices when due
async function generateRecurringInvoices() {
  try {
    const contracts = await pool.query(
      `SELECT * FROM contracts WHERE next_invoice_date <= CURRENT_DATE AND status = 'active'`
    );
    for (const contract of contracts.rows) {
      const lastInv = await pool.query(
        `SELECT * FROM invoices WHERE contract_id = $1 AND billing_interval != 'one_time' ORDER BY created_at DESC LIMIT 1`,
        [contract.id]
      );
      if (!lastInv.rows[0]) continue;
      const src = lastInv.rows[0];
      const invNum = `RE-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30);
      await pool.query(
        `INSERT INTO invoices (tenant_id, company_id, invoice_number, title, amount, status, issue_date, due_date, contract_id, proposal_id, billing_interval, is_recurring, items, tax_rate)
         VALUES ($1,$2,$3,$4,$5,'sent',NOW(),$6,$7,$8,$9,$10,$11,$12)`,
        [src.tenant_id, src.company_id, invNum, src.title, src.amount, dueDate,
         src.contract_id, src.proposal_id, src.billing_interval, true, src.items, src.tax_rate]
      );
      // Advance next_invoice_date
      const next = new Date();
      if (contract.billing_interval === 'monthly' || src.billing_interval === 'monthly') next.setMonth(next.getMonth() + 1);
      else if (contract.billing_interval === 'quarterly' || src.billing_interval === 'quarterly') next.setMonth(next.getMonth() + 3);
      else if (contract.billing_interval === 'yearly' || src.billing_interval === 'yearly') next.setFullYear(next.getFullYear() + 1);
      await pool.query(`UPDATE contracts SET next_invoice_date = $1 WHERE id = $2`, [next.toISOString().split('T')[0], contract.id]);
      console.log(`[Recurring] Created invoice for contract ${contract.id}`);
    }
  } catch (err) { console.error('[Recurring invoice cron error]', err); }
}
setInterval(generateRecurringInvoices, 24 * 60 * 60 * 1000);
setTimeout(generateRecurringInvoices, 10000); // run 10s after startup

// GET /api/proposals — admin list
app.get('/api/proposals', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const r = await pool.query(
      `SELECT p.*, c.name as company_name FROM proposals p LEFT JOIN companies c ON p.company_id = c.id WHERE p.tenant_id = $1 ORDER BY p.created_at DESC`,
      [req.user!.tenant_id]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false }); }
});

// POST /api/proposals — create
app.post('/api/proposals', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { title, company_id, items, discount_percent, notes, valid_until } = req.body;
  try {
    const itemsArr: any[] = items || [];
    const subtotal = itemsArr.reduce((s: number, i: any) => s + (parseFloat(i.total_price) || 0), 0);
    const taxTotal = itemsArr.reduce((s: number, i: any) => s + (parseFloat(i.total_price) || 0) * ((parseFloat(i.tax_rate) || 8.1) / 100), 0);
    const disc = parseFloat(discount_percent) || 0;
    const discAmt = subtotal * (disc / 100);
    const total = (subtotal - discAmt) + taxTotal;
    const propNum = `OFF-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
    const r = await pool.query(
      `INSERT INTO proposals (tenant_id, company_id, proposal_number, title, status, items, subtotal, tax_total, discount_percent, total, notes, valid_until, created_by)
       VALUES ($1,$2,$3,$4,'draft',$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.user!.tenant_id, company_id, propNum, title, JSON.stringify(itemsArr),
       subtotal.toFixed(2), taxTotal.toFixed(2), disc, total.toFixed(2),
       notes || null, valid_until || null, req.user!.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH /api/proposals/:id — update draft
app.patch('/api/proposals/:id', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { title, company_id, items, discount_percent, notes, valid_until, status } = req.body;
  try {
    const itemsArr: any[] = items || [];
    const subtotal = itemsArr.reduce((s: number, i: any) => s + (parseFloat(i.total_price) || 0), 0);
    const taxTotal = itemsArr.reduce((s: number, i: any) => s + (parseFloat(i.total_price) || 0) * ((parseFloat(i.tax_rate) || 8.1) / 100), 0);
    const disc = parseFloat(discount_percent) || 0;
    const total = (subtotal - subtotal * disc / 100) + taxTotal;
    const r = await pool.query(
      `UPDATE proposals SET title=$1, company_id=$2, items=$3, subtotal=$4, tax_total=$5, discount_percent=$6, total=$7, notes=$8, valid_until=$9, status=COALESCE($10,status), updated_at=NOW() WHERE id=$11 AND tenant_id=$12 RETURNING *`,
      [title, company_id, JSON.stringify(itemsArr), subtotal.toFixed(2), taxTotal.toFixed(2), disc, total.toFixed(2), notes || null, valid_until || null, status || null, req.params.id, req.user!.tenant_id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE /api/proposals/:id
app.delete('/api/proposals/:id', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    await pool.query(`DELETE FROM proposals WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.user!.tenant_id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// POST /api/proposals/:id/send — mark sent + email customer
app.post('/api/proposals/:id/send', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const r = await pool.query(
      `UPDATE proposals SET status='sent', updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *`,
      [req.params.id, req.user!.tenant_id]
    );
    if (r.rowCount === 0) return res.status(404).json({ success: false });
    const proposal = r.rows[0];
    // Email customer
    const contactRes = await pool.query(
      `SELECT email, first_name FROM contacts WHERE company_id=$1 AND email IS NOT NULL AND email != '' ORDER BY is_primary DESC LIMIT 1`,
      [proposal.company_id]
    );
    const email = contactRes.rows[0]?.email;
    if (email && resendApiKey) {
      await resend.emails.send({
        from: EMAIL_NO_REPLY, to: email,
        subject: `Neue Offerte: ${proposal.title}`,
        html: `<p>Hallo ${contactRes.rows[0]?.first_name || ''},</p>
          <p>Sie haben eine neue Offerte erhalten: <strong>${proposal.title}</strong> (${proposal.proposal_number})</p>
          <p>Betrag: <strong>CHF ${parseFloat(proposal.total).toFixed(2)}</strong></p>
          <p>Bitte melden Sie sich im Kundenportal an, um die Offerte zu prüfen und zu unterzeichnen.</p>
          <br><p>Mit freundlichen Grüssen,<br>HED-IT Joel Hediger</p>`,
      }).catch(() => {});
    }
    res.json({ success: true, data: proposal });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/portal/proposals — customer portal list (includes legacy INV- invoice quotes)
app.get('/api/portal/proposals', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const companyId = req.user!.company_id || await getCompanyId(req.user!.id);
    if (!companyId) return res.json({ success: true, data: [] });

    const [propsRes, legacyRes] = await Promise.all([
      pool.query(
        `SELECT p.*, c.name as company_name, false as _legacy FROM proposals p LEFT JOIN companies c ON p.company_id=c.id WHERE p.company_id=$1 AND p.status IN ('sent','accepted','rejected','converted')`,
        [companyId]
      ),
      pool.query(
        `SELECT i.id, i.tenant_id, i.company_id,
           i.invoice_number as proposal_number,
           COALESCE(i.title, 'Offerte') as title,
           'sent' as status,
           i.amount as total,
           ROUND((i.amount / 1.081)::numeric, 2) as subtotal,
           ROUND((i.amount - i.amount / 1.081)::numeric, 2) as tax_total,
           0 as discount_percent,
           NULL as notes,
           i.due_date as valid_until,
           NULL::jsonb as items,
           i.created_at,
           NULL as signed_at,
           co.name as company_name,
           true as _legacy
         FROM invoices i
         LEFT JOIN companies co ON i.company_id=co.id
         WHERE i.company_id=$1
           AND i.status = 'sent'
           AND i.invoice_number LIKE 'INV-%'`,
        [companyId]
      ),
    ]);

    const all = [...propsRes.rows, ...legacyRes.rows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    res.json({ success: true, data: all });
  } catch (err: any) {
    console.error('GET /api/portal/proposals error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/portal/proposals/:id
app.get('/api/portal/proposals/:id', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const companyId = req.user!.company_id || await getCompanyId(req.user!.id);
    const r = await pool.query(
      `SELECT p.*, c.name as company_name FROM proposals p LEFT JOIN companies c ON p.company_id=c.id WHERE p.id=$1 AND p.company_id=$2`,
      [req.params.id, companyId]
    );
    if (r.rowCount === 0) return res.status(404).json({ success: false });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { res.status(500).json({ success: false }); }
});

// POST /api/portal/proposals/:id/sign — customer signs → creates contract + invoices
app.post('/api/portal/proposals/:id/sign', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { signatureData } = req.body;
  try {
    const companyId = req.user!.company_id || await getCompanyId(req.user!.id);
    const propRes = await pool.query(`SELECT * FROM proposals WHERE id=$1 AND company_id=$2`, [req.params.id, companyId]);
    if (propRes.rowCount === 0) return res.status(404).json({ success: false });
    const proposal = propRes.rows[0];
    if (proposal.status === 'converted') return res.status(400).json({ success: false, error: 'Already signed' });

    // 1. Create contract
    const contractNum = `CON-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
    const contractRes = await pool.query(
      `INSERT INTO contracts (tenant_id, company_id, title, contract_number, amount, billing_interval, status, signature_data, signature_date, proposal_id, items, discount_percent, notes, start_date)
       VALUES ($1,$2,$3,$4,$5,'mixed','active',$6,NOW(),$7,$8,$9,$10,CURRENT_DATE) RETURNING *`,
      [proposal.tenant_id, proposal.company_id, proposal.title, contractNum,
       proposal.total, signatureData || null, proposal.id,
       proposal.items, proposal.discount_percent, proposal.notes || null]
    );
    const contract = contractRes.rows[0];

    // 2. Create invoices per billing interval group
    await createInvoicesFromProposal(proposal, contract.id);

    // 3. Mark proposal converted
    await pool.query(
      `UPDATE proposals SET status='converted', signed_at=NOW(), signature_data=$1, contract_id=$2, updated_at=NOW() WHERE id=$3`,
      [signatureData || null, contract.id, proposal.id]
    );

    // 4. Notify admin
    await createNotification({
      tenant_id: proposal.tenant_id, target_role: 'admin', type: 'contract',
      entity_id: contract.id, title: 'Offerte signiert',
      message: `Die Offerte "${proposal.title}" wurde signiert. Vertrag & Rechnungen wurden erstellt.`,
      link: `/contracts`
    });

    res.json({ success: true, contract_id: contract.id });
  } catch (err: any) {
    console.error('Proposal sign error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/portal/proposals/:id/reject
app.post('/api/portal/proposals/:id/reject', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { reason } = req.body;
  try {
    const companyId = req.user!.company_id || await getCompanyId(req.user!.id);
    const r = await pool.query(
      `UPDATE proposals SET status='rejected', rejected_at=NOW(), rejected_reason=$1, updated_at=NOW() WHERE id=$2 AND company_id=$3 RETURNING *`,
      [reason || null, req.params.id, companyId]
    );
    if (r.rowCount === 0) return res.status(404).json({ success: false });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// ─── Stripe Routes ────────────────────────────────────────────────────────────

// GET /api/stripe/config — publishable key for frontend
app.get('/api/stripe/config', authenticateToken, (_req, res) => {
  res.json({ publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || '' });
});

// POST /api/stripe/payment-intent — create PaymentIntent for an invoice
app.post('/api/stripe/payment-intent', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  if (!stripe) return res.status(503).json({ error: 'Payments not configured yet.' });
  const { invoice_id } = req.body;
  try {
    const inv = await pool.query('SELECT * FROM invoices WHERE id = $1', [invoice_id]);
    if (!inv.rows[0]) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = inv.rows[0];

    // Reuse existing PaymentIntent if not yet paid
    if (invoice.stripe_payment_intent_id) {
      const existing = await stripe.paymentIntents.retrieve(invoice.stripe_payment_intent_id);
      if (existing.status !== 'succeeded') {
        return res.json({ client_secret: existing.client_secret });
      }
    }

    const customerId = await getOrCreateStripeCustomer(invoice.company_id);
    const amountRappen = Math.round(parseFloat(invoice.amount) * 100);

    const pi = await stripe.paymentIntents.create({
      amount: amountRappen,
      currency: 'chf',
      customer: customerId,
      setup_future_usage: 'off_session',
      description: invoice.title || `Rechnung ${invoice.invoice_number || invoice.id.substring(0, 8)}`,
      metadata: { invoice_id: invoice.id, company_id: invoice.company_id },
      automatic_payment_methods: { enabled: true },
    });

    await pool.query('UPDATE invoices SET stripe_payment_intent_id = $1 WHERE id = $2', [pi.id, invoice.id]);
    res.json({ client_secret: pi.client_secret });
  } catch (err: any) {
    console.error('Stripe payment-intent error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Stripe-Fehler beim Erstellen der Zahlung' });
  }
});

// GET /api/stripe/payment-methods — list saved cards for the customer
app.get('/api/stripe/payment-methods', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  if (!stripe) return res.status(503).json({ error: 'Payments not configured yet.' });
  try {
    const companyId = req.user!.company_id || await getCompanyId(req.user!.id);
    if (!companyId) return res.json({ data: [] });
    const comp = await pool.query('SELECT stripe_customer_id FROM companies WHERE id = $1', [companyId]);
    const customerId = comp.rows[0]?.stripe_customer_id;
    if (!customerId) return res.json({ data: [] });
    const pms = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
    res.json({ data: pms.data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stripe/payment-methods/:pmId — detach a saved card
app.delete('/api/stripe/payment-methods/:pmId', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  if (!stripe) return res.status(503).json({ error: 'Payments not configured yet.' });
  try {
    await stripe.paymentMethods.detach(req.params.pmId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stripe/webhook — Stripe events
app.post('/api/stripe/webhook', async (req: express.Request, res: express.Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return res.status(503).send('Stripe not configured');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
  } catch (err: any) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const invoiceId = pi.metadata?.invoice_id;
    if (invoiceId) {
      await pool.query(`UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE id = $1`, [invoiceId])
        .catch(e => console.error('Webhook DB update failed:', e));
      console.log(`[Stripe] Invoice ${invoiceId} marked paid.`);
    }
    // Save default payment method on customer
    if (pi.customer && pi.payment_method) {
      await stripe.customers.update(pi.customer as string, {
        invoice_settings: { default_payment_method: pi.payment_method as string },
      }).catch(() => {});
    }
  }

  if (event.type === 'setup_intent.succeeded') {
    const si = event.data.object as Stripe.SetupIntent;
    if (si.customer && si.payment_method) {
      await stripe.customers.update(si.customer as string, {
        invoice_settings: { default_payment_method: si.payment_method as string },
      }).catch(() => {});
    }
  }

  res.json({ received: true });
});

// For any other request, serve the index.html (Client Side Routing)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Ensure products table has required columns, then start
pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT FALSE`)
  .then(() => pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES products(id) ON DELETE SET NULL`))
  .catch(err => console.error('Migration warning (products columns):', err))
  .finally(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port} and accessible on the network`);
    });
  });

