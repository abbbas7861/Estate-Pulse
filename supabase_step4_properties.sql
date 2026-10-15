-- ============================================================
-- EstatePulse Brokerage Pro — Step 4: Property Listings & Auto-Mapper
-- Run this in Supabase Dashboard → SQL Editor
-- This script is fully idempotent (safe to run multiple times)
-- ============================================================

-- 1. Ensure public schema permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Ensure columns on public.properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Beverly Hills';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS highlight_label TEXT DEFAULT 'Feature';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS highlight_value TEXT DEFAULT 'Luxury';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS broker_initials TEXT DEFAULT 'CV';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS broker_avatar_url TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS views INT DEFAULT 1;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS inquiries INT DEFAULT 0;

-- 3. Property Amenities Table
CREATE TABLE IF NOT EXISTS public.property_amenities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id    UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  group_name     TEXT NOT NULL,
  sub_group_name TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for property_amenities
ALTER TABLE public.property_amenities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members view property amenities" ON public.property_amenities;
CREATE POLICY "Org members view property amenities" ON public.property_amenities
  FOR SELECT USING (
    org_id IS NULL OR org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Org members manage property amenities" ON public.property_amenities;
CREATE POLICY "Org members manage property amenities" ON public.property_amenities
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );

GRANT ALL ON TABLE public.property_amenities TO postgres, anon, authenticated, service_role;

-- 4. Supabase Storage Bucket setup for property-images
DO $$
BEGIN
  -- Insert bucket into storage.buckets if storage schema exists
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('property-images', 'property-images', true)
    ON CONFLICT (id) DO UPDATE SET public = true;

    -- Drop & recreate storage policies for property-images
    DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;
    CREATE POLICY "Public can view property images" ON storage.objects
      FOR SELECT USING (bucket_id = 'property-images');

    DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
    CREATE POLICY "Authenticated users can upload property images" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Authenticated users can update property images" ON storage.objects;
    CREATE POLICY "Authenticated users can update property images" ON storage.objects
      FOR UPDATE USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Authenticated users can delete property images" ON storage.objects;
    CREATE POLICY "Authenticated users can delete property images" ON storage.objects
      FOR DELETE USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- 5. Lead-to-Property Auto-Mapper Function
-- Scores and matches properties for a given lead based on budget (+40), location (+30), and size/specs (+30)
CREATE OR REPLACE FUNCTION public.match_leads_to_properties(p_org_id UUID, p_lead_id UUID)
RETURNS TABLE (
  property_id UUID,
  score INT,
  match_reasons TEXT[],
  title TEXT,
  mls_id TEXT,
  price BIGINT,
  price_formatted TEXT,
  address TEXT,
  type TEXT,
  beds INT,
  baths NUMERIC,
  sqft INT,
  image_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
BEGIN
  -- 1. Fetch lead criteria
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id AND org_id = p_org_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 2. Return scored properties
  RETURN QUERY
  WITH scored AS (
    SELECT
      p.id AS prop_id,
      p.title AS p_title,
      p.mls_id AS p_mls_id,
      p.price AS p_price,
      p.price_formatted AS p_price_formatted,
      p.address AS p_address,
      p.type AS p_type,
      p.beds AS p_beds,
      p.baths AS p_baths,
      p.sqft AS p_sqft,
      COALESCE(p.image_url, '') AS p_image_url,

      -- Price score (up to 40 pts): within 10% = 40pts, within 25% = 25pts, within 50% = 10pts
      (
        CASE
          WHEN v_lead.budget > 0 AND ABS(p.price - v_lead.budget)::FLOAT / v_lead.budget <= 0.10 THEN 40
          WHEN v_lead.budget > 0 AND ABS(p.price - v_lead.budget)::FLOAT / v_lead.budget <= 0.25 THEN 25
          WHEN v_lead.budget > 0 AND ABS(p.price - v_lead.budget)::FLOAT / v_lead.budget <= 0.50 THEN 10
          WHEN v_lead.budget > 0 THEN 5
          ELSE 20
        END
      ) AS price_points,

      -- Location score (up to 30 pts): matches target_property or city keyword
      (
        CASE
          WHEN v_lead.target_property IS NOT NULL 
               AND (p.title ILIKE '%' || v_lead.target_property || '%' OR p.address ILIKE '%' || v_lead.target_property || '%') THEN 30
          WHEN v_lead.target_property IS NOT NULL 
               AND p.city ILIKE '%' || split_part(v_lead.target_property, ' ', 1) || '%' THEN 20
          ELSE 15
        END
      ) AS location_points,

      -- Specs score (up to 30 pts): area and bedroom luxury fit
      (
        CASE
          WHEN p.sqft >= 3000 THEN 30
          WHEN p.sqft >= 2000 THEN 20
          ELSE 15
        END
      ) AS spec_points
    FROM public.properties p
    WHERE p.org_id = p_org_id
  )
  SELECT
    s.prop_id,
    (s.price_points + s.location_points + s.spec_points)::INT AS score,
    ARRAY[
      CASE WHEN s.price_points >= 40 THEN 'Budget Match (within 10%)' WHEN s.price_points >= 25 THEN 'Price Compatible' ELSE 'Price Variance' END,
      CASE WHEN s.location_points >= 30 THEN 'Target Location Match' ELSE 'Regional Fit' END,
      CASE WHEN s.spec_points >= 30 THEN 'Expansive Area (>3,000 sqft)' ELSE 'Standard Size' END
    ]::TEXT[] AS match_reasons,
    s.p_title,
    s.p_mls_id,
    s.p_price,
    s.p_price_formatted,
    s.p_address,
    s.p_type,
    s.p_beds,
    s.p_baths,
    s.p_sqft,
    s.p_image_url
  FROM scored s
  ORDER BY (s.price_points + s.location_points + s.spec_points) DESC, s.p_price DESC
  LIMIT 5;
END;
$$;

-- 6. Add property_amenities and properties to Realtime Publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
  EXCEPTION WHEN duplicate_object THEN
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.property_amenities;
  EXCEPTION WHEN duplicate_object THEN
  END;
END $$;

SELECT 'EstatePulse Step 4: Property Listings & Auto-Mapper ready ✓' AS status;
