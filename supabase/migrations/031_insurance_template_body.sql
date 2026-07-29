alter table public.insurance_cpt_templates
  add column if not exists template_body text not null default '';

update public.insurance_cpt_templates
set template_body = concat_ws(E'\n\n', template_title, 'Required sections:', required_sections::text, 'Guidance:', prompt_guidance)
where template_body = '';
