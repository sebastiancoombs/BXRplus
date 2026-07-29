-- Keep imported source text visible in the main editable note body.
update public.session_notes
set insurance_note = coalesce(nullif(content, ''), quick_notes, insurance_note),
    content = coalesce(nullif(content, ''), quick_notes, insurance_note)
where source_filename is not null
  and coalesce(insurance_note, '') = ''
  and coalesce(nullif(content, ''), nullif(quick_notes, '')) is not null;
