-- ============================================================================
-- ROUNDORA / INTERVUEE - SUPABASE DATABASE SCHEMA (with Email & Roles)
-- Run this in your Supabase Dashboard: SQL Editor -> New query -> Paste -> Run
-- ============================================================================

-- 1. PROFILES TABLE (Stores user info with email & role: 'student' or 'mentor')
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text not null,
  role text not null check (role in ('student', 'mentor')),
  headline text,
  bio text,
  company text,
  years_experience int,
  price_per_session numeric,
  avatar_url text,
  expertise text[] default '{}',
  created_at timestamptz default now()
);

-- Ensure email and expertise columns exist if updating an existing table
alter table profiles add column if not exists email text;
alter table profiles add column if not exists expertise text[] default '{}';

-- 2. AUTOMATIC EMAIL & PROFILE SYNC TRIGGER
-- Automatically copies email, name & role from auth.users when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    role = coalesce(excluded.role, profiles.role);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. SEPARATE VIEWS FOR MENTORS AND STUDENTS (With Mail IDs)

-- View 1: Mentors list with Email ID
create or replace view mentors_view as
select
  id,
  email,
  full_name,
  headline,
  bio,
  company,
  years_experience,
  price_per_session,
  avatar_url,
  expertise,
  created_at
from profiles
where role = 'mentor';

-- View 2: Students list with Email ID
create or replace view students_view as
select
  id,
  email,
  full_name,
  headline,
  bio,
  avatar_url,
  created_at
from profiles
where role = 'student';


-- 4. SLOTS TABLE (Time slots mentors add for bookings)
create table if not exists slots (
  id uuid default gen_random_uuid() primary key,
  mentor_id uuid references profiles(id) on delete cascade not null,
  start_time timestamptz not null,
  duration_minutes int not null default 45,
  topic text,
  is_booked boolean not null default false,
  created_at timestamptz default now()
);

-- 5. BOOKINGS TABLE
create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade not null,
  mentor_id uuid references profiles(id) on delete cascade not null,
  slot_id uuid references slots(id) on delete cascade not null,
  meeting_room text not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'completed', 'cancelled')),
  created_at timestamptz default now()
);

-- 6. REVIEWS TABLE
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id) on delete cascade not null unique,
  student_id uuid references profiles(id) on delete cascade not null,
  mentor_id uuid references profiles(id) on delete cascade not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- 7. ROW LEVEL SECURITY (RLS POLICIES)
alter table profiles enable row level security;
alter table slots enable row level security;
alter table bookings enable row level security;
alter table reviews enable row level security;

-- Profiles Policies
drop policy if exists "Profiles are viewable by everyone" on profiles;
create policy "Profiles are viewable by everyone" on profiles for select using (true);

drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);

-- Slots Policies
drop policy if exists "Slots are viewable by everyone" on slots;
create policy "Slots are viewable by everyone" on slots for select using (true);

drop policy if exists "Mentors can insert their own slots" on slots;
create policy "Mentors can insert their own slots" on slots for insert with check (auth.uid() = mentor_id);

drop policy if exists "Mentors can update their own slots" on slots;
create policy "Mentors can update their own slots" on slots for update using (auth.uid() = mentor_id);

drop policy if exists "Mentors can delete their own slots" on slots;
create policy "Mentors can delete their own slots" on slots for delete using (auth.uid() = mentor_id);

-- Bookings Policies
drop policy if exists "Involved users can view bookings" on bookings;
create policy "Involved users can view bookings" on bookings for select using (auth.uid() = student_id or auth.uid() = mentor_id);

drop policy if exists "Students can create bookings" on bookings;
create policy "Students can create bookings" on bookings for insert with check (auth.uid() = student_id);

drop policy if exists "Involved users can update bookings" on bookings;
create policy "Involved users can update bookings" on bookings for update using (auth.uid() = student_id or auth.uid() = mentor_id);

-- Reviews Policies
drop policy if exists "Reviews are viewable by everyone" on reviews;
create policy "Reviews are viewable by everyone" on reviews for select using (true);

drop policy if exists "Students can review their own bookings" on reviews;
create policy "Students can review their own bookings" on reviews for insert with check (auth.uid() = student_id);

-- 8. STORAGE BUCKET (Avatars)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly viewable" on storage.objects;
create policy "Avatar images are publicly viewable" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar" on storage.objects for insert with check (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar" on storage.objects for update using (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar" on storage.objects for delete using (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);
