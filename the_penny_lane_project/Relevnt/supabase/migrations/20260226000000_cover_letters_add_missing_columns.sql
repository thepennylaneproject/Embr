-- Fix: add resume_id, job_description, and company_name to cover_letters.
--
-- The canonical baseline (20260129000000_complete_baseline.sql) omitted these
-- three columns.  The previous workaround migration
-- (20260225213100_cover_letters_resume_fk_cascade.sql) only conditionally
-- attached the FK when the column happened to exist already — it did not
-- guarantee the column was present.
--
-- This migration adds the columns unconditionally and establishes the proper FK.

-- Drop the conditional FK constraint if it was already created by the workaround
-- migration so we can redefine it cleanly below.
do $$
begin
  if exists (
    select 1
    from   pg_constraint c
    join   pg_class      t on t.oid = c.conrelid
    join   pg_namespace  n on n.oid = t.relnamespace
    where  n.nspname  = 'public'
    and    t.relname  = 'cover_letters'
    and    c.conname  = 'cover_letters_resume_id_fkey'
  ) then
    alter table public.cover_letters
      drop constraint cover_letters_resume_id_fkey;
  end if;
end $$;

-- Add the three missing columns (idempotent via IF NOT EXISTS).
alter table public.cover_letters
  add column if not exists resume_id      uuid references public.resumes(id) on delete set null,
  add column if not exists job_description text,
  add column if not exists company_name    text;
