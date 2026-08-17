-- ============================================================================
-- ROUNDORA MIGRATION V2 — SAFE STEP-BY-STEP VERSION
-- Run this entire block in Supabase SQL Editor at once
-- ============================================================================

-- STEP 1: Add new columns to profiles
alter table profiles add column if not exists is_verified boolean not null default false;
alter table profiles add column if not exists is_admin boolean not null default false;
alter table profiles add column if not exists linkedin_url text;
alter table profiles add column if not exists is_suspended boolean not null default false;

-- Auto-approve existing mentors so live site doesn't break
update profiles set is_verified = true where role = 'mentor';

-- STEP 2: Create interviewer_applications table
create table if not exists interviewer_applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  full_name text not null,
  email text not null,
  linkedin_url text,
  company text not null,
  designation text not null,
  years_experience int not null,
  skills text[] default '{}',
  resume_url text,
  introduction text not null,
  interviewing_experience text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- STEP 3: Add payment + cancellation columns to bookings
alter table bookings add column if not exists razorpay_order_id text;
alter table bookings add column if not exists razorpay_payment_id text;
alter table bookings add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid', 'paid', 'refunded', 'pending'));
alter table bookings add column if not exists amount_paid numeric;
alter table bookings add column if not exists cancellation_reason text;
alter table bookings add column if not exists cancelled_at timestamptz;

-- STEP 4: Extend booking status (drop old constraint first, recreate)
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'refunded', 'no_show'));

-- STEP 5: Create interview_scorecards table
create table if not exists interview_scorecards (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id) on delete cascade not null unique,
  interviewer_id uuid references profiles(id) on delete cascade not null,
  candidate_id uuid references profiles(id) on delete cascade not null,
  technical_score numeric(4,1) check (technical_score between 0 and 10),
  dsa_score numeric(4,1) check (dsa_score between 0 and 10),
  problem_solving_score numeric(4,1) check (problem_solving_score between 0 and 10),
  communication_score numeric(4,1) check (communication_score between 0 and 10),
  confidence_score numeric(4,1) check (confidence_score between 0 and 10),
  code_quality_score numeric(4,1) check (code_quality_score between 0 and 10),
  overall_score numeric(4,1) check (overall_score between 0 and 10),
  strengths text[] default '{}',
  improvements text[] default '{}',
  questions_asked text[] default '{}',
  recommended_topics text[] default '{}',
  notes text,
  recommendation text check (recommendation in ('strong_hire', 'consider', 'no_hire')),
  created_at timestamptz default now()
);

-- STEP 6: Enable RLS on new tables
alter table interviewer_applications enable row level security;
alter table interview_scorecards enable row level security;

-- STEP 7: RLS policies for interviewer_applications
drop policy if exists "Applicants can view own application" on interviewer_applications;
create policy "Applicants can view own application" on interviewer_applications
  for select using (auth.uid() = user_id);

drop policy if exists "Applicants can insert own application" on interviewer_applications;
create policy "Applicants can insert own application" on interviewer_applications
  for insert with check (auth.uid() = user_id);

drop policy if exists "Admins can view all applications" on interviewer_applications;
create policy "Admins can view all applications" on interviewer_applications
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admins can update all applications" on interviewer_applications;
create policy "Admins can update all applications" on interviewer_applications
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- STEP 8: RLS policies for interview_scorecards
drop policy if exists "Interviewer can insert own scorecard" on interview_scorecards;
create policy "Interviewer can insert own scorecard" on interview_scorecards
  for insert with check (auth.uid() = interviewer_id);

drop policy if exists "Interviewer can update own scorecard" on interview_scorecards;
create policy "Interviewer can update own scorecard" on interview_scorecards
  for update using (auth.uid() = interviewer_id);

drop policy if exists "Booking participants can view scorecard" on interview_scorecards;
create policy "Booking participants can view scorecard" on interview_scorecards
  for select using (auth.uid() = interviewer_id or auth.uid() = candidate_id);

drop policy if exists "Admins can view all scorecards" on interview_scorecards;
create policy "Admins can view all scorecards" on interview_scorecards
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- STEP 9: Fix bookings RLS — tighten update permissions
drop policy if exists "Involved users can update bookings" on bookings;

drop policy if exists "Students can cancel their bookings" on bookings;
create policy "Students can cancel their bookings" on bookings
  for update using (auth.uid() = student_id)
  with check (status in ('cancelled'));

drop policy if exists "Mentors can update booking status" on bookings;
create policy "Mentors can update booking status" on bookings
  for update using (auth.uid() = mentor_id)
  with check (status in ('completed', 'cancelled', 'no_show'));

drop policy if exists "Admins can update any booking" on bookings;
create policy "Admins can update any booking" on bookings
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- STEP 10: Admins can view all bookings
drop policy if exists "Involved users can view bookings" on bookings;
drop policy if exists "Admins can view all bookings" on bookings;
create policy "Admins can view all bookings" on bookings
  for select using (
    auth.uid() = student_id
    or auth.uid() = mentor_id
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- STEP 11: Admin profile update policy
drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile" on profiles
  for update using (
    auth.uid() = id
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "Users can update their own profile" on profiles;

-- STEP 12: Update mentors view
create or replace view mentors_view as
select
  id, email, full_name, headline, bio, company,
  years_experience, price_per_session, avatar_url,
  expertise, linkedin_url, is_verified, created_at
from profiles
where role = 'mentor'
  and is_verified = true
  and is_suspended = false;

-- ============================================================================
-- DONE! Now run this separately to grant yourself admin:
-- UPDATE profiles SET is_admin = true WHERE email = 'vilenisop7@gmail.com';
-- ============================================================================
