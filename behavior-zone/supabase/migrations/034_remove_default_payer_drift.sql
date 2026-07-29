-- Remove ad hoc default-payer behavior and keep payer CPT slots neutral.
-- Uploaded/pasted payer templates are the source of truth.

update public.clients c
set insurance_id = null,
    default_cpt_template_id = null,
    default_cpt_code = null
from public.insurance_payers p
where c.insurance_id = p.id
  and p.name = 'Default ABA payer';

delete from public.insurance_payers
where name = 'Default ABA payer';

update public.insurance_cpt_templates
set default_setting_events = '',
    required_sections = '[]'::jsonb,
    prompt_guidance = 'Use the clinician-uploaded payer template as the source of truth. Do not invent payer requirements or clinical facts.'
where coalesce(template_body, '') = '';

create or replace function public.seed_default_cpt_templates_for_payer()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.insurance_cpt_templates (
    insurance_id,
    cpt_code,
    service_name,
    template_title,
    default_setting_events,
    required_sections,
    prompt_guidance,
    template_body,
    is_active
  )
  values
    (new.id, '97155', 'Protocol modification / supervision', '97155 Protocol Modification / Supervision Note', '', '[]'::jsonb, 'Use the clinician-uploaded payer template as the source of truth. Do not invent payer requirements or clinical facts.', '', true),
    (new.id, '97156', 'Parent / caregiver guidance', '97156 Parent / Caregiver Guidance Note', '', '[]'::jsonb, 'Use the clinician-uploaded payer template as the source of truth. Do not invent payer requirements or clinical facts.', '', true),
    (new.id, '97153', 'Direct 1:1 treatment', '97153 Direct 1:1 Treatment Note', '', '[]'::jsonb, 'Use the clinician-uploaded payer template as the source of truth. Do not invent payer requirements or clinical facts.', '', true),
    (new.id, '97151', 'Assessment / reassessment', '97151 Assessment / Reassessment Note', '', '[]'::jsonb, 'Use the clinician-uploaded payer template as the source of truth. Do not invent payer requirements or clinical facts.', '', true)
  on conflict (insurance_id, cpt_code) do nothing;
  return new;
end;
$$;
