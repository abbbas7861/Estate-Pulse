-- ============================================================
-- EstatePulse Brokerage Pro — Supabase Database Setup
-- Run this entire script in: Supabase Dashboard → SQL Editor
-- This script is fully idempotent (safe to run multiple times)
-- ============================================================

-- Grant schema access
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 1. Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users table (links auth.users → organization)
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  stage             TEXT NOT NULL DEFAULT 'assigned',
  source            TEXT,
  target_property   TEXT,
  budget            BIGINT DEFAULT 0,
  budget_formatted  TEXT,
  broker_id         UUID,
  broker_name       TEXT,
  broker_initials   TEXT,
  broker_avatar_url TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mls_id           TEXT NOT NULL,
  title            TEXT NOT NULL,
  address          TEXT,
  status           TEXT NOT NULL DEFAULT 'active',
  type             TEXT,
  price            BIGINT DEFAULT 0,
  price_formatted  TEXT,
  beds             INT DEFAULT 0,
  baths            NUMERIC(4,1) DEFAULT 0,
  sqft             INT DEFAULT 0,
  sqft_formatted   TEXT,
  broker_name      TEXT,
  is_favorite      BOOLEAN DEFAULT FALSE,
  image_url        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Row Level Security — users can only see their own org's data
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties    ENABLE ROW LEVEL SECURITY;

-- Policies for organizations (drop before create so re-running never errors)
DROP POLICY IF EXISTS "Users see their own org" ON public.organizations;
CREATE POLICY "Users see their own org" ON public.organizations
  FOR ALL USING (
    id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

-- Policies for users
DROP POLICY IF EXISTS "Users see own row" ON public.users;
CREATE POLICY "Users see own row" ON public.users
  FOR ALL USING (id = auth.uid());

-- Policies for leads
DROP POLICY IF EXISTS "Org members see org leads" ON public.leads;
CREATE POLICY "Org members see org leads" ON public.leads
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

-- Policies for properties
DROP POLICY IF EXISTS "Org members see org properties" ON public.properties;
CREATE POLICY "Org members see org properties" ON public.properties
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

-- Grant table & sequence access
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 6. Auto-create org + user row when someone signs up
--    (triggered by supabase.auth.signUp with metadata org_name)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  org_name   TEXT;
BEGIN
  -- Get org name from signup metadata, fallback to email prefix
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'org_name',
    split_part(NEW.email, '@', 1) || '''s Brokerage'
  );

  -- Create the organization
  INSERT INTO public.organizations (name)
  VALUES (org_name)
  RETURNING id INTO new_org_id;

  -- Create the user row linked to the org
  INSERT INTO public.users (id, org_id, email, full_name)
  VALUES (
    NEW.id,
    new_org_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    org_id = EXCLUDED.org_id,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Done!
SELECT 'EstatePulse database setup complete ✓' AS status;
