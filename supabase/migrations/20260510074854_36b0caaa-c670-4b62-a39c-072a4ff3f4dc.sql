drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "avatars authenticated read" on storage.objects;
drop policy if exists "avatars owner write" on storage.objects;
drop policy if exists "avatars owner update" on storage.objects;
drop policy if exists "avatars owner delete" on storage.objects;

create policy "avatars authenticated read"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');

create policy "avatars owner insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars owner update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars owner delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "kyc owner read" on storage.objects;
drop policy if exists "kyc owner write" on storage.objects;
drop policy if exists "kyc owner update" on storage.objects;
drop policy if exists "kyc owner delete" on storage.objects;

create policy "kyc owner and admin read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'doctor-kyc'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.has_role(auth.uid(), 'admin')
  )
);

create policy "kyc doctor owner insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'doctor-kyc'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.has_role(auth.uid(), 'doctor')
);

create policy "kyc doctor owner update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'doctor-kyc'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.has_role(auth.uid(), 'doctor')
)
with check (
  bucket_id = 'doctor-kyc'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.has_role(auth.uid(), 'doctor')
);

create policy "kyc owner and admin delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'doctor-kyc'
  and (
    (auth.uid()::text = (storage.foldername(name))[1] and public.has_role(auth.uid(), 'doctor'))
    or public.has_role(auth.uid(), 'admin')
  )
);