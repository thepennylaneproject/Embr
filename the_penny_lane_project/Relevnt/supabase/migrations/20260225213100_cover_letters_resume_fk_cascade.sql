-- Conditional migration: attach resume FK to cover_letters only when the column already exists.
-- This workaround was introduced because resume_id was added ad-hoc in some environments
-- but is not present in the canonical baseline (20260129000000_complete_baseline.sql).
-- A proper additive migration (20260226000000_cover_letters_add_missing_columns.sql) should
-- be applied instead of relying on this conditional approach.

do $$
begin
  -- Only attempt to add the FK if the column already exists in this environment.
  if exists (
    select 1
    from   information_schema.columns
    where  table_schema = 'public'
    and    table_name   = 'cover_letters'
    and    column_name  = 'resume_id'
  ) then
    -- Add FK constraint only if it doesn't already exist.
    if not exists (
      select 1
      from   information_schema.table_constraints  tc
      join   information_schema.key_column_usage   kcu
             on  kcu.constraint_name = tc.constraint_name
             and kcu.table_schema    = tc.table_schema
      where  tc.table_schema    = 'public'
      and    tc.table_name      = 'cover_letters'
      and    tc.constraint_type = 'FOREIGN KEY'
      and    kcu.column_name    = 'resume_id'
    ) then
      alter table public.cover_letters
        add constraint cover_letters_resume_id_fkey
        foreign key (resume_id)
        references public.resumes(id)
        on delete cascade;
    end if;
  end if;
end $$;
