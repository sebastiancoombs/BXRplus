alter table public.clients
  add column if not exists default_cpt_template_id uuid references public.insurance_cpt_templates(id) on delete set null,
  add column if not exists default_cpt_code text;

update public.clients c
set default_cpt_template_id = t.id,
    default_cpt_code = t.cpt_code
from public.insurance_cpt_templates t
where c.default_cpt_template_id is null
  and c.insurance_id = t.insurance_id
  and t.is_active = true
  and t.cpt_code = '97155';
