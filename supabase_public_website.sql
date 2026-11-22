-- ============================================================
-- EstatePulse — Public Property Website Add-on
-- Run in Supabase Dashboard → SQL Editor
-- Idempotent (safe to run multiple times)
-- ============================================================

-- 1. Add website_slug and whatsapp_number to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS website_slug  TEXT UNIQUE;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- 2. Add is_public flag to properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_organizations_website_slug ON public.organizations (website_slug)
  WHERE website_slug IS NOT NULL;

-- 4. Index for fast public listing queries
CREATE INDEX IF NOT EXISTS idx_properties_org_public ON public.properties (org_id, is_public, status)
  WHERE is_public = TRUE;

-- 5. Allow anonymous users to read organizations by slug (public portal)
DROP POLICY IF EXISTS "Public portal can read org by slug" ON public.organizations;
CREATE POLICY "Public portal can read org by slug" ON public.organizations
  FOR SELECT
  USING (website_slug IS NOT NULL);

-- 6. Allow anonymous users to read public active listings
DROP POLICY IF EXISTS "Public portal can read public properties" ON public.properties;
CREATE POLICY "Public portal can read public properties" ON public.properties
  FOR SELECT
  USING (
    is_public = TRUE
    AND status = 'Active Listing'
    AND org_id IN (
      SELECT id FROM public.organizations WHERE website_slug IS NOT NULL
    )
  );

SELECT 'EstatePulse Public Website Add-on schema ready ✓' AS status;
