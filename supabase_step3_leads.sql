-- ============================================================
-- EstatePulse Brokerage Pro — Step 3: Lead Management Engine
-- Run this in Supabase Dashboard → SQL Editor
-- This script is fully idempotent (safe to run multiple times)
-- ============================================================

-- 1. Ensure public schema permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Add role column to public.users if not present
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agent';

-- 3. Lead Stages Table (create table & ensure all columns exist even if table was created previously)
CREATE TABLE IF NOT EXISTS public.lead_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.lead_stages ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.lead_stages ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.lead_stages ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.lead_stages ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
ALTER TABLE public.lead_stages ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#005d42';
ALTER TABLE public.lead_stages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Fill any null slugs from name if existing rows were present
UPDATE public.lead_stages 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '_', 'g'))
WHERE slug IS NULL AND name IS NOT NULL;

-- Seed default global stages if table is empty
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

-- 4. Alter public.leads: ensure all columns exist
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.lead_stages(id) ON DELETE SET NULL;

-- 5. Activities Table (lead interaction timeline)
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'note';
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Tasks & Meetings Table (follow-ups)
CREATE TABLE IF NOT EXISTS public.tasks_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.tasks_meetings ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.tasks_meetings ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE;
ALTER TABLE public.tasks_meetings ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.tasks_meetings ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.tasks_meetings ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.tasks_meetings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.tasks_meetings ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'follow_up';
ALTER TABLE public.tasks_meetings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 7. Round-Robin Lead Assignment Function
CREATE OR REPLACE FUNCTION public.assign_lead_round_robin(p_org_id UUID, p_lead_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id UUID;
  v_agent_name TEXT;
BEGIN
  -- 1. Find user in the org with role='agent' (or any org user) having fewest active open leads
  SELECT u.id, COALESCE(u.full_name, split_part(u.email, '@', 1))
  INTO v_agent_id, v_agent_name
  FROM public.users u
  LEFT JOIN (
    SELECT assigned_to, COUNT(*) as open_count
    FROM public.leads
    WHERE org_id = p_org_id
      AND stage NOT IN ('closed', 'rejected', 'lost', 'Closed', 'Rejected', 'Lost')
      AND assigned_to IS NOT NULL
    GROUP BY assigned_to
  ) active_leads ON u.id = active_leads.assigned_to
  WHERE u.org_id = p_org_id
    AND (u.role = 'agent' OR u.role IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE org_id = p_org_id AND role = 'agent'))
  ORDER BY COALESCE(active_leads.open_count, 0) ASC, u.created_at ASC
  LIMIT 1;

  -- 2. Update the lead with the selected agent
  IF v_agent_id IS NOT NULL THEN
    UPDATE public.leads
    SET assigned_to = v_agent_id,
        broker_id = v_agent_id,
        broker_name = COALESCE(broker_name, v_agent_name)
    WHERE id = p_lead_id AND org_id = p_org_id;

    -- Log automatic assignment in activities
    INSERT INTO public.activities (org_id, lead_id, user_id, type, title, description)
    VALUES (
      p_org_id,
      p_lead_id,
      v_agent_id,
      'note',
      'Lead Auto-Assigned',
      'Assigned via Round-Robin to ' || v_agent_name
    );
  END IF;

  RETURN v_agent_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'assign_lead_round_robin failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- 8. Auto-assign trigger on leads insert
CREATE OR REPLACE FUNCTION public.trigger_round_robin_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS NULL THEN
    PERFORM public.assign_lead_round_robin(NEW.org_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_round_robin_lead ON public.leads;
CREATE TRIGGER trg_round_robin_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_round_robin_lead();

-- 9. Row Level Security Policies
ALTER TABLE public.lead_stages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks_meetings ENABLE ROW LEVEL SECURITY;

-- Policies for lead_stages
DROP POLICY IF EXISTS "Org members see lead stages" ON public.lead_stages;
CREATE POLICY "Org members see lead stages" ON public.lead_stages
  FOR SELECT USING (
    org_id IS NULL OR org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Org members manage lead stages" ON public.lead_stages;
CREATE POLICY "Org members manage lead stages" ON public.lead_stages
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

-- Policies for activities
DROP POLICY IF EXISTS "Org members view activities" ON public.activities;
CREATE POLICY "Org members view activities" ON public.activities
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Org members insert activities" ON public.activities;
CREATE POLICY "Org members insert activities" ON public.activities
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

-- Policies for tasks_meetings
DROP POLICY IF EXISTS "Org members view tasks_meetings" ON public.tasks_meetings;
CREATE POLICY "Org members view tasks_meetings" ON public.tasks_meetings
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Org members manage tasks_meetings" ON public.tasks_meetings;
CREATE POLICY "Org members manage tasks_meetings" ON public.tasks_meetings
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

-- 10. Table Grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 11. Add to Realtime Publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  EXCEPTION WHEN duplicate_object THEN
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
  EXCEPTION WHEN duplicate_object THEN
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks_meetings;
  EXCEPTION WHEN duplicate_object THEN
  END;
END $$;

SELECT 'EstatePulse Step 3: Lead Management Engine tables and functions ready ✓' AS status;
