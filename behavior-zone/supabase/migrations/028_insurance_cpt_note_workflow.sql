-- Insurance-aware supervision note workflow

create table if not exists public.insurance_payers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  documentation_style text not null default '',
  compliance_language text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.insurance_cpt_templates (
  id uuid primary key default gen_random_uuid(),
  insurance_id uuid not null references public.insurance_payers(id) on delete cascade,
  cpt_code text not null,
  service_name text not null,
  template_title text not null,
  default_setting_events text not null default 'Client had a positive affect coming into session and no setting events were reported.',
  required_sections jsonb not null default '[]'::jsonb,
  prompt_guidance text not null default '',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (insurance_id, cpt_code)
);

create table if not exists public.session_note_suggestions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  source_note_id uuid references public.session_notes(id) on delete set null,
  target_note_id uuid references public.session_notes(id) on delete cascade,
  goal_id uuid references public.client_goals(id) on delete set null,
  suggestion_text text not null,
  rationale text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  created_by uuid not null references public.profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.clients
  add column if not exists insurance_id uuid references public.insurance_payers(id) on delete set null;

alter table public.session_notes
  add column if not exists insurance_id uuid references public.insurance_payers(id) on delete set null,
  add column if not exists cpt_template_id uuid references public.insurance_cpt_templates(id) on delete set null,
  add column if not exists cpt_code text,
  add column if not exists note_kind text not null default 'general',
  add column if not exists setting_events text not null default '',
  add column if not exists behavior_observations text not null default '',
  add column if not exists interventions text not null default '',
  add column if not exists client_response text not null default '',
  add column if not exists plan_next_steps text not null default '';

create index if not exists insurance_cpt_templates_insurance_active_idx
  on public.insurance_cpt_templates (insurance_id, is_active, cpt_code);

create index if not exists session_note_suggestions_target_status_idx
  on public.session_note_suggestions (target_note_id, status, created_at desc);

alter table public.insurance_payers enable row level security;
alter table public.insurance_cpt_templates enable row level security;
alter table public.session_note_suggestions enable row level security;

drop policy if exists "See insurance payers" on public.insurance_payers;
drop policy if exists "Manage insurance payers" on public.insurance_payers;
create policy "See insurance payers" on public.insurance_payers for select using (auth.uid() is not null);
create policy "Manage insurance payers" on public.insurance_payers for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "See CPT templates" on public.insurance_cpt_templates;
drop policy if exists "Manage CPT templates" on public.insurance_cpt_templates;
create policy "See CPT templates" on public.insurance_cpt_templates for select using (auth.uid() is not null);
create policy "Manage CPT templates" on public.insurance_cpt_templates for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "See note suggestions" on public.session_note_suggestions;
drop policy if exists "Create note suggestions" on public.session_note_suggestions;
drop policy if exists "Update note suggestions" on public.session_note_suggestions;
create policy "See note suggestions" on public.session_note_suggestions for select using (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
);
create policy "Create note suggestions" on public.session_note_suggestions for insert with check (
  created_by = auth.uid()
  and (
    client_id in (select id from public.clients where owner_id = auth.uid())
    or client_id in (select public.get_my_client_ids())
  )
);
create policy "Update note suggestions" on public.session_note_suggestions for update using (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
) with check (
  client_id in (select id from public.clients where owner_id = auth.uid())
  or client_id in (select public.get_my_client_ids())
);

insert into public.insurance_payers (name, documentation_style, compliance_language)
values (
  'Default ABA payer',
  'Use objective, medically necessary ABA language. Keep claims tied to observed session data, selected goals, and documented BCBA changes.',
  'Do not invent data. Identify service focus, intervention, client response, data/progress, and plan. Use clinician review before submission.'
)
on conflict (name) do nothing;

insert into public.insurance_cpt_templates (insurance_id, cpt_code, service_name, template_title, required_sections, prompt_guidance)
select p.id, code, service_name, template_title, sections::jsonb, guidance
from public.insurance_payers p
cross join (values
  ('97155', 'Adaptive behavior treatment with protocol modification', '97155 BCBA Supervision / Protocol Modification Note', '["Session Summary","Setting Events","Goals Targeted","Protocol Modifications","Client Response","Plan / Next Steps"]', 'Emphasize BCBA assessment, protocol modification, treatment integrity, goal response, and next steps.'),
  ('97156', 'Family adaptive behavior treatment guidance', '97156 Caregiver Guidance Note', '["Session Summary","Caregiver Training Focus","Strategies Modeled","Caregiver Response","Plan / Homework"]', 'Emphasize caregiver guidance, modeling/coaching, caregiver response, and home implementation plan.'),
  ('97153', 'Adaptive behavior treatment by protocol', '97153 Direct Adaptive Behavior Treatment Note', '["Session Summary","Setting Events","Skill Acquisition Goals Targeted","Behavior Reduction Targets","Interventions Implemented","Client Response / Data","Plan / Next Steps"]', 'Emphasize direct 1:1 treatment delivered by protocol, goals targeted, interventions implemented, client response, and objective session data.'),
  ('97151', 'Behavior identification assessment / reassessment', '97151 Assessment, Reassessment, and Report Writing Note', '["Assessment / Reassessment Summary","Information Reviewed","Assessment Activities","Findings / Clinical Impressions","Treatment Plan Updates","Recommendations / Next Steps"]', 'Use assessment and reassessment language. This template may include face-to-face assessment activities and non-face-to-face data analysis, scoring/interpreting assessments, and preparing the report or treatment plan when payer rules allow.')
) as t(code, service_name, template_title, sections, guidance)
where p.name = 'Default ABA payer'
on conflict (insurance_id, cpt_code) do nothing;

update public.clients c
set insurance_id = p.id
from public.insurance_payers p
where c.insurance_id is null
  and p.name = 'Default ABA payer';

create or replace function public.touch_insurance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists insurance_payers_touch_updated_at on public.insurance_payers;
create trigger insurance_payers_touch_updated_at before update on public.insurance_payers for each row execute function public.touch_insurance_updated_at();

drop trigger if exists insurance_cpt_templates_touch_updated_at on public.insurance_cpt_templates;
create trigger insurance_cpt_templates_touch_updated_at before update on public.insurance_cpt_templates for each row execute function public.touch_insurance_updated_at();
