insert into storage.buckets (id, name, public) values ('chat-attachments', 'chat-attachments', true) on conflict (id) do nothing;

create policy "chat_att_public_read" on storage.objects for select using (bucket_id = 'chat-attachments');
create policy "chat_att_owner_write" on storage.objects for insert with check (bucket_id = 'chat-attachments' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "chat_att_owner_delete" on storage.objects for delete using (bucket_id = 'chat-attachments' and auth.uid()::text = (storage.foldername(name))[1]);

create or replace function public.get_doctor_booked_slots(p_doctor_id uuid, p_date date)
returns table (scheduled_time time)
language sql security definer set search_path = public as $$
  select scheduled_at::time
  from public.appointments
  where doctor_id = p_doctor_id
    and scheduled_at::date = p_date
    and status not in ('cancelled', 'no_show');
$$;
grant execute on function public.get_doctor_booked_slots(uuid, date) to authenticated;
