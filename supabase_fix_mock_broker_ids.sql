-- =============================================================================
-- FIX: Clean up stale mock broker IDs in leads and tasks_meetings tables
-- =============================================================================
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- Problem: Old seeded/test leads may have non-UUID values like 'broker-1',
-- 'broker-2', 'broker-3', 'broker-4' in the assigned_to / broker_id columns.
-- Postgres rejects these with: "invalid input syntax for type uuid"
--
-- Fix: Set those columns to NULL for any rows with mock broker IDs.
-- =============================================================================

-- 1. Clear mock broker IDs from the leads table
UPDATE leads
SET
  assigned_to = NULL,
  broker_id   = NULL,
  broker_name = CASE
    WHEN broker_name IN ('Claire Vance','David Chen','Sarah Jenkins','Marcus Thorne')
    THEN 'Unassigned'
    ELSE broker_name
  END
WHERE
  assigned_to IN ('broker-1', 'broker-2', 'broker-3', 'broker-4')
  OR broker_id IN ('broker-1', 'broker-2', 'broker-3', 'broker-4');

-- 2. Clear mock broker IDs from tasks_meetings table (if any)
UPDATE tasks_meetings
SET assigned_to = NULL
WHERE assigned_to IN ('broker-1', 'broker-2', 'broker-3', 'broker-4');

-- 3. Clear any other non-UUID values from assigned_to / broker_id in leads
--    (catches any other malformed IDs that aren't proper UUIDs)
UPDATE leads
SET assigned_to = NULL
WHERE assigned_to IS NOT NULL
  AND assigned_to !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE leads
SET broker_id = NULL
WHERE broker_id IS NOT NULL
  AND broker_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE tasks_meetings
SET assigned_to = NULL
WHERE assigned_to IS NOT NULL
  AND assigned_to !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 4. Verify: show remaining leads with assigned_to or broker_id set
SELECT
  id,
  name,
  assigned_to,
  broker_id,
  broker_name
FROM leads
WHERE assigned_to IS NOT NULL OR broker_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
