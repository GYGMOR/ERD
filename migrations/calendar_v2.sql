-- Migration: Calendar Enhancements V2
-- Adds availability status, privacy, and reminders

ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'busy', -- busy, free, tentative, out_of_office
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_minutes INT;

-- Ensure description is TEXT (already exists, but just in case)
-- ALTER TABLE calendar_events ALTER COLUMN description TYPE TEXT;
