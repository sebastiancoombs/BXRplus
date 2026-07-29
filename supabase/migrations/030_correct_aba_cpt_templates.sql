-- Correct ABA CPT defaults: direct 1:1 is 97153, assessment/reassessment/report writing is 97151.

with payer as (
  select id from public.insurance_payers where name = 'Default ABA payer' limit 1
)
delete from public.insurance_cpt_templates t
using payer p
where t.insurance_id = p.id
  and t.cpt_code = '97133';

with payer as (
  select id from public.insurance_payers where name = 'Default ABA payer' limit 1
)
insert into public.insurance_cpt_templates (
  insurance_id,
  cpt_code,
  service_name,
  template_title,
  default_setting_events,
  required_sections,
  prompt_guidance
)
select
  p.id,
  '97153',
  'Adaptive behavior treatment by protocol',
  '97153 Direct Adaptive Behavior Treatment Note',
  'Client had a positive affect coming into session and no setting events were reported.',
  '["Session Summary","Setting Events","Skill Acquisition Goals Targeted","Behavior Reduction Targets","Interventions Implemented","Client Response / Data","Plan / Next Steps"]'::jsonb,
  'Emphasize direct 1:1 treatment delivered by protocol, goals targeted, interventions implemented, client response, and objective session data.'
from payer p
on conflict (insurance_id, cpt_code) do update set
  service_name = excluded.service_name,
  template_title = excluded.template_title,
  default_setting_events = excluded.default_setting_events,
  required_sections = excluded.required_sections,
  prompt_guidance = excluded.prompt_guidance,
  is_active = true;

with payer as (
  select id from public.insurance_payers where name = 'Default ABA payer' limit 1
)
insert into public.insurance_cpt_templates (
  insurance_id,
  cpt_code,
  service_name,
  template_title,
  default_setting_events,
  required_sections,
  prompt_guidance
)
select
  p.id,
  '97151',
  'Behavior identification assessment / reassessment',
  '97151 Assessment, Reassessment, and Report Writing Note',
  'Assessment/reassessment activities were completed as clinically indicated and documentation was based on available records, direct assessment, caregiver input, and/or data review.',
  '["Assessment / Reassessment Summary","Information Reviewed","Assessment Activities","Findings / Clinical Impressions","Treatment Plan Updates","Recommendations / Next Steps"]'::jsonb,
  'Use assessment and reassessment language. This template may include face-to-face assessment activities and non-face-to-face data analysis, scoring/interpreting assessments, and preparing the report or treatment plan when payer rules allow.'
from payer p
on conflict (insurance_id, cpt_code) do update set
  service_name = excluded.service_name,
  template_title = excluded.template_title,
  default_setting_events = excluded.default_setting_events,
  required_sections = excluded.required_sections,
  prompt_guidance = excluded.prompt_guidance,
  is_active = true;
