alter table public.appointments add column if not exists paid_at timestamptz;
alter table public.appointments add column if not exists payment_ref text;

drop function if exists public.my_appointments();

create function public.my_appointments()
returns table (
  id uuid, scheduled_at timestamptz, status appointment_status, mode appointment_mode,
  fee numeric, reason text, doctor_id uuid, patient_id uuid,
  doctor_name text, doctor_avatar text, specialty text,
  paid_at timestamptz, payment_ref text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.scheduled_at, a.status, a.mode, a.fee, a.reason,
         a.doctor_id, a.patient_id,
         p.full_name as doctor_name, p.avatar_url as doctor_avatar, dp.specialty,
         a.paid_at, a.payment_ref
  from public.appointments a
  left join public.profiles p on p.id = a.doctor_id
  left join public.doctor_profiles dp on dp.user_id = a.doctor_id
  where a.patient_id = auth.uid() or a.doctor_id = auth.uid()
  order by a.scheduled_at desc;
$$;