-- ============================================================
-- NexService – Migration v3
-- Phase 4: Alle neuen Module-Tabellen
-- Ausführen in pgAdmin → Query Tool
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. LEADS / AKQUISE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID REFERENCES tenants(id),
    company_name  VARCHAR(255) NOT NULL,
    website       VARCHAR(255),
    industry      VARCHAR(100),
    location      VARCHAR(255),
    contact_name  VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    status        VARCHAR(50) NOT NULL DEFAULT 'new',
    notes         TEXT,
    last_contact  TIMESTAMP WITH TIME ZONE,
    next_contact  TIMESTAMP WITH TIME ZONE,
    assigned_to   UUID REFERENCES users(id),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_notes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id    UUID REFERENCES users(id),
    body       TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);

-- ────────────────────────────────────────────────────────────
-- 2. CONTRACTS / VERTRÄGE (neue Version)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS contract_attachments CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;

CREATE TABLE contracts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID REFERENCES tenants(id),
    title               VARCHAR(255) NOT NULL,
    contract_number     VARCHAR(50),
    contract_type       VARCHAR(50),
    company_id          UUID REFERENCES companies(id),
    contact_id          UUID REFERENCES contacts(id),
    assigned_to         UUID REFERENCES users(id),
    start_date          DATE,
    end_date            DATE,
    notice_period_days  INT DEFAULT 30,
    amount              DECIMAL(12,2),
    billing_interval    VARCHAR(50) DEFAULT 'monthly',
    status              VARCHAR(50) NOT NULL DEFAULT 'draft',
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contract_attachments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id  UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    file_name    VARCHAR(255) NOT NULL,
    file_path    VARCHAR(500) NOT NULL,
    file_size    INT,
    mime_type    VARCHAR(100),
    uploaded_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────────────────
-- 3. PRODUCTS / PRODUKTE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_categories (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    name      VARCHAR(100) NOT NULL,
    color     VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS products (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID REFERENCES tenants(id),
    name         VARCHAR(255) NOT NULL,
    sku          VARCHAR(50),
    category_id  UUID REFERENCES product_categories(id),
    category     VARCHAR(100),
    description  TEXT,
    price        DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate     DECIMAL(5,2) DEFAULT 8.10,
    unit         VARCHAR(50) DEFAULT 'Stück',
    is_recurring BOOLEAN DEFAULT FALSE,
    is_active    BOOLEAN DEFAULT TRUE,
    notes        TEXT,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────────────────
-- 4. NEWSLETTER
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(id),
    subject         VARCHAR(255) NOT NULL,
    title           VARCHAR(255),
    content         TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'draft',
    scheduled_at    TIMESTAMP WITH TIME ZONE,
    sent_at         TIMESTAMP WITH TIME ZONE,
    recipient_count INT DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS newsletter_recipients (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
    contact_id    UUID REFERENCES contacts(id),
    email         VARCHAR(255) NOT NULL,
    sent_at       TIMESTAMP WITH TIME ZONE,
    opened_at     TIMESTAMP WITH TIME ZONE
);

-- ────────────────────────────────────────────────────────────
-- 5. ACCOUNTING / BUCHHALTUNG
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounting_entries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID REFERENCES tenants(id),
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    entry_type   VARCHAR(50) NOT NULL DEFAULT 'expense',
    amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency     VARCHAR(10) DEFAULT 'CHF',
    date         DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date     DATE,
    status       VARCHAR(50) NOT NULL DEFAULT 'pending',
    company_id   UUID REFERENCES companies(id),
    contact_id   UUID REFERENCES contacts(id),
    project_id   UUID REFERENCES projects(id),
    invoice_id   UUID REFERENCES invoices(id),
    contract_id  UUID REFERENCES contracts(id),
    notes        TEXT,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounting_attachments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id   UUID NOT NULL REFERENCES accounting_entries(id) ON DELETE CASCADE,
    file_name  VARCHAR(255) NOT NULL,
    file_path  VARCHAR(500) NOT NULL,
    file_size  INT,
    mime_type  VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_accounting_type ON accounting_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_accounting_date ON accounting_entries(date);

-- ────────────────────────────────────────────────────────────
-- 6. KNOWLEDGE BASE
-- ────────────────────────────────────────────────────────────
-- kb_articles existiert schon aus database_schema.sql
-- Fehlende Spalten hinzufügen
ALTER TABLE kb_articles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

CREATE TABLE IF NOT EXISTS kb_categories (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    name      VARCHAR(100) NOT NULL,
    icon      VARCHAR(50)
);

-- ────────────────────────────────────────────────────────────
-- 7. BUSINESS CARDS / VISITENKARTEN
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    position        VARCHAR(100),
    phone           VARCHAR(50),
    email           VARCHAR(255),
    website         VARCHAR(255),
    company_name    VARCHAR(255),
    company_address TEXT,
    extra_field_1   VARCHAR(255),
    extra_field_2   VARCHAR(255),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- ────────────────────────────────────────────────────────────
-- 8. CUSTOMER TIMELINE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_timeline_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    event_type   VARCHAR(50) NOT NULL,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    related_id   UUID,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_timeline_company ON customer_timeline_events(company_id);

-- ────────────────────────────────────────────────────────────
-- 9. FILE UPLOADS (zentrale Upload-Tabelle)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS file_uploads (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID REFERENCES tenants(id),
    uploaded_by  UUID REFERENCES users(id),
    file_name    VARCHAR(255) NOT NULL,
    file_path    VARCHAR(500) NOT NULL,
    file_size    INT,
    mime_type    VARCHAR(100),
    module       VARCHAR(50),
    related_id   UUID,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────────────────
-- 10. VORBEREITUNG: E-Mail Integration
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id),
    provider    VARCHAR(50),
    email       VARCHAR(255),
    settings    JSONB DEFAULT '{}',
    is_active   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────────────────
-- 11. VORBEREITUNG: KI-Webseitenanalyse
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_website_analyses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id),
    domain      VARCHAR(255) NOT NULL,
    lead_id     UUID REFERENCES leads(id),
    company_id  UUID REFERENCES companies(id),
    status      VARCHAR(50) DEFAULT 'pending',
    results     JSONB DEFAULT '{}',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────────────────
-- 12. VORBEREITUNG: Workflow Automation
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id),
    name        VARCHAR(255) NOT NULL,
    trigger_event VARCHAR(100) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    config      JSONB DEFAULT '{}',
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────────────────
-- Abschluss
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE '✅ Migration v3 erfolgreich!';
  RAISE NOTICE '   Neue Tabellen:';
  RAISE NOTICE '   - leads, lead_notes';
  RAISE NOTICE '   - contracts, contract_attachments';
  RAISE NOTICE '   - products, product_categories';
  RAISE NOTICE '   - newsletters, newsletter_recipients';
  RAISE NOTICE '   - accounting_entries, accounting_attachments';
  RAISE NOTICE '   - kb_categories';
  RAISE NOTICE '   - business_cards';
  RAISE NOTICE '   - customer_timeline_events';
  RAISE NOTICE '   - file_uploads';
  RAISE NOTICE '   - email_accounts (vorbereitet)';
  RAISE NOTICE '   - ai_website_analyses (vorbereitet)';
  RAISE NOTICE '   - automation_rules (vorbereitet)';
  RAISE NOTICE '=========================================';
END $$;
