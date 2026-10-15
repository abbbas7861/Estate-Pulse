-- ============================================================
-- EstatePulse Brokerage Pro — Step 6: Stripe Billing & Subscription Tiers
-- Run this in Supabase Dashboard → SQL Editor
-- This script is fully idempotent (safe to run multiple times)
-- ============================================================

-- 1. Ensure permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Add subscription & Stripe billing columns to public.organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- 3. Add check constraint for valid subscription tiers if not already present
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

-- 4. Create index for fast customer lookup during Stripe webhook processing
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_cust 
  ON public.organizations (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_organizations_tier 
  ON public.organizations (subscription_tier);

-- 5. RLS: Org members can view their organization's subscription tier
-- Ensure organizations table has proper SELECT policy
DROP POLICY IF EXISTS "Org members view own organization" ON public.organizations;
CREATE POLICY "Org members view own organization" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

-- Service role can update subscription info (used by edge functions/webhooks)
GRANT ALL ON TABLE public.organizations TO service_role;
GRANT SELECT ON TABLE public.organizations TO authenticated, anon;
