-- ============================================================
-- NexService – Seed Data (Testdaten) v3
-- ⚠️  admin_user.sql muss zuerst ausgeführt worden sein!
-- ============================================================

-- Schritt 1: contacts-Tabelle korrekt vorbereiten (alte Struktur ersetzen)
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

-- Schritt 2: projects-Tabelle korrekt vorbereiten
DROP TABLE IF EXISTS project_tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
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

-- Schritt 3: ticket_comments-Tabelle erstellen (falls noch nicht vorhanden)
CREATE TABLE IF NOT EXISTS ticket_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id),
    body        TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schritt 4: Fehlende Spalten in bestehenden Tabellen ergänzen
ALTER TABLE companies  ADD COLUMN IF NOT EXISTS phone      VARCHAR(50);
ALTER TABLE companies  ADD COLUMN IF NOT EXISTS city       VARCHAR(100);
ALTER TABLE companies  ADD COLUMN IF NOT EXISTS country    VARCHAR(100);
ALTER TABLE companies  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN DEFAULT TRUE;
ALTER TABLE companies  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Status-Spalten auf VARCHAR umstellen (verhindert ENUM-Fehler und erhöht Flexibilität)
ALTER TABLE tickets    ALTER COLUMN status TYPE VARCHAR(50);
ALTER TABLE tickets    ADD COLUMN IF NOT EXISTS tenant_id  UUID REFERENCES tenants(id);
ALTER TABLE tickets    ADD COLUMN IF NOT EXISTS type       VARCHAR(50) DEFAULT 'support';
ALTER TABLE tickets    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE invoices   ALTER COLUMN status TYPE VARCHAR(50);
ALTER TABLE invoices   ADD COLUMN IF NOT EXISTS tenant_id  UUID REFERENCES tenants(id);
ALTER TABLE invoices   ADD COLUMN IF NOT EXISTS title      VARCHAR(255);
ALTER TABLE invoices   ALTER COLUMN invoice_number DROP NOT NULL;

ALTER TABLE users      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users      ALTER COLUMN role TYPE VARCHAR(50);


-- ============================================================
-- Schritt 5: Testdaten einfügen (alles in einem Block)
-- ============================================================
DO $$
DECLARE
  v_tenant_id   UUID;
  v_admin_id    UUID;
  v_user_sarah  UUID;
  v_user_marco  UUID;
  v_user_lisa   UUID;
  v_user_thomas UUID;
  v_co_techwave   UUID;
  v_co_bauloesung UUID;
  v_co_alpinemed  UUID;
  v_co_zunfthaus  UUID;
  v_co_digismart  UUID;
  v_tkt1 UUID; v_tkt2 UUID; v_tkt3 UUID;
  v_tkt4 UUID; v_tkt5 UUID; v_tkt6 UUID;
  v_tkt7 UUID; v_tkt8 UUID;

BEGIN

-- ── Tenant & Admin ──────────────────────────────────────────
SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
SELECT id INTO v_admin_id  FROM users WHERE email = 'admin@vierkorken.ch';
IF v_tenant_id IS NULL THEN
  RAISE EXCEPTION 'Kein Tenant! Zuerst admin_user.sql ausführen.';
END IF;

-- ── Mitarbeiter ─────────────────────────────────────────────
INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
VALUES
  (v_tenant_id, 'sarah.mueller@vierkorken.ch', crypt('Init1234!', gen_salt('bf')), 'Sarah',  'Müller',  'employee', true),
  (v_tenant_id, 'marco.rossi@vierkorken.ch',   crypt('Init1234!', gen_salt('bf')), 'Marco',  'Rossi',   'manager',  true),
  (v_tenant_id, 'lisa.keller@vierkorken.ch',   crypt('Init1234!', gen_salt('bf')), 'Lisa',   'Keller',  'employee', true),
  (v_tenant_id, 'thomas.bauer@vierkorken.ch',  crypt('Init1234!', gen_salt('bf')), 'Thomas', 'Bauer',   'employee', true)
ON CONFLICT (email) DO NOTHING;

SELECT id INTO v_user_sarah  FROM users WHERE email = 'sarah.mueller@vierkorken.ch';
SELECT id INTO v_user_marco  FROM users WHERE email = 'marco.rossi@vierkorken.ch';
SELECT id INTO v_user_lisa   FROM users WHERE email = 'lisa.keller@vierkorken.ch';
SELECT id INTO v_user_thomas FROM users WHERE email = 'thomas.bauer@vierkorken.ch';

-- ── Firmen ──────────────────────────────────────────────────
INSERT INTO companies (tenant_id, name, industry, website, phone, city, country, is_active)
VALUES
  (v_tenant_id, 'TechWave AG',         'Informationstechnologie', 'https://techwave.ch',   '+41 44 123 45 67', 'Zürich',  'CH', true),
  (v_tenant_id, 'Baulösung GmbH',      'Bauwesen',                'https://bauloesung.ch', '+41 31 234 56 78', 'Bern',    'CH', true),
  (v_tenant_id, 'AlpineMed Klinik AG', 'Gesundheitswesen',        'https://alpinemed.ch',  '+41 27 345 67 89', 'Sion',    'CH', true),
  (v_tenant_id, 'Zunfthaus Digital',   'Marketing & Design',      'https://zunfthaus.ch',  '+41 61 456 78 90', 'Basel',   'CH', true),
  (v_tenant_id, 'DigiSmart Sarl',      'E-Commerce',              'https://digismart.ch',  '+41 22 567 89 01', 'Genf',    'CH', true);

SELECT id INTO v_co_techwave   FROM companies WHERE name = 'TechWave AG';
SELECT id INTO v_co_bauloesung FROM companies WHERE name = 'Baulösung GmbH';
SELECT id INTO v_co_alpinemed  FROM companies WHERE name = 'AlpineMed Klinik AG';
SELECT id INTO v_co_zunfthaus  FROM companies WHERE name = 'Zunfthaus Digital';
SELECT id INTO v_co_digismart  FROM companies WHERE name = 'DigiSmart Sarl';

-- ── Kontakte ────────────────────────────────────────────────
INSERT INTO contacts (tenant_id, company_id, first_name, last_name, email, phone, role, is_active)
VALUES
  (v_tenant_id, v_co_techwave,   'Hans',     'Zimmermann', 'h.zimmermann@techwave.ch',  '+41 44 123 45 68', 'CEO',                true),
  (v_tenant_id, v_co_techwave,   'Petra',    'Schmid',     'p.schmid@techwave.ch',      '+41 44 123 45 69', 'IT-Leiterin',         true),
  (v_tenant_id, v_co_bauloesung, 'Werner',   'Frei',       'w.frei@bauloesung.ch',      '+41 31 234 56 79', 'Projektleiter',       true),
  (v_tenant_id, v_co_bauloesung, 'Claudia',  'Lanz',       'c.lanz@bauloesung.ch',      '+41 31 234 56 80', 'Buchhaltung',         true),
  (v_tenant_id, v_co_alpinemed,  'René',     'Favre',      'r.favre@alpinemed.ch',      '+41 27 345 67 90', 'Chefarzt',            true),
  (v_tenant_id, v_co_alpinemed,  'Chantal',  'Bonvin',     'c.bonvin@alpinemed.ch',     '+41 27 345 67 91', 'IT-Verantwortliche',  true),
  (v_tenant_id, v_co_zunfthaus,  'Nico',     'Vogt',       'n.vogt@zunfthaus.ch',       '+41 61 456 78 91', 'Creative Director',   true),
  (v_tenant_id, v_co_digismart,  'Amelie',   'Dubois',     'a.dubois@digismart.ch',     '+41 22 567 89 02', 'CEO',                true),
  (v_tenant_id, v_co_digismart,  'Luca',     'Ferrari',    'l.ferrari@digismart.ch',    '+41 22 567 89 03', 'CTO',                true);

-- ── Tickets ─────────────────────────────────────────────────
INSERT INTO tickets (tenant_id, company_id, assignee_id, title, description, status, priority, type, created_at, updated_at)
VALUES (v_tenant_id, v_co_techwave, v_user_sarah,
  'VPN-Verbindung bricht regelmässig ab',
  'Seit dem letzten Windows-Update (KB5032189) verlieren mehrere Mitarbeiter alle 30 Minuten ihre VPN-Verbindung. Betroffen: 12 Benutzer im Zürcher Büro.',
  'in_progress', 'high', 'support', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 hour')
RETURNING id INTO v_tkt1;

INSERT INTO tickets (tenant_id, company_id, assignee_id, title, description, status, priority, type, created_at, updated_at)
VALUES (v_tenant_id, v_co_bauloesung, v_user_marco,
  'E-Mail Server nicht erreichbar',
  'Der Exchange-Server antwortet seit heute Morgen 06:15 Uhr nicht mehr. Alle eingehenden Mails werden zurückgesendet. Dringend!',
  'open', 'critical', 'incident', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '30 minutes')
RETURNING id INTO v_tkt2;

INSERT INTO tickets (tenant_id, company_id, assignee_id, title, description, status, priority, type, created_at, updated_at)
VALUES (v_tenant_id, v_co_alpinemed, v_user_lisa,
  'Drucker im 3. OG druckt nicht mehr',
  'HP LaserJet Pro M404n gibt Papierstau-Fehler aus, obwohl kein Papier eingeklemmt ist. Neustart hilft nicht.',
  'new', 'medium', 'support', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
RETURNING id INTO v_tkt3;

INSERT INTO tickets (tenant_id, company_id, assignee_id, title, description, status, priority, type, created_at, updated_at)
VALUES (v_tenant_id, v_co_zunfthaus, v_user_thomas,
  'Website lädt sehr langsam',
  'Die Kundenwebsite brauchte gestern bis zu 12 Sekunden zum Laden. Google PageSpeed Score: 23. Bitte dringend optimieren.',
  'in_progress', 'high', 'support', NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 hours')
RETURNING id INTO v_tkt4;

INSERT INTO tickets (tenant_id, company_id, assignee_id, title, description, status, priority, type, created_at, updated_at)
VALUES (v_tenant_id, v_co_digismart, v_user_sarah,
  'SSL-Zertifikat läuft in 7 Tagen ab',
  'Das SSL-Zertifikat für shop.digismart.ch läuft am 18.03.2026 ab. Bitte erneuern bevor Kunden Warnmeldungen sehen.',
  'new', 'high', 'maintenance', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours')
RETURNING id INTO v_tkt5;

INSERT INTO tickets (tenant_id, company_id, assignee_id, title, description, status, priority, type, created_at, updated_at)
VALUES (v_tenant_id, v_co_techwave, v_user_marco,
  'Backup-Lösung konfigurieren',
  'Neue Backup-Strategie nach 3-2-1-Regel implementieren: 3 Kopien, 2 verschiedene Medien, 1 offsite. Veeam-Lizenz ist vorhanden.',
  'pending', 'medium', 'project', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days')
RETURNING id INTO v_tkt6;

INSERT INTO tickets (tenant_id, company_id, assignee_id, title, description, status, priority, type, created_at, updated_at)
VALUES (v_tenant_id, v_co_bauloesung, v_user_lisa,
  'Neuer Mitarbeiter: PC Setup und Accounts',
  'Ab 15.04.2026 startet Herr Aldo Bernardi als Bauleiter. Benötigt: Laptop, Microsoft 365 Lizenz, VPN-Zugang, CAD-Software.',
  'resolved', 'low', 'support', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day')
RETURNING id INTO v_tkt7;

INSERT INTO tickets (tenant_id, company_id, assignee_id, title, description, status, priority, type, created_at, updated_at)
VALUES (v_tenant_id, v_co_alpinemed, v_admin_id,
  'Server-Raum Klimaanlage ausgefallen',
  'Die Klimaanlage im Server-Raum zeigt Fehlercode E3. Temperatur bereits bei 35 Grad. KRITISCH – Server könnten überhitzen!',
  'open', 'critical', 'incident', NOW() - INTERVAL '2 hours', NOW())
RETURNING id INTO v_tkt8;

-- ── Ticket Kommentare ────────────────────────────────────────
INSERT INTO ticket_comments (ticket_id, user_id, body, is_internal, created_at) VALUES
  (v_tkt1, v_user_sarah, 'MTU-Problem nach Windows Update. Lösung: MTU auf 1400 setzen.', true,  NOW() - INTERVAL '2 days 4 hours'),
  (v_tkt1, v_user_marco, 'Gute Analyse! Bitte auf allen betroffenen Geräten ausrollen.', true,  NOW() - INTERVAL '2 days 2 hours'),
  (v_tkt1, v_user_sarah, 'Rollout auf 6 von 12 Geräten abgeschlossen. Bisher keine weiteren Abbrüche.', false, NOW() - INTERVAL '1 day');

INSERT INTO ticket_comments (ticket_id, user_id, body, is_internal, created_at) VALUES
  (v_tkt2, v_user_marco, 'MX-Record zeigt auf falsche IP. DNS-Änderung gestern Nacht?', true, NOW() - INTERVAL '5 hours'),
  (v_tkt2, v_admin_id,   'Ja, Hosting-Provider hat gestern Nacht IP geändert ohne Vorankündigung.', true, NOW() - INTERVAL '4 hours 30 minutes'),
  (v_tkt2, v_user_marco, 'Bin mit support@hoststar.ch im Chat. ETA für Fix: ~1 Stunde.', false, NOW() - INTERVAL '4 hours');

INSERT INTO ticket_comments (ticket_id, user_id, body, is_internal, created_at) VALUES
  (v_tkt4, v_user_thomas, '3 unkomprimierte Bilder (je ca. 8MB), kein Caching, kein CDN. Das ist der Hauptgrund.', true, NOW() - INTERVAL '1 day 8 hours'),
  (v_tkt4, v_user_thomas, 'Bilder optimiert (WebP), Redis-Cache aktiviert. Score jetzt 71. CDN noch ausstehend.', false, NOW() - INTERVAL '4 hours');

INSERT INTO ticket_comments (ticket_id, user_id, body, is_internal, created_at) VALUES
  (v_tkt8, v_admin_id,   'Externe Techniker von Cooltech AG alarmiert. ETA: 45 Minuten. Server herunterfahren?', true, NOW() - INTERVAL '1 hour 45 minutes'),
  (v_tkt8, v_user_marco, 'Ja, alle nicht-kritischen Systeme herunterfahren. Patientendaten-Server müssen laufen.', true, NOW() - INTERVAL '1 hour 30 minutes'),
  (v_tkt8, v_admin_id,   'Erledigt. 8 Server heruntergefahren. Techniker unterwegs.', false, NOW() - INTERVAL '1 hour 20 minutes');

-- ── Projekte ─────────────────────────────────────────────────
INSERT INTO projects (tenant_id, company_id, name, description, status, priority, start_date, end_date, created_at, updated_at)
VALUES
  (v_tenant_id, v_co_techwave,
   'Microsoft 365 Migration',
   'Vollstaendige Migration von On-Premise Exchange + File-Server zu Microsoft 365. 45 User, 3 Standorte. Teams-Rollout und Schulungen inklusive.',
   'active', 'high', '2026-02-01', '2026-04-30', NOW() - INTERVAL '40 days', NOW() - INTERVAL '2 days'),

  (v_tenant_id, v_co_zunfthaus,
   'Website Relaunch 2026',
   'Kompletter Neuaufbau der Unternehmenswebsite auf WordPress + WooCommerce. Mehrsprachig (DE/FR/EN), DSGVO-konform.',
   'active', 'high', '2026-01-15', '2026-03-31', NOW() - INTERVAL '55 days', NOW() - INTERVAL '1 day'),

  (v_tenant_id, v_co_bauloesung,
   'NAS & Backup Infrastruktur',
   'Synology NAS (48TB) einrichten, Veeam Backup konfigurieren, 3-2-1-Strategie. Offsite-Backup via Wasabi S3.',
   'planning', 'medium', '2026-04-01', '2026-05-15', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

  (v_tenant_id, v_co_alpinemed,
   'WLAN-Ausbau Klinik',
   'Erweiterung des WLAN-Netzes auf alle 5 Stockwerke inkl. Aussenbereich. 32 neue Access Points (Cisco Meraki).',
   'completed', 'high', '2025-11-01', '2026-02-28', NOW() - INTERVAL '130 days', NOW() - INTERVAL '10 days');

-- ── Rechnungen ───────────────────────────────────────────────
INSERT INTO invoices (tenant_id, company_id, title, invoice_number, amount, status, issue_date, due_date, created_at)
VALUES
  (v_tenant_id, v_co_techwave,   'Microsoft 365 Migration – Phase 1',         'RE-2026-001', 4800.00,  'paid',    '2026-02-01', '2026-03-01', NOW() - INTERVAL '38 days'),
  (v_tenant_id, v_co_alpinemed,  'WLAN-Ausbau Klinik – Abschlussrechnung',    'RE-2026-002', 12450.00, 'paid',    '2026-03-01', '2026-03-31', NOW() - INTERVAL '10 days'),
  (v_tenant_id, v_co_zunfthaus,  'Website Relaunch – Design & UX Phase',      'RE-2026-003', 3200.00,  'paid',    '2026-01-20', '2026-02-20', NOW() - INTERVAL '50 days'),
  (v_tenant_id, v_co_techwave,   'Microsoft 365 Migration – Phase 2',         'RE-2026-004', 5600.00,  'sent',    '2026-03-05', '2026-04-05', NOW() - INTERVAL '6 days'),
  (v_tenant_id, v_co_zunfthaus,  'Website Relaunch – Entwicklung & CMS',      'RE-2026-005', 5800.00,  'sent',    '2026-03-08', '2026-04-08', NOW() - INTERVAL '3 days'),
  (v_tenant_id, v_co_bauloesung, 'NAS & Backup – Hardware Beschaffung',       'RE-2026-006', 7350.00,  'sent',    '2026-03-10', '2026-04-10', NOW() - INTERVAL '1 day'),
  (v_tenant_id, v_co_digismart,  'SSL-Zertifikat & Wartungsvertrag Q2',       'RE-2026-007', 890.00,   'draft',   NULL,         NULL,         NOW()),
  (v_tenant_id, v_co_bauloesung, 'NAS & Backup – Konfiguration',              'RE-2026-008', 2400.00,  'draft',   NULL,         NULL,         NOW()),
  (v_tenant_id, v_co_alpinemed,  'IT-Support Abonnement Q4 2025',             'RE-2025-089', 1800.00,  'overdue', '2025-12-01', '2026-01-01', NOW() - INTERVAL '70 days'),
  (v_tenant_id, v_co_digismart,  'Notfall-Support E-Mail Server Dezember',    'RE-2025-092', 650.00,   'overdue', '2025-12-15', '2026-01-15', NOW() - INTERVAL '55 days');

RAISE NOTICE '===========================================';
RAISE NOTICE '✅ Testdaten erfolgreich eingefügt!';
RAISE NOTICE '   4 Mitarbeiter | 5 Firmen | 9 Kontakte';
RAISE NOTICE '   8 Tickets | 11 Kommentare';
RAISE NOTICE '   4 Projekte | 10 Rechnungen';
RAISE NOTICE '===========================================';

END $$;
