-- ============================================================
-- NexService – Notification Sample Data Dump
-- ============================================================

DO $$
DECLARE
  v_tenant_id   UUID;
  v_user_thomas   UUID;
  v_user_sarah    UUID;
  v_user_marco    UUID;
  -- IDs for referenceable entities (simulated or fetched)
  v_ticket_id     TEXT := 'T-8822';
  v_project_id    TEXT := 'P-101';
  v_quote_id      TEXT := 'Q-505';
  v_contract_id   TEXT := 'C-999';

BEGIN

-- 1. Prerequisites: Ensure table exists
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    user_id UUID,          
    target_role TEXT,      
    type TEXT NOT NULL,    
    entity_id TEXT,        
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'normal', 
    is_read BOOLEAN DEFAULT false,
    link TEXT,             
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 2. Fetch IDs
SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
SELECT id INTO v_user_thomas FROM users WHERE email = 'thomas.meier@nexservice.ch';
SELECT id INTO v_user_sarah FROM users WHERE email = 'sarah.keller@nexservice.ch';
SELECT id INTO v_user_marco FROM users WHERE email = 'marco.rossi@nexservice.ch';

-- 3. Clear existing notifications (optional for clean test)
-- DELETE FROM notifications;

-- 4. INSERT DATA

-- --- TICKETS ---
-- Notif 1: High Priority for Thomas
INSERT INTO notifications (tenant_id, user_id, type, entity_id, title, message, priority, link)
VALUES (v_tenant_id, v_user_thomas, 'ticket', v_ticket_id, 'Kritischer Support-Case', 'Ticket #8822 erfordert sofortige Aufmerksamkeit: Server Down.', 'high', '/tickets?openTicket=' || v_ticket_id);

-- Notif 2: Normal for Marco
INSERT INTO notifications (tenant_id, user_id, type, entity_id, title, message, priority, link)
VALUES (v_tenant_id, v_user_marco, 'ticket', 'T-9900', 'Neues Ticket zugewiesen', 'Du wurdest als Bearbeiter für "Passwort Reset" eingetragen.', 'normal', '/tickets');


-- --- PROJECTS ---
-- Notif 3: For Admins (Role-based)
INSERT INTO notifications (tenant_id, target_role, type, entity_id, title, message, priority, link)
VALUES (v_tenant_id, 'admin', 'project', v_project_id, 'Neuer Projektauftrag', 'Zunfthaus Digital hat ein neues Projekt "Website Relaunch" gestartet.', 'normal', '/projects?openProject=' || v_project_id);

-- Notif 4: High Priority for Sarah
INSERT INTO notifications (tenant_id, user_id, type, entity_id, title, message, priority, link)
VALUES (v_tenant_id, v_user_sarah, 'project', 'P-202', 'Meilenstein erreicht', 'Das Projekt "Cloud Migration" hat Meilenstein 2 abgeschlossen.', 'info', '/projects');


-- --- QUOTES / INVOICES ---
-- Notif 5: Quote for Sarah
INSERT INTO notifications (tenant_id, user_id, type, entity_id, title, message, priority, link)
VALUES (v_tenant_id, v_user_sarah, 'invoice', v_quote_id, 'Neue Offerte erstellt', 'Die Offerte Q-505 für Gastro AG wartet auf Freigabe.', 'normal', '/quotes?openQuote=' || v_quote_id);

-- Notif 6: Overdue Invoice for Thomas
INSERT INTO notifications (tenant_id, user_id, type, entity_id, title, message, priority, link)
VALUES (v_tenant_id, v_user_thomas, 'invoice', 'INV-2026-X', 'Überfällige Rechnung', 'Rechnung INV-2026-X von Solar Tech ist seit 5 Tagen fällig.', 'high', '/quotes');


-- --- CONTRACTS ---
-- Notif 7: Expiry Warning for Admin
INSERT INTO notifications (tenant_id, target_role, type, entity_id, title, message, priority, link)
VALUES (v_tenant_id, 'admin', 'contract', v_contract_id, 'Vertrag läuft aus', 'Der Hosting-Vertrag C-999 läuft am 31.03.2026 aus.', 'warning', '/contracts?openContract=' || v_contract_id);

-- Notif 8: Info for Sarah
INSERT INTO notifications (tenant_id, user_id, type, entity_id, title, message, priority, link)
VALUES (v_tenant_id, v_user_sarah, 'contract', 'C-123', 'Neuer Vertrag unterzeichnet', 'ImmoPlus GmbH hat den neuen Servicevertrag unterzeichnet.', 'info', '/contracts');


RAISE NOTICE '✅ 8 Test-Benachrichtigungen wurden erfolgreich erstellt!';
END $$;
