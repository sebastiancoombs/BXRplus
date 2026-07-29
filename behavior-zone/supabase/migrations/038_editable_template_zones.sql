alter table public.session_note_zones
  add column if not exists source text not null default 'custom',
  add column if not exists template_id uuid null references public.insurance_cpt_templates(id) on delete set null,
  add column if not exists deleted_at timestamptz null;

create index if not exists session_note_zones_active_note_sort_idx on public.session_note_zones (note_id, sort_order, created_at) where deleted_at is null;

update public.session_note_zones
set source = 'custom'
where source is null;
