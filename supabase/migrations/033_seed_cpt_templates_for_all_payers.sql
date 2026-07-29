-- Ensure every insurance payer has its own CPT template rows.
-- These are payer-specific slots; uploaded template_body remains the source of truth.

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
select
  p.id,
  t.cpt_code,
  t.service_name,
  t.template_title,
  t.default_setting_events,
  t.required_sections::jsonb,
  t.prompt_guidance,
  '',
  true
from public.insurance_payers p
cross join (values
  (
    '97155',
    'Supervision / protocol modification',
    '97155 Supervision / Protocol Modification Note',
    'Client had a positive affect coming into session and no setting events were reported.',
    '["Session Summary","Setting Events","Skill Acquisition Goals Targeted","Protocol Modifications","Client Response / Data","Plan / Next Steps"]',
    'Use this payer-specific uploaded 97155 template. Emphasize supervision/protocol modification and do not invent data.'
  ),
  (
    '97156',
    'Parent / caregiver guidance',
    '97156 Parent / Caregiver Guidance Note',
    'Caregiver guidance was provided as clinically indicated.',
    '["Session Summary","Caregiver Training Focus","Strategies Modeled","Caregiver Response","Plan / Homework"]',
    'Use this payer-specific uploaded 97156 template. Emphasize caregiver guidance and do not invent data.'
  ),
  (
    '97153',
    'Direct 1:1 treatment',
    '97153 Direct Adaptive Behavior Treatment Note',
    'Client had a positive affect coming into session and no setting events were reported.',
    '["Session Summary","Setting Events","Skill Acquisition Goals Targeted","Behavior Reduction Targets","Interventions Implemented","Client Response / Data","Plan / Next Steps"]',
    'Use this payer-specific uploaded 97153 template. Emphasize direct treatment by protocol and do not invent data.'
  ),
  (
    '97151',
    'Assessment / reassessment / report writing',
    '97151 Assessment, Reassessment, and Report Writing Note',
    'Assessment/reassessment activities were completed as clinically indicated.',
    '["Assessment / Reassessment Summary","Information Reviewed","Assessment Activities","Findings / Clinical Impressions","Treatment Plan Updates","Recommendations / Next Steps"]',
    'Use this payer-specific uploaded 97151 template. Use assessment/reassessment language and payer rules.'
  )
) as t(cpt_code, service_name, template_title, default_setting_events, required_sections, prompt_guidance)
on conflict (insurance_id, cpt_code) do nothing;

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
    (new.id, '97155', 'Supervision / protocol modification', '97155 Supervision / Protocol Modification Note', 'Client had a positive affect coming into session and no setting events were reported.', '["Session Summary","Setting Events","Skill Acquisition Goals Targeted","Protocol Modifications","Client Response / Data","Plan / Next Steps"]'::jsonb, 'Use this payer-specific uploaded 97155 template. Emphasize supervision/protocol modification and do not invent data.', '', true),
    (new.id, '97156', 'Parent / caregiver guidance', '97156 Parent / Caregiver Guidance Note', 'Caregiver guidance was provided as clinically indicated.', '["Session Summary","Caregiver Training Focus","Strategies Modeled","Caregiver Response","Plan / Homework"]'::jsonb, 'Use this payer-specific uploaded 97156 template. Emphasize caregiver guidance and do not invent data.', '', true),
    (new.id, '97153', 'Direct 1:1 treatment', '97153 Direct Adaptive Behavior Treatment Note', 'Client had a positive affect coming into session and no setting events were reported.', '["Session Summary","Setting Events","Skill Acquisition Goals Targeted","Behavior Reduction Targets","Interventions Implemented","Client Response / Data","Plan / Next Steps"]'::jsonb, 'Use this payer-specific uploaded 97153 template. Emphasize direct treatment by protocol and do not invent data.', '', true),
    (new.id, '97151', 'Assessment / reassessment / report writing', '97151 Assessment, Reassessment, and Report Writing Note', 'Assessment/reassessment activities were completed as clinically indicated.', '["Assessment / Reassessment Summary","Information Reviewed","Assessment Activities","Findings / Clinical Impressions","Treatment Plan Updates","Recommendations / Next Steps"]'::jsonb, 'Use this payer-specific uploaded 97151 template. Use assessment/reassessment language and payer rules.', '', true)
  on conflict (insurance_id, cpt_code) do nothing;
  return new;
end;
$$;

drop trigger if exists insurance_payers_seed_cpt_templates on public.insurance_payers;
create trigger insurance_payers_seed_cpt_templates
  after insert on public.insurance_payers
  for each row execute function public.seed_default_cpt_templates_for_payer();
