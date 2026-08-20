-- ============================================================================
-- ROUNDORA — DATABASE MIGRATION V4: 1-TO-1 CALL SESSIONS & SIGNALING
-- Run this in Supabase Dashboard: SQL Editor → New query → Paste → Run
-- ============================================================================

-- 1. CALL SESSIONS TABLE
CREATE TABLE IF NOT EXISTS call_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  interviewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  caller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'declined', 'missed', 'ended', 'busy')),
  started_at timestamptz,
  accepted_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookup by booking and user
CREATE INDEX IF NOT EXISTS idx_call_sessions_booking ON call_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_student ON call_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_interviewer ON call_sessions(interviewer_id);

-- 2. ROW LEVEL SECURITY (RLS)
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

-- Only booked student or interviewer can view call sessions
DROP POLICY IF EXISTS "Participants can view own call sessions" ON call_sessions;
CREATE POLICY "Participants can view own call sessions"
  ON call_sessions FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = interviewer_id);

-- Only booked student or interviewer can create call sessions
DROP POLICY IF EXISTS "Participants can insert call sessions" ON call_sessions;
CREATE POLICY "Participants can insert call sessions"
  ON call_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = caller_id AND 
    (auth.uid() = student_id OR auth.uid() = interviewer_id)
  );

-- Only participants can update call session status (e.g., accept, decline, end)
DROP POLICY IF EXISTS "Participants can update own call sessions" ON call_sessions;
CREATE POLICY "Participants can update own call sessions"
  ON call_sessions FOR UPDATE
  USING (auth.uid() = student_id OR auth.uid() = interviewer_id);

-- 3. ENABLE SUPABASE REALTIME REPLICATION (For Instant Call Events)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
