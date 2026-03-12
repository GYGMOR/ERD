-- Migration: System Settings & Calendar

-- 1. System Settings Table (Key-Value per Category)
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    category TEXT NOT NULL, -- 'general', 'system', 'email', 'portal', 'calendar'
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    is_secret BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, category, key)
);

-- 2. Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    created_by UUID REFERENCES users(id),
    responsible_id UUID REFERENCES users(id), -- The person in charge
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_all_day BOOLEAN DEFAULT false,
    location TEXT,
    color TEXT DEFAULT 'var(--color-primary)', -- Custom event color
    status TEXT DEFAULT 'confirmed', -- confirmed, tentative, cancelled
    category TEXT, -- Meeting, Task, Internal, Client
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Calendar Event Participants
CREATE TABLE IF NOT EXISTS calendar_event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'pending', -- pending, accepted, declined, tentative
    notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- 4. Initial Seed for Settings (Optional/Reference)
-- These will be populated via the UI or a separate seed script.
