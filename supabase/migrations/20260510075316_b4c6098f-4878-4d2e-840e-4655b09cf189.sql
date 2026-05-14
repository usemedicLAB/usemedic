drop policy if exists "avatars authenticated read" on storage.objects;

create policy "avatars owner read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);