-- Enable realtime
alter table public.messages replica identity full;
alter table public.appointments replica identity full;
alter table public.consultations replica identity full;
alter table public.prescriptions replica identity full;

do $$ begin
  perform 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages';
  if not found then alter publication supabase_realtime add table public.messages; end if;
  perform 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='appointments';
  if not found then alter publication supabase_realtime add table public.appointments; end if;
  perform 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='consultations';
  if not found then alter publication supabase_realtime add table public.consultations; end if;
  perform 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='prescriptions';
  if not found then alter publication supabase_realtime add table public.prescriptions; end if;
end $$;

-- Helper: get or create a consultation for an appointment.
-- Only the patient or the doctor on the appointment may call this.
create or replace function public.get_or_create_consultation(_appointment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_appt record;
  v_cons_id uuid;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select id, patient_id, doctor_id, status into v_appt from public.appointments where id = _appointment_id;
  if v_appt.id is null then raise exception 'appointment not found'; end if;
  if v_appt.patient_id <> v_uid and v_appt.doctor_id <> v_uid then raise exception 'forbidden'; end if;

  select id into v_cons_id from public.consultations where appointment_id = _appointment_id limit 1;
  if v_cons_id is null then
    insert into public.consultations (appointment_id, started_at) values (_appointment_id, now()) returning id into v_cons_id;
  end if;
  return v_cons_id;
end; $$;

grant execute on function public.get_or_create_consultation(uuid) to authenticated;

-- Convenience view-like RPC: my appointments with doctor info
create or replace function public.my_appointments()
returns table (
  id uuid,
  scheduled_at timestamptz,
  status appointment_status,
  mode appointment_mode,
  fee numeric,
  reason text,
  doctor_id uuid,
  patient_id uuid,
  doctor_name text,
  doctor_avatar text,
  specialty text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.scheduled_at, a.status, a.mode, a.fee, a.reason,
         a.doctor_id, a.patient_id,
         p.full_name as doctor_name, p.avatar_url as doctor_avatar, dp.specialty
  from public.appointments a
  left join public.profiles p on p.id = a.doctor_id
  left join public.doctor_profiles dp on dp.user_id = a.doctor_id
  where a.patient_id = auth.uid() or a.doctor_id = auth.uid()
  order by a.scheduled_at desc;
$$;
grant execute on function public.my_appointments() to authenticated;
