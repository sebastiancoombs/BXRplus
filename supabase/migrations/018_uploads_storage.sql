-- ============================================================
-- Storage bucket for icon / image uploads.
--
-- IconPicker uploads to bucket name "uploads" but the bucket and
-- its RLS policies were never created — every upload failed silently
-- with a generic "bucket not found / RLS denied" error.
--
-- Bucket is public (read), authenticated users can write to it.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads',
  'uploads',
  true,
  10485760,                                         -- 10 MB
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Drop pre-existing policies so the migration is idempotent.
drop policy if exists "uploads: public read"   on storage.objects;
drop policy if exists "uploads: auth insert"   on storage.objects;
drop policy if exists "uploads: auth update"   on storage.objects;
drop policy if exists "uploads: auth delete"   on storage.objects;

create policy "uploads: public read"
  on storage.objects for select
  using (bucket_id = 'uploads');

create policy "uploads: auth insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'uploads');

create policy "uploads: auth update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'uploads' and owner = auth.uid())
  with check (bucket_id = 'uploads' and owner = auth.uid());

create policy "uploads: auth delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'uploads' and owner = auth.uid());
