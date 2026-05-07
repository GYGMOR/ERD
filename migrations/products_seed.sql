-- Add missing columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Seed default HED-IT product catalog (only if table is empty for this tenant)
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM tenants LIMIT 1;
  IF tid IS NULL THEN RETURN; END IF;
  IF (SELECT COUNT(*) FROM products WHERE tenant_id = tid) > 0 THEN RETURN; END IF;

  -- ── Webprojekte (einmalig) ──────────────────────────────────
  INSERT INTO products (tenant_id, name, category, description, price, tax_rate, unit, is_recurring, is_active)
  VALUES
    (tid, 'Landing Page',            'Webprojekte', 'Einseitige Webseite',                              1500,   8.1, 'Projekt',   false, true),
    (tid, 'Unternehmenswebseite',    'Webprojekte', 'Mehrseitige Website',                              3500,   8.1, 'Projekt',   false, true),
    (tid, 'Webshop',                 'Webprojekte', 'Online-Shop mit Zahlungsabwicklung',               8000,   8.1, 'Projekt',   false, true),
    (tid, 'Web Applikation',         'Webprojekte', 'Massgeschneiderte Web-App',                       12000,   8.1, 'Projekt',   false, true),
    (tid, 'Mobile App',              'Webprojekte', 'Native iOS/Android App',                          15000,   8.1, 'Projekt',   false, true);

  -- ── Design ──────────────────────────────────────────────────
  INSERT INTO products (tenant_id, name, category, description, price, tax_rate, unit, is_recurring, is_active)
  VALUES
    (tid, 'Template Basiert',        'Design', 'Bewährte Vorlagen – im Basispreis inklusive',              0, 8.1, 'Pauschal',  false, true),
    (tid, 'Individuelles Design',    'Design', 'Design nach Ihren Wünschen',                            2000, 8.1, 'Pauschal',  false, true),
    (tid, 'Premium / 3D Design',     'Design', 'Hochwertige Animationen & 3D-Elemente',                 4500, 8.1, 'Pauschal',  false, true);

  -- ── Features / Zusätze (einmalig) ───────────────────────────
  INSERT INTO products (tenant_id, name, category, description, price, tax_rate, unit, is_recurring, is_active)
  VALUES
    (tid, 'CMS Integration',         'Features', 'Inhalte selbst bearbeiten (WordPress/Contentful)',    1600, 8.1, 'Pauschal',  false, true),
    (tid, 'SEO Optimierung',         'Features', 'Bessere Sichtbarkeit bei Google',                     1200, 8.1, 'Pauschal',  false, true),
    (tid, 'Mehrsprachigkeit',        'Features', 'Website in mehreren Sprachen',                        2100, 8.1, 'Pauschal',  false, true),
    (tid, 'Erweiterte Analyse',      'Features', 'Detaillierte Besucherstatistiken',                     800, 8.1, 'Pauschal',  false, true),
    (tid, 'Newsletter Setup',        'Features', 'E-Mail Marketing Integration',                        1200, 8.1, 'Pauschal',  false, true);

  -- ── Monatliche Services (wiederkehrend) ─────────────────────
  INSERT INTO products (tenant_id, name, category, description, price, tax_rate, unit, is_recurring, is_active)
  VALUES
    (tid, 'SEO Paket Pro',           'Monthly', 'Optimierung für Top-Rankings bei Google',               120, 8.1, 'Monat',     true,  true),
    (tid, 'Newsletter System',       'Monthly', 'E-Mail Marketing System inkl. Vorlagen',                 49, 8.1, 'Monat',     true,  true),
    (tid, 'Extended Security / WAF', 'Monthly', 'WAF & DDoS Schutz mit 24/7 Überwachung',                29, 8.1, 'Monat',     true,  true),
    (tid, 'Cloud Speicher 1TB',      'Monthly', 'Sicheres Cloud-Backup für Firmendaten',                  15, 8.1, 'Monat',     true,  true),
    (tid, 'Backup & Recovery',       'Monthly', 'Automatische Datensicherung & Wiederherstellung',        29, 8.1, 'Monat',     true,  true),
    (tid, 'Microsoft 365 Lizenz',    'Monthly', 'Microsoft 365 Business Basic Lizenz',                 12.5, 8.1, 'Monat',     true,  true),
    (tid, 'Extended Support 24/7',   'Monthly', 'Rund-um-die-Uhr Support & Monitoring',                   49, 8.1, 'Monat',     true,  true),
    (tid, 'Wartung & Hosting',       'Monthly', 'Hosting, Updates, SSL & technische Wartung',             39, 8.1, 'Monat',     true,  true);

  -- ── Stundensätze ─────────────────────────────────────────────
  INSERT INTO products (tenant_id, name, category, description, price, tax_rate, unit, is_recurring, is_active)
  VALUES
    (tid, 'Consulting / Stunde',     'Dienstleistung', 'Beratung & Konzeption (pro Stunde)',            120, 8.1, 'Stunde',    false, true),
    (tid, 'Entwicklung / Stunde',    'Dienstleistung', 'Umsetzung & Programmierung (pro Stunde)',       140, 8.1, 'Stunde',    false, true),
    (tid, 'Support / Stunde',        'Dienstleistung', 'Technischer Support (pro Stunde)',               95, 8.1, 'Stunde',    false, true);

END $$;
