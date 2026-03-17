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

-- 2. Subjects Table (7 고등 수학 과목)
CREATE TABLE public.subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,          -- e.g. "common-math-1", "calculus-1"
  name TEXT NOT NULL,                 -- e.g. "공통수학 1", "미적분 1"
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Courses Table (Delta Modules - actual teaching content)
CREATE TABLE public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  delta_level TEXT NOT NULL,          -- "delta-0", "delta-1", "delta-2", "delta-final"
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Products Table (Purchasable packages - what customers actually buy)
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,          -- e.g. "algebra-delta-0-regular"
  name TEXT NOT NULL,                 -- e.g. "대수 Δ0 실전 개념 (겨울방학)"
  product_type TEXT NOT NULL,         -- "delta-0-regular", "delta-0-fast", "delta-1-final-bundle", "delta-final-only"
  season TEXT NOT NULL,               -- "방학", "학기중"
  price INTEGER NOT NULL,
  duration_weeks INTEGER NOT NULL,
  included_modules TEXT[] NOT NULL,   -- ["delta-0"] or ["delta-1", "delta-final"]
  features TEXT[],                    -- ["개념완성", "학교 생기부 가이드", ...]
  has_guide BOOLEAN DEFAULT FALSE,    -- 생기부/수행평가 가이드 포함 여부
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Lessons Table (Linked to courses and Bunny.net)
CREATE TABLE public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  bunny_video_id TEXT,
  pdf_level_1_url TEXT,
  pdf_level_2_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enrollments Table (Access Control - one per course per user)
CREATE TABLE public.enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),  -- which product granted this access
  valid_until TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,               -- "toss_payment", "naver_manual", "admin_grant"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- 7. Purchases Table (Toss Payments ledger)
CREATE TABLE public.purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  product_id UUID REFERENCES public.products(id),
  amount INTEGER NOT NULL,
  toss_order_id TEXT NOT NULL,
  toss_payment_key TEXT,
  status TEXT NOT NULL,               -- "pending", "DONE", "CANCELED"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for initial setup/testing
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════
-- SEED DATA: 7 Subjects
-- ═══════════════════════════════════════════
INSERT INTO public.subjects (slug, name, sort_order) VALUES
  ('common-math-1', '공통수학 1', 1),
  ('common-math-2', '공통수학 2', 2),
  ('algebra', '대수', 3),
  ('calculus-1', '미적분 1', 4),
  ('geometry', '기하', 5),
  ('calculus-2', '미적분 2', 6),
  ('probability', '확률과 통계', 7);
