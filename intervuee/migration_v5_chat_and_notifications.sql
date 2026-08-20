-- ============================================================================
-- ROUNDORA — DATABASE MIGRATION V5: 1-TO-1 CHAT, TICKETS & NOTIFICATIONS
-- Run this in Supabase Dashboard: SQL Editor → New query → Paste → Run
-- ============================================================================

-- 1. 1-TO-1 INTERVIEW MESSAGES TABLE
CREATE TABLE IF NOT EXISTS interview_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_messages_booking ON interview_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_interview_messages_receiver ON interview_messages(receiver_id);

-- 2. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_user_id uuid REFERENCES profiles(id),
  category text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_reply text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_target ON support_tickets(target_user_id);

-- 3. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'ticket' CHECK (type IN ('ticket', 'chat', 'call', 'booking', 'general')),
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE interview_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Messages RLS
DROP POLICY IF EXISTS "Participants can view own messages" ON interview_messages;
CREATE POLICY "Participants can view own messages"
  ON interview_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert own messages" ON interview_messages;
CREATE POLICY "Users can insert own messages"
  ON interview_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Receiver can update message read status" ON interview_messages;
CREATE POLICY "Receiver can update message read status"
  ON interview_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Support Tickets RLS
DROP POLICY IF EXISTS "Users can view own or target tickets" ON support_tickets;
CREATE POLICY "Users can view own or target tickets"
  ON support_tickets FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = target_user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Users can insert tickets" ON support_tickets;
CREATE POLICY "Users can insert tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and owners can update tickets" ON support_tickets;
CREATE POLICY "Admins and owners can update tickets"
  ON support_tickets FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Notifications RLS
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System and users can insert notifications" ON notifications;
CREATE POLICY "System and users can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. ENABLE REALTIME REPLICATION FOR INSTANT CHAT & NOTIFICATIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interview_messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
