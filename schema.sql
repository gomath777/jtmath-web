-- jtmath Database Schema (PostgreSQL)
-- Run this script in the Supabase SQL Editor

-- 1. Profiles Table (Extending default auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  school TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  phone_student TEXT NOT NULL,
  phone_parent TEXT NOT NULL,
  assignment_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Courses Table
CREATE TABLE public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  level_badge TEXT, -- e.g., "정규반", "심화반"
  badge_color TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  price INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Lessons Table (Linked to courses and Bunny.net external IDs)
CREATE TABLE public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL, -- e.g. 1차시, 2차시
  title TEXT NOT NULL,
  description TEXT,
  bunny_video_id TEXT, -- External ID from Bunny.net
  pdf_level_1_url TEXT,
  pdf_level_2_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enrollments Table (Access Control)
CREATE TABLE public.enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  valid_until TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL, -- "naver_manual", "toss_payment"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- 5. Purchases Table (Internal ledger for Toss Payments)
CREATE TABLE public.purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  course_id UUID REFERENCES public.courses(id),
  amount INTEGER NOT NULL,
  toss_order_id TEXT NOT NULL,
  toss_payment_key TEXT,
  status TEXT NOT NULL, -- "pending", "DONE", "CANCELED"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security temporarily for initial setup/testing
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
