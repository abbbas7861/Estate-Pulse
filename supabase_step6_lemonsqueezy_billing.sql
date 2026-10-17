-- ============================================================
-- EstatePulse Brokerage Pro — Step 6: Lemon Squeezy Billing & 14-Day Free Trial
-- Run this in Supabase Dashboard → SQL Editor
-- This script is fully idempotent (safe to run multiple times)
-- ============================================================

-- 1. Ensure schema permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Add Lemon Squeezy billing & 14-day trial columns to public.organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS lemonsqueezy_customer_id TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS lemonsqueezy_subscription_id TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days');

-- 3. Initialize 14-day trial for any existing organizations missing trial_ends_at
UPDATE public.organizations
SET trial_ends_at = now() + interval '14 days'
WHERE trial_ends_at IS NULL;

-- 4. Ensure valid subscription tier check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_valid_subscription_tier'
  ) THEN
    ALTER TABLE public.organizations 
      ADD CONSTRAINT check_valid_subscription_tier 
      CHECK (subscription_tier IN ('free', 'pro', 'enterprise'));
  END IF;
END $$;

-- 5. Indexes for fast customer & subscription lookups
CREATE INDEX IF NOT EXISTS idx_organizations_ls_cust 
  ON public.organizations (lemonsqueezy_customer_id);

CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends 
  ON public.organizations (trial_ends_at);

-- 6. RLS: Org members can view their organization's subscription & trial status
DROP POLICY IF EXISTS "Org members view own organization" ON public.organizations;
CREATE POLICY "Org members view own organization" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

GRANT ALL ON TABLE public.organizations TO service_role;
GRANT SELECT ON TABLE public.organizations TO authenticated, anon;
