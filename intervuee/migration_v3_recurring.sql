-- ============================================================================
-- ROUNDORA — DATABASE MIGRATION V3: RECURRING SCHEDULES
-- Run this in Supabase Dashboard: SQL Editor → New query → Paste → Run
-- ============================================================================

-- ============================================================================
-- 1. RECURRING SCHEDULES TABLE
-- Stores a mentor's weekly recurring availability template.
-- day_of_week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
-- ============================================================================
CREATE TABLE IF NOT EXISTS recurring_schedules (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id        uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week      int         NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time_of_day      time        NOT NULL,
  duration_minutes int         NOT NULL DEFAULT 45,
  topic            text,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;

-- Mentor can view their own schedules
DROP POLICY IF EXISTS "Mentors can view own recurring schedules" ON recurring_schedules;
CREATE POLICY "Mentors can view own recurring schedules"
  ON recurring_schedules FOR SELECT
  USING (auth.uid() = mentor_id);

-- Mentor can insert their own schedules
DROP POLICY IF EXISTS "Mentors can insert own recurring schedules" ON recurring_schedules;
CREATE POLICY "Mentors can insert own recurring schedules"
  ON recurring_schedules FOR INSERT
  WITH CHECK (auth.uid() = mentor_id);

-- Mentor can update (toggle active) their own schedules
DROP POLICY IF EXISTS "Mentors can update own recurring schedules" ON recurring_schedules;
CREATE POLICY "Mentors can update own recurring schedules"
  ON recurring_schedules FOR UPDATE
  USING (auth.uid() = mentor_id);

-- Mentor can delete their own schedules
DROP POLICY IF EXISTS "Mentors can delete own recurring schedules" ON recurring_schedules;
CREATE POLICY "Mentors can delete own recurring schedules"
  ON recurring_schedules FOR DELETE
  USING (auth.uid() = mentor_id);
