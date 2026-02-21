-- FounderMatch: Initial Schema
-- Migration: 001_initial_schema
-- Applied: 2026-02-21

-- Founders (extend Supabase auth.users)
create table public.founders (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  company_name text not null,
  company_description text,
  website text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Founder interview results (what they're looking for)
create table public.founder_profiles (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid references public.founders(id) on delete cascade not null,
  raw_transcript text not null,
  required_skills text[] default '{}',        -- e.g. ['typescript','react','postgres']
  preferred_skills text[] default '{}',       -- nice-to-haves
  role_title text,                            -- e.g. 'Senior Frontend Engineer'
  role_description text,                      -- summarized from interview
  experience_level text,                      -- 'junior' | 'mid' | 'senior' | 'lead'
  work_style text,                            -- 'remote' | 'hybrid' | 'onsite'
  culture_values text[],                      -- extracted soft requirements
  deal_breakers text[],                       -- hard nos
  interview_duration_sec int,
  created_at timestamptz default now()
);

-- Candidates (extend Supabase auth.users)
create table public.candidates (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  linkedin_url text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Candidate interview results
create table public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates(id) on delete cascade not null,
  raw_transcript text not null,
  -- Phase 1: Behavioral
  skills text[] default '{}',
  experience_years int,
  experience_level text,
  strengths text[],
  work_style_preference text,
  behavioral_summary text,
  behavioral_score numeric(3,1),              -- 0-10
  -- Phase 2: System Design
  system_design_question text,
  system_design_summary text,
  system_design_score numeric(3,1),           -- 0-10
  overall_score numeric(3,1),                 -- weighted composite
  interview_duration_sec int,
  created_at timestamptz default now()
);

-- Match scores (precomputed for dashboard)
create table public.match_scores (
  id uuid primary key default gen_random_uuid(),
  founder_profile_id uuid references public.founder_profiles(id) on delete cascade,
  candidate_profile_id uuid references public.candidate_profiles(id) on delete cascade,
  skill_match_score numeric(3,1),
  experience_match_score numeric(3,1),
  culture_match_score numeric(3,1),
  technical_score numeric(3,1),
  overall_match_score numeric(3,1),
  match_reasoning text,
  created_at timestamptz default now(),
  unique (founder_profile_id, candidate_profile_id)
);

-- When a founder selects a candidate
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid references public.founders(id),
  candidate_id uuid references public.candidates(id),
  match_score_id uuid references public.match_scores(id),
  intro_email_sent_at timestamptz,
  status text default 'pending', -- 'pending' | 'sent' | 'accepted' | 'declined'
  created_at timestamptz default now(),
  unique (founder_id, candidate_id)
);
