-- ============================================================
-- EstatePulse — Complete Automated Fix & Backfill Script
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to run multiple times (idempotent)
-- ============================================================

-- 1. Ensure public schema access
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Ensure organizations table & columns exist
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'EstatePulse Brokerage',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'EstatePulse Brokerage';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Ensure users table & ALL required columns exist (Fixes ERROR 42703: column "email" does not exist)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agent';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Ensure leads table & columns exist
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'New Lead';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'assigned';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Website';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS target_property TEXT DEFAULT 'General Portfolio';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget BIGINT DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget_formatted TEXT DEFAULT '$0';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS broker_id UUID;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS broker_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS broker_initials TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS broker_avatar_url TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Ensure activities table exists
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID,
  type TEXT DEFAULT 'note',
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Ensure lead_stages table & default stages exist
CREATE TABLE IF NOT EXISTS public.lead_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  order_index INT DEFAULT 0,
  color TEXT DEFAULT '#005d42',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.lead_stages) THEN
    INSERT INTO public.lead_stages (name, slug, order_index, color) VALUES
      ('Assigned', 'assigned', 1, '#005d42'),
      ('Awareness', 'awareness', 2, '#006f67'),
      ('Contacted', 'contacted', 3, '#0284c7'),
      ('Private Touring', 'touring', 4, '#7c3aed'),
      ('Offer & Escrow', 'negotiation', 5, '#d97706');
  END IF;
END $$;

-- 7. Automated Backfill: Create organization and link each auth.user (NO manual ID copying required!)
DO $$
DECLARE
  u RECORD;
  default_org_id UUID;
BEGIN
  -- First ensure at least one default organization exists
  SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
  IF default_org_id IS NULL THEN
    INSERT INTO public.organizations (name)
    VALUES ('Apex Realty Group')
    RETURNING id INTO default_org_id;
  END IF;

  -- For every registered user in auth.users, link to organization and create public.users record
  FOR u IN SELECT * FROM auth.users LOOP
    INSERT INTO public.users (id, org_id, email, full_name, role)
    VALUES (
      u.id,
      default_org_id,
      COALESCE(u.email, 'agent@estatepulse.io'),
      COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Claire Vance'),
      'admin'
    )
    ON CONFLICT (id) DO UPDATE SET
      org_id = COALESCE(public.users.org_id, EXCLUDED.org_id),
      email = EXCLUDED.email,
      full_name = COALESCE(public.users.full_name, EXCLUDED.full_name);
  END LOOP;
END $$;

-- 8. Fix Row-Level Security (RLS) policies so authenticated users can access and insert
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_stages   ENABLE ROW LEVEL SECURITY;

-- Organizations policies
DROP POLICY IF EXISTS "Users view organizations" ON public.organizations;
CREATE POLICY "Users view organizations" ON public.organizations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users insert organizations" ON public.organizations;
CREATE POLICY "Users insert organizations" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users update organizations" ON public.organizations;
CREATE POLICY "Users update organizations" ON public.organizations
  FOR UPDATE TO authenticated USING (true);

-- Users policies
DROP POLICY IF EXISTS "Users view users" ON public.users;
CREATE POLICY "Users view users" ON public.users
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users manage users" ON public.users;
CREATE POLICY "Users manage users" ON public.users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Leads policies
DROP POLICY IF EXISTS "Users view leads" ON public.leads;
CREATE POLICY "Users view leads" ON public.leads
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users manage leads" ON public.leads;
CREATE POLICY "Users manage leads" ON public.leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Activities policies
DROP POLICY IF EXISTS "Users view activities" ON public.activities;
CREATE POLICY "Users view activities" ON public.activities
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users manage activities" ON public.activities;
CREATE POLICY "Users manage activities" ON public.activities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lead stages policies
DROP POLICY IF EXISTS "Users view lead stages" ON public.lead_stages;
CREATE POLICY "Users view lead stages" ON public.lead_stages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users manage lead stages" ON public.lead_stages;
CREATE POLICY "Users manage lead stages" ON public.lead_stages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. Permissions Grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 10. Output verification query so you can see your active organization and user immediately
SELECT 
  u.id AS user_id,
  u.email AS user_email,
  u.full_name,
  u.role,
  o.id AS org_id,
  o.name AS organization_name,
  'SUCCESS: Account is linked to organization!' AS status
FROM public.users u
JOIN public.organizations o ON o.id = u.org_id;
