-- ============================================================
-- EstatePulse Brokerage Pro — Step 5: Analytics & Team Telemetry
-- Run this in Supabase Dashboard → SQL Editor
-- Fully idempotent and non-destructive
-- ============================================================

-- 1. Ensure permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Performance indexes for high-velocity analytics queries
CREATE INDEX IF NOT EXISTS idx_leads_org_created ON public.leads (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_org_stage ON public.leads (org_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_org_assigned ON public.leads (org_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_org_budget ON public.leads (org_id, budget);
CREATE INDEX IF NOT EXISTS idx_properties_org_type ON public.properties (org_id, type);
CREATE INDEX IF NOT EXISTS idx_activities_org_lead ON public.activities (org_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_org_user ON public.activities (org_id, user_id);

-- 3. Additional profile fields for team agents on public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agent';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS quota_target NUMERIC DEFAULT 10000000;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS response_time_mins INT DEFAULT 8;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT 'Senior Broker Associate';

-- 4. View: v_lead_funnel
-- Aggregates leads through the standard 8-stage brokerage pipeline
DROP VIEW IF EXISTS public.v_lead_funnel CASCADE;
CREATE OR REPLACE VIEW public.v_lead_funnel AS
SELECT
  l.org_id,
  CASE
    WHEN LOWER(l.stage) IN ('assigned', 'stage-1') THEN 'Assigned'
    WHEN LOWER(l.stage) IN ('awareness', 'stage-2') THEN 'Awareness'
    WHEN LOWER(l.stage) IN ('contacted', 'stage-3') THEN 'Contacted'
    WHEN LOWER(l.stage) IN ('interest', 'touring', 'private touring', 'stage-4') THEN 'Interest'
    WHEN LOWER(l.stage) IN ('conversion', 'meeting', 'scheduled') THEN 'Conversion'
    WHEN LOWER(l.stage) IN ('qualification', 'underwriting', 'verified') THEN 'Qualification'
    WHEN LOWER(l.stage) IN ('closing', 'negotiation', 'offer & escrow', 'escrow', 'won', 'closed') THEN 'Closing'
    WHEN LOWER(l.stage) IN ('rejected', 'lost', 'archived') THEN 'Rejected'
    ELSE 'Assigned'
  END AS stage_name,
  CASE
    WHEN LOWER(l.stage) IN ('assigned', 'stage-1') THEN 1
    WHEN LOWER(l.stage) IN ('awareness', 'stage-2') THEN 2
    WHEN LOWER(l.stage) IN ('contacted', 'stage-3') THEN 3
    WHEN LOWER(l.stage) IN ('interest', 'touring', 'private touring', 'stage-4') THEN 4
    WHEN LOWER(l.stage) IN ('conversion', 'meeting', 'scheduled') THEN 5
    WHEN LOWER(l.stage) IN ('qualification', 'underwriting', 'verified') THEN 6
    WHEN LOWER(l.stage) IN ('closing', 'negotiation', 'offer & escrow', 'escrow', 'won', 'closed') THEN 7
    WHEN LOWER(l.stage) IN ('rejected', 'lost', 'archived') THEN 8
    ELSE 1
  END AS stage_order,
  COUNT(l.id) AS lead_count,
  COALESCE(SUM(l.budget), 0) AS total_pipeline_value,
  MIN(l.created_at) AS earliest_lead,
  MAX(l.created_at) AS latest_lead
FROM public.leads l
GROUP BY l.org_id, stage_name, stage_order;

-- 5. View: v_employee_summary
-- Aggregates performance per broker / team member
DROP VIEW IF EXISTS public.v_employee_summary CASCADE;
CREATE OR REPLACE VIEW public.v_employee_summary AS
SELECT
  u.org_id,
  u.id AS user_id,
  COALESCE(u.full_name, split_part(u.email, '@', 1)) AS agent_name,
  u.email AS agent_email,
  u.phone AS agent_phone,
  COALESCE(u.specialty, u.role, 'Broker Associate') AS agent_role,
  u.avatar_url,
  COUNT(l.id) AS total_leads,
  COUNT(l.id) FILTER (WHERE LOWER(l.stage) NOT IN ('closing', 'negotiation', 'offer & escrow', 'escrow', 'won', 'closed', 'rejected', 'lost')) AS assigned_active,
  COUNT(l.id) FILTER (WHERE LOWER(l.stage) IN ('closing', 'negotiation', 'offer & escrow', 'escrow', 'won', 'closed')) AS won_count,
  COUNT(l.id) FILTER (WHERE LOWER(l.stage) IN ('rejected', 'lost')) AS lost_count,
  COALESCE(SUM(l.budget) FILTER (WHERE LOWER(l.stage) NOT IN ('rejected', 'lost')), 0) AS pipeline_value,
  COALESCE(SUM(l.budget) FILTER (WHERE LOWER(l.stage) IN ('closing', 'negotiation', 'offer & escrow', 'escrow', 'won', 'closed')), 0) AS closed_volume,
  ROUND(
    CASE
      WHEN COUNT(l.id) > 0 THEN (COUNT(l.id) FILTER (WHERE LOWER(l.stage) IN ('closing', 'negotiation', 'offer & escrow', 'escrow', 'won', 'closed'))::NUMERIC / COUNT(l.id)::NUMERIC) * 100
      ELSE 0
    END, 1
  ) AS conversion_pct,
  COALESCE(u.response_time_mins, 8) AS avg_response_mins,
  COALESCE(u.quota_target, 10000000) AS quota_target,
  ROUND(
    CASE
      WHEN COALESCE(u.quota_target, 0) > 0 THEN
        (COALESCE(SUM(l.budget) FILTER (WHERE LOWER(l.stage) IN ('closing', 'negotiation', 'offer & escrow', 'escrow', 'won', 'closed')), 0)::NUMERIC / u.quota_target::NUMERIC) * 100
      ELSE 0
    END, 1
  ) AS target_achievement_pct
FROM public.users u
LEFT JOIN public.leads l ON (l.assigned_to = u.id OR (l.assigned_to IS NULL AND l.broker_name = u.full_name))
GROUP BY u.org_id, u.id, u.full_name, u.email, u.phone, u.specialty, u.role, u.avatar_url, u.response_time_mins, u.quota_target;

-- 6. View: v_deal_size_summary
-- Bucketed bar distribution of deal sizes (<$500K, $500K–$1M, $1M–$5M, $5M–$10M, >$10M)
DROP VIEW IF EXISTS public.v_deal_size_summary CASCADE;
CREATE OR REPLACE VIEW public.v_deal_size_summary AS
SELECT
  org_id,
  bucket_label,
  bucket_order,
  COUNT(*) AS lead_count,
  COALESCE(SUM(budget), 0) AS total_value
FROM (
  SELECT
    org_id,
    budget,
    CASE
      WHEN COALESCE(budget, 0) < 500000 THEN '<$500K'
      WHEN budget >= 500000 AND budget < 1000000 THEN '$500K–$1M'
      WHEN budget >= 1000000 AND budget < 5000000 THEN '$1M–$5M'
      WHEN budget >= 5000000 AND budget <= 10000000 THEN '$5M–$10M'
      ELSE '>$10M'
    END AS bucket_label,
    CASE
      WHEN COALESCE(budget, 0) < 500000 THEN 1
      WHEN budget >= 500000 AND budget < 1000000 THEN 2
      WHEN budget >= 1000000 AND budget < 5000000 THEN 3
      WHEN budget >= 5000000 AND budget <= 10000000 THEN 4
      ELSE 5
    END AS bucket_order
  FROM public.leads
) b
GROUP BY org_id, bucket_label, bucket_order
ORDER BY bucket_order ASC;

-- 7. View: v_product_summary
-- Leads distributed by property category (Residential, Commercial, Plot, Shop, Building)
DROP VIEW IF EXISTS public.v_product_summary CASCADE;
CREATE OR REPLACE VIEW public.v_product_summary AS
SELECT
  l.org_id,
  COALESCE(
    p.type,
    CASE
      WHEN LOWER(l.target_property) LIKE '%residential%' OR LOWER(l.target_property) LIKE '%villa%' OR LOWER(l.target_property) LIKE '%estate%' OR LOWER(l.target_property) LIKE '%house%' THEN 'Residential'
      WHEN LOWER(l.target_property) LIKE '%commercial%' OR LOWER(l.target_property) LIKE '%office%' THEN 'Commercial'
      WHEN LOWER(l.target_property) LIKE '%plot%' OR LOWER(l.target_property) LIKE '%land%' OR LOWER(l.target_property) LIKE '%lot%' THEN 'Plot'
      WHEN LOWER(l.target_property) LIKE '%shop%' OR LOWER(l.target_property) LIKE '%retail%' THEN 'Shop'
      WHEN LOWER(l.target_property) LIKE '%building%' OR LOWER(l.target_property) LIKE '%penthouse%' THEN 'Building'
      ELSE 'Residential'
    END
  ) AS product_type,
  COUNT(l.id) AS lead_count,
  COALESCE(SUM(l.budget), 0) AS total_value
FROM public.leads l
LEFT JOIN public.properties p ON LOWER(p.title) = LOWER(l.target_property) OR p.mls_id = l.target_property
GROUP BY l.org_id, product_type;

-- 8. View: v_manager_monthly_trend
-- Monthly velocity: Leads Created vs Closed Won vs Closed Lost over past 12 months
DROP VIEW IF EXISTS public.v_manager_monthly_trend CASCADE;
CREATE OR REPLACE VIEW public.v_manager_monthly_trend AS
SELECT
  org_id,
  TO_CHAR(created_at, 'Mon YYYY') AS month_label,
  TO_CHAR(created_at, 'Mon') AS month_short,
  DATE_TRUNC('month', created_at) AS month_date,
  COUNT(id) AS leads_created,
  COUNT(id) FILTER (WHERE LOWER(stage) IN ('closing', 'negotiation', 'offer & escrow', 'escrow', 'won', 'closed')) AS closed_won,
  COUNT(id) FILTER (WHERE LOWER(stage) IN ('rejected', 'lost')) AS closed_lost,
  COALESCE(SUM(budget) FILTER (WHERE LOWER(stage) IN ('closing', 'negotiation', 'offer & escrow', 'escrow', 'won', 'closed')), 0) AS won_volume
FROM public.leads
WHERE created_at >= (NOW() - INTERVAL '12 months')
GROUP BY org_id, month_label, month_short, month_date
ORDER BY month_date ASC;

-- 9. Grant read permissions on all views to authenticated and service_role
GRANT SELECT ON public.v_lead_funnel TO authenticated, service_role, anon;
GRANT SELECT ON public.v_employee_summary TO authenticated, service_role, anon;
GRANT SELECT ON public.v_deal_size_summary TO authenticated, service_role, anon;
GRANT SELECT ON public.v_product_summary TO authenticated, service_role, anon;
GRANT SELECT ON public.v_manager_monthly_trend TO authenticated, service_role, anon;
