-- Complete baseline migration for Relevnt job-application tracker
-- Establishes all core tables and enables Row-Level Security

-- Enable RLS helper
create extension if not exists "uuid-ossp";

-------------------------------------------------------------------------------
-- profiles
-------------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        unique not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);

-------------------------------------------------------------------------------
-- resumes
-------------------------------------------------------------------------------
create table if not exists public.resumes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  title       text        not null,
  content     text,
  file_url    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.resumes enable row level security;

create policy "resumes: owner all"
  on public.resumes for all
  using (auth.uid() = user_id);

-------------------------------------------------------------------------------
-- applications
-------------------------------------------------------------------------------
create table if not exists public.applications (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  company_name text        not null,
  role         text        not null,
  status       text        not null default 'applied'
                             check (status in (
                               'applied','reviewing','interviewing',
                               'in_review','offer','accepted','rejected'
                             )),
  applied_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  location     text,
  salary       text,
  notes        text,
  url          text
);

alter table public.applications enable row level security;

create policy "applications: owner all"
  on public.applications for all
  using (auth.uid() = user_id);

-------------------------------------------------------------------------------
-- cover_letters
-- NOTE: resume_id, job_description, and company_name are intentionally absent
-- from this baseline — see migration 20260226000000_cover_letters_add_missing_columns.sql
-------------------------------------------------------------------------------
create table if not exists public.cover_letters (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  application_id  uuid        references public.applications(id) on delete set null,
  job_id          text,
  title           text        not null,
  content         text        not null,
  ai_generated    boolean     not null default false,
  template_used   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.cover_letters enable row level security;

create policy "cover_letters: owner all"
  on public.cover_letters for all
  using (auth.uid() = user_id);
