-- ============================================================
-- EstatePulse Brokerage Pro — Step 7: Team Invites & Multi-User Access
-- Run this in: Supabase Dashboard → SQL Editor
-- This script is fully idempotent (safe to run multiple times)
-- ============================================================

-- 1. Ensure schema permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Ensure columns exist on public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agent';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Create team_invites table
CREATE TABLE IF NOT EXISTS public.team_invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'agent',
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_team_invites_org_id ON public.team_invites (org_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON public.team_invites (LOWER(email));

-- 4. Enable Row Level Security on team_invites
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Org members can view invites for their organization
DROP POLICY IF EXISTS "Org members view invites" ON public.team_invites;
CREATE POLICY "Org members view invites" ON public.team_invites
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

-- Org members can create invites for their organization
DROP POLICY IF EXISTS "Org members create invites" ON public.team_invites;
CREATE POLICY "Org members create invites" ON public.team_invites
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

-- Org members can revoke/delete invites for their organization
DROP POLICY IF EXISTS "Org members delete invites" ON public.team_invites;
CREATE POLICY "Org members delete invites" ON public.team_invites
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

-- Also ensure org members can see other team members in public.users
DROP POLICY IF EXISTS "Org members see team members" ON public.users;
CREATE POLICY "Org members see team members" ON public.users
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

-- Permissions
GRANT ALL ON TABLE public.team_invites TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_invites TO authenticated;

-- 5. Updated handle_new_user() Trigger Function
-- Automatically links users with an active invite to the existing organization.
-- If no invite exists, creates a fresh new organization as normal.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
  new_org_id    UUID;
  org_name      TEXT;
BEGIN
  -- Check if user's email was invited to an existing organization
  SELECT id, org_id, role
  INTO invite_record
  FROM public.team_invites
  WHERE LOWER(email) = LOWER(NEW.email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF invite_record.org_id IS NOT NULL THEN
    -- ── Case A: User was invited! Link to existing organization ──
    INSERT INTO public.users (id, org_id, email, full_name, role)
    VALUES (
      NEW.id,
      invite_record.org_id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      COALESCE(invite_record.role, 'agent')
    )
    ON CONFLICT (id) DO UPDATE SET
      org_id = EXCLUDED.org_id,
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;

    -- Delete the processed invite
    DELETE FROM public.team_invites WHERE id = invite_record.id;

  ELSE
    -- ── Case B: Normal Signup. Create new organization ──
    org_name := COALESCE(
      NEW.raw_user_meta_data->>'org_name',
      split_part(NEW.email, '@', 1) || '''s Brokerage'
    );

    INSERT INTO public.organizations (name)
    VALUES (org_name)
    RETURNING id INTO new_org_id;

    INSERT INTO public.users (id, org_id, email, full_name, role)
    VALUES (
      NEW.id,
      new_org_id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      'admin'
    )
    ON CONFLICT (id) DO UPDATE SET
      org_id = EXCLUDED.org_id,
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 6. Re-attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
