-- NexService / All-in-One Business Platform - Base Schema
-- Dieses Schema kann in pgAdmin mit dem Query Tool ausgeführt werden.

-- 1. ENUMS (Status, Prioritäten, etc.)
CREATE TYPE user_role AS ENUM ('admin', 'management', 'employee', 'customer');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE ticket_status AS ENUM ('new', 'open', 'in_progress', 'pending', 'waiting_for_customer', 'waiting_internal', 'on_hold', 'scheduled', 'resolved', 'closed');
CREATE TYPE deal_stage AS ENUM ('new', 'contact_attempt', 'reached', 'interested', 'meeting_scheduled', 'needs_analysis', 'offer_prepared', 'offer_sent', 'following_up', 'won', 'lost');
CREATE TYPE offer_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'converted');
CREATE TYPE contract_status AS ENUM ('active', 'cancelled', 'expired', 'pending');
CREATE TYPE project_status AS ENUM ('planned', 'in_progress', 'on_hold', 'completed', 'cancelled');
CREATE TYPE invoice_status AS ENUM ('draft', 'open', 'paid', 'overdue', 'cancelled');
CREATE TYPE incident_status AS ENUM ('investigating', 'identified', 'monitoring', 'resolved');
CREATE TYPE incident_severity AS ENUM ('none', 'minor', 'major', 'critical', 'maintenance');

-- 2. TENANTS / MANDANTEN (Für SaaS-Fähigkeit)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. USERS & AUTH
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id), -- Null für intern, gesetzt für Mandanten
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Für lokales Passwort
    azure_ad_id VARCHAR(255), -- Für Microsoft SSO / Entra ID
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    points INT DEFAULT 0, -- Gamification
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CRM: COMPANIES & CONTACTS
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id), 
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    user_id UUID REFERENCES users(id), -- Verknüpfung zu Login
    phone VARCHAR(50),
    position VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TICKETS
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number SERIAL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ticket_status DEFAULT 'new',
    priority ticket_priority DEFAULT 'low',
    customer_id UUID REFERENCES users(id), -- Ersteller (Kunde)
    assignee_id UUID REFERENCES users(id), -- Bearbeiter (Mitarbeiter)
    company_id UUID REFERENCES companies(id),
    category VARCHAR(100),
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Wahr für interne Notizen
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. SALES / AKQUISE
CREATE TABLE sales_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES companies(id),
    contact_id UUID REFERENCES contacts(id),
    owner_id UUID REFERENCES users(id), -- Sales Mitarbeiter
    stage deal_stage DEFAULT 'new',
    estimated_value DECIMAL(12,2),
    expected_close_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. OFFERS / ANGEBOTE
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_number VARCHAR(50) UNIQUE NOT NULL,
    deal_id UUID REFERENCES sales_deals(id),
    company_id UUID REFERENCES companies(id),
    created_by UUID REFERENCES users(id),
    status offer_status DEFAULT 'draft',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. CONTRACTS / VERTRÄGE
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES companies(id),
    offer_id UUID REFERENCES offers(id),
    status contract_status DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    notice_period_days INT DEFAULT 30,
    monthly_value DECIMAL(12,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. PROJECTS
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES companies(id),
    manager_id UUID REFERENCES users(id),
    status project_status DEFAULT 'planned',
    budget DECIMAL(12,2),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES users(id),
    is_completed BOOLEAN DEFAULT FALSE,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. INVOICES / RECHNUNGEN
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    company_id UUID REFERENCES companies(id),
    project_id UUID REFERENCES projects(id),
    contract_id UUID REFERENCES contracts(id),
    status invoice_status DEFAULT 'draft',
    amount DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 8.10, -- CH MwSt
    issue_date DATE,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. KNOWLEDGE BASE
CREATE TABLE kb_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id),
    is_internal_only BOOLEAN DEFAULT FALSE, -- intern vs. extern
    is_published BOOLEAN DEFAULT FALSE,
    category VARCHAR(100),
    language VARCHAR(10) DEFAULT 'de',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. STATUS PAGE
CREATE TABLE system_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status incident_status DEFAULT 'investigating',
    severity incident_severity DEFAULT 'minor',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. GAMIFICATION / LEADERBOARD
CREATE TABLE points_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    points INT NOT NULL,
    reason VARCHAR(255) NOT NULL, -- z.B. "Ticket closed fast", "Deal won"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
