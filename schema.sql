-- ================================================================
-- POLICE DUTY CARD & PASS PORTAL - SUPABASE SQL SCHEMA
-- Run this in your Supabase Project -> SQL Editor -> Click 'Run'
-- ================================================================

-- 1. Create the police_events table
CREATE TABLE IF NOT EXISTS public.police_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    start_date TEXT,
    status TEXT DEFAULT 'active',
    signatory_text TEXT DEFAULT 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
    signature_img TEXT,
    note TEXT,
    is_note_enabled BOOLEAN DEFAULT FALSE,
    briefing TEXT,
    is_briefing_enabled BOOLEAN DEFAULT FALSE,
    records JSONB DEFAULT '[]'::jsonb,
    attendance_map JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.police_events ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow Public Read (Protects auth credentials registry)
DROP POLICY IF EXISTS "Public can view police events" ON public.police_events;
CREATE POLICY "Public can view police events" 
ON public.police_events 
FOR SELECT 
USING (id NOT LIKE 'global-auth%');

-- 4. Policy: Allow Public/Admin Insert & Update
DROP POLICY IF EXISTS "Allow all insert on police events" ON public.police_events;
CREATE POLICY "Allow all insert on police events" 
ON public.police_events 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all update on police events" ON public.police_events;
CREATE POLICY "Allow all update on police events" 
ON public.police_events 
FOR UPDATE 
USING (true);

-- 5. Policy: Prevent accidental deletion of system configuration rows
DROP POLICY IF EXISTS "Allow all delete on police events" ON public.police_events;
CREATE POLICY "Allow delete on police events" 
ON public.police_events 
FOR DELETE 
USING (id NOT LIKE 'global-%');

-- 5. Enable Realtime on police_events table
ALTER PUBLICATION supabase_realtime ADD TABLE public.police_events;
