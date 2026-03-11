-- ============================================================
-- NexService – Migration: Line Items
-- Fügt Positionen (Items) für Offerten, Verträge und Rechnungen hinzu.
-- ============================================================

-- 1. Items für Offerten (Offers)
CREATE TABLE IF NOT EXISTS offer_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id      UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    product_id    UUID REFERENCES products(id),
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    quantity      DECIMAL(12,2) NOT NULL DEFAULT 1,
    unit_price    DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate      DECIMAL(5,2) DEFAULT 8.10,
    total_price   DECIMAL(12,2) NOT NULL DEFAULT 0,
    sort_order    INT DEFAULT 0,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Items für Verträge (Contracts)
CREATE TABLE IF NOT EXISTS contract_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id   UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    product_id    UUID REFERENCES products(id),
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    quantity      DECIMAL(12,2) NOT NULL DEFAULT 1,
    unit_price    DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate      DECIMAL(5,2) DEFAULT 8.10,
    total_price   DECIMAL(12,2) NOT NULL DEFAULT 0,
    sort_order    INT DEFAULT 0,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Items für Rechnungen (Invoices)
CREATE TABLE IF NOT EXISTS invoice_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id    UUID REFERENCES products(id),
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    quantity      DECIMAL(12,2) NOT NULL DEFAULT 1,
    unit_price    DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate      DECIMAL(5,2) DEFAULT 8.10,
    total_price   DECIMAL(12,2) NOT NULL DEFAULT 0,
    sort_order    INT DEFAULT 0,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexe für Performance
CREATE INDEX IF NOT EXISTS idx_offer_items_offer ON offer_items(offer_id);
CREATE INDEX IF NOT EXISTS idx_contract_items_contract ON contract_items(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

DO $$
BEGIN
  RAISE NOTICE '✅ Migration Line Items erfolgreich!';
END $$;
