-- ============================================================
-- NexService – Migration Script
-- Fehlende Tabellen & Spalten für die aktuelle App-Version
-- Ausführen in pgAdmin → Query Tool (auf deiner Datenbank)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. COMPANIES – fehlende Spalten hinzufügen
--    (Die App nutzt city, country, phone, is_active)
-- ────────────────────────────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS phone       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS city        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;


-- ────────────────────────────────────────────────────────────
-- 2. CONTACTS – vollständige Tabelle (App-Version)
--    Ersetzt / ergänzt die alte contacts Tabelle
-- ────────────────────────────────────────────────────────────
-- Alte contacts Tabelle durch neue App-Version ersetzen
DROP TABLE IF EXISTS contacts CASCADE;

CREATE TABLE contacts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id),
    company_id  UUID REFERENCES companies(id),
    first_name  VARCHAR(100) NOT NULL DEFAULT '',
    last_name   VARCHAR(100) NOT NULL DEFAULT '',
    email       VARCHAR(255),
    phone       VARCHAR(50),
    role        VARCHAR(100),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ────────────────────────────────────────────────────────────
-- 3. TICKETS – fehlende Spalten hinzufügen
--    (App nutzt tenant_id, type, company_name via JOIN)
-- ────────────────────────────────────────────────────────────
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS tenant_id   UUID REFERENCES tenants(id),
  ADD COLUMN IF NOT EXISTS type        VARCHAR(50) DEFAULT 'support';

-- Sicherstellen dass updated_at existiert
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;


-- ────────────────────────────────────────────────────────────
-- 4. TICKET COMMENTS – neue Tabelle
--    Für das Kommentar-System im Ticket-Detail
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id),
    body        TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);


-- ────────────────────────────────────────────────────────────
-- 5. PROJECTS – vollständige Tabelle (App-Version)
--    Die alte projects Tabelle hat andere Spalten
--    → alte löschen und neu erstellen
-- ────────────────────────────────────────────────────────────

-- Schritt 5a: Alte Tabelle sichern (optional, falls du Daten hast)
-- CREATE TABLE projects_backup AS SELECT * FROM projects;

-- Schritt 5b: Abhängige Tabelle entfernen
DROP TABLE IF EXISTS project_tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Schritt 5c: Neue projects Tabelle
CREATE TABLE projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id),
    company_id  UUID REFERENCES companies(id),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    status      VARCHAR(50)  NOT NULL DEFAULT 'planning',
    priority    VARCHAR(50)  NOT NULL DEFAULT 'medium',
    start_date  DATE,
    end_date    DATE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index für schnelle Firma-Suche
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id  ON projects(tenant_id);


-- ────────────────────────────────────────────────────────────
-- 6. INVOICES – fehlende Spalten hinzufügen
--    (App nutzt tenant_id, title, amount als Dezimalzahl)
-- ────────────────────────────────────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS tenant_id   UUID REFERENCES tenants(id),
  ADD COLUMN IF NOT EXISTS title       VARCHAR(255);

-- invoice_number kann NULL sein in der App-Version
ALTER TABLE invoices
  ALTER COLUMN invoice_number DROP NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 7. USERS – fehlende Spalten hinzufügen
-- ────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Role Typ anpassen: App nutzt TEXT statt ENUM für Flexibilität
-- Falls du den ENUM behalten willst, stelle sicher dass 'manager' drin ist:
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';


-- ────────────────────────────────────────────────────────────
-- 8. Abschluss – Bestätigung
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ Migration erfolgreich abgeschlossen!';
  RAISE NOTICE '   – contacts Tabelle: bereit';
  RAISE NOTICE '   – ticket_comments Tabelle: bereit';
  RAISE NOTICE '   – projects Tabelle: neu erstellt';
  RAISE NOTICE '   – companies/tickets/invoices/users: erweitert';
END $$;
