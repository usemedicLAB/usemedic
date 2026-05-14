
insert into storage.buckets (id, name, public) values ('chat-attachments','chat-attachments', true)
on conflict (id) do update set public = true;

create policy "chat read" on storage.objects for select
using (bucket_id = 'chat-attachments');

create policy "chat write" on storage.objects for insert
with check (bucket_id = 'chat-attachments' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "chat delete own" on storage.objects for delete
using (bucket_id = 'chat-attachments' and (auth.uid())::text = (storage.foldername(name))[1]);
