-- Run this in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run

-- 1. PROFILES: extends the built-in auth.users with app-specific info
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
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

-- If you already ran this schema before adding this column, run this line separately:
-- alter table profiles add column if not exists expertise text[] default '{}';

-- 2. SLOTS: time slots a mentor makes available
create table if not exists slots (
  id uuid default gen_random_uuid() primary key,
  mentor_id uuid references profiles(id) on delete cascade not null,
  start_time timestamptz not null,
  duration_minutes int not null default 45,
  topic text,
  is_booked boolean not null default false,
  created_at timestamptz default now()
);

-- If you already ran this schema before adding this column, run this line separately:
-- alter table slots add column if not exists topic text;

-- 3. BOOKINGS: a student booking a mentor's slot
create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade not null,
  mentor_id uuid references profiles(id) on delete cascade not null,
  slot_id uuid references slots(id) on delete cascade not null,
  meeting_room text not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'completed', 'cancelled')),
  created_at timestamptz default now()
);

-- 4. REVIEWS: a student's rating + comment after a completed session
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id) on delete cascade not null unique,
  student_id uuid references profiles(id) on delete cascade not null,
  mentor_id uuid references profiles(id) on delete cascade not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table slots enable row level security;
alter table bookings enable row level security;
alter table reviews enable row level security;

-- Profiles: anyone logged in can view all profiles (needed to browse mentors),
-- but you can only edit your own.
create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Slots: everyone can view open slots, only the owning mentor can create/update
create policy "Slots are viewable by everyone"
  on slots for select using (true);

create policy "Mentors can insert their own slots"
  on slots for insert with check (auth.uid() = mentor_id);

create policy "Mentors can update their own slots"
  on slots for update using (auth.uid() = mentor_id);

-- Bookings: only the student or mentor involved can see/manage a booking
create policy "Involved users can view bookings"
  on bookings for select using (auth.uid() = student_id or auth.uid() = mentor_id);

create policy "Students can create bookings"
  on bookings for insert with check (auth.uid() = student_id);

create policy "Involved users can update bookings"
  on bookings for update using (auth.uid() = student_id or auth.uid() = mentor_id);

-- Reviews: everyone can read (needed to show ratings on mentor cards),
-- only the student who attended can leave one, and only for their own booking.
drop policy if exists "Reviews are viewable by everyone" on reviews;
create policy "Reviews are viewable by everyone"
  on reviews for select using (true);

drop policy if exists "Students can review their own bookings" on reviews;
create policy "Students can review their own bookings"
  on reviews for insert with check (auth.uid() = student_id);

-- 5. STORAGE: profile photo uploads
-- Creates a public bucket called "avatars". Photos are public to view (needed to show
-- them on mentor cards), but a user can only upload/replace/delete their OWN photo.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly viewable" on storage.objects;
create policy "Avatar images are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
