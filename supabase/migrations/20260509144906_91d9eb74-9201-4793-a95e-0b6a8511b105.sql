
-- =====================
-- ENUMS
-- =====================
create type public.app_role as enum ('user', 'doctor', 'admin');
create type public.kyc_status as enum ('pending', 'approved', 'rejected');
create type public.appointment_mode as enum ('chat', 'voice', 'video', 'in_person');
create type public.appointment_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show');
create type public.doc_type as enum ('license', 'gov_id', 'selfie', 'certificate');

-- =====================
-- PROFILES
-- =====================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  dob date,
  gender text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- =====================
-- USER ROLES (separate table; never on profiles)
-- =====================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.current_user_roles()
returns setof app_role
language sql stable security definer set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

-- =====================
-- DOCTOR PROFILES
-- =====================
create table public.doctor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  specialty text,
  bio text,
  years_exp integer default 0,
  fee numeric(10,2) default 0,
  location text,
  languages text[] default '{}',
  license_number text,
  kyc_status kyc_status not null default 'pending',
  kyc_notes text,
  rating numeric(3,2) default 0,
  reviews_count integer default 0,
  patients_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.doctor_profiles enable row level security;

create table public.doctor_documents (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references auth.users(id) on delete cascade,
  type doc_type not null,
  file_path text not null,
  uploaded_at timestamptz not null default now()
);
alter table public.doctor_documents enable row level security;

create table public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null
);
alter table public.doctor_availability enable row level security;

-- =====================
-- APPOINTMENTS / CONSULTATIONS
-- =====================
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  mode appointment_mode not null,
  scheduled_at timestamptz not null,
  status appointment_status not null default 'scheduled',
  fee numeric(10,2) default 0,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.appointments enable row level security;

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.consultations enable row level security;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid references public.consultations(id) on delete set null,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  pdf_path text,
  issued_at timestamptz not null default now()
);
alter table public.prescriptions enable row level security;

create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text,
  file_path text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.medical_records enable row level security;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (appointment_id, patient_id)
);
alter table public.reviews enable row level security;

-- =====================
-- POLICIES
-- =====================

-- profiles
create policy "profiles self select" on public.profiles for select using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profiles self insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles self update" on public.profiles for update using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
-- doctors are listed publicly via doctor_profiles join; allow anyone authenticated to read minimal profile of approved doctors
create policy "profiles read approved doctors" on public.profiles for select to authenticated
  using (exists (select 1 from public.doctor_profiles d where d.user_id = profiles.id and d.kyc_status='approved'));

-- user_roles
create policy "roles self read" on public.user_roles for select using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "roles admin write" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
-- allow inserting own non-admin role on signup
create policy "roles self insert non-admin" on public.user_roles for insert with check (
  user_id = auth.uid() and role in ('user','doctor')
);

-- doctor_profiles
create policy "doctor own all" on public.doctor_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "doctor admin all" on public.doctor_profiles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "doctor public approved read" on public.doctor_profiles for select to authenticated using (kyc_status = 'approved');

-- doctor_documents (private)
create policy "docs owner all" on public.doctor_documents for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());
create policy "docs admin all" on public.doctor_documents for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- doctor_availability
create policy "avail owner write" on public.doctor_availability for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());
create policy "avail public read" on public.doctor_availability for select to authenticated using (true);

-- appointments
create policy "appt patient read" on public.appointments for select using (patient_id = auth.uid() or doctor_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "appt patient insert" on public.appointments for insert with check (patient_id = auth.uid());
create policy "appt patient update" on public.appointments for update using (patient_id = auth.uid() or doctor_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "appt admin delete" on public.appointments for delete using (public.has_role(auth.uid(),'admin'));

-- consultations
create policy "cons participants read" on public.consultations for select using (
  exists (select 1 from public.appointments a where a.id = appointment_id and (a.patient_id = auth.uid() or a.doctor_id = auth.uid()))
  or public.has_role(auth.uid(),'admin')
);
create policy "cons participants write" on public.consultations for all using (
  exists (select 1 from public.appointments a where a.id = appointment_id and (a.patient_id = auth.uid() or a.doctor_id = auth.uid()))
) with check (
  exists (select 1 from public.appointments a where a.id = appointment_id and (a.patient_id = auth.uid() or a.doctor_id = auth.uid()))
);

-- messages
create policy "msg participants read" on public.messages for select using (
  exists (
    select 1 from public.consultations c
    join public.appointments a on a.id = c.appointment_id
    where c.id = consultation_id and (a.patient_id = auth.uid() or a.doctor_id = auth.uid())
  ) or public.has_role(auth.uid(),'admin')
);
create policy "msg participants insert" on public.messages for insert with check (
  sender_id = auth.uid() and exists (
    select 1 from public.consultations c
    join public.appointments a on a.id = c.appointment_id
    where c.id = consultation_id and (a.patient_id = auth.uid() or a.doctor_id = auth.uid())
  )
);

-- prescriptions
create policy "rx parties read" on public.prescriptions for select using (patient_id = auth.uid() or doctor_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "rx doctor write" on public.prescriptions for insert with check (doctor_id = auth.uid());
create policy "rx doctor update" on public.prescriptions for update using (doctor_id = auth.uid());

-- medical_records
create policy "rec patient read" on public.medical_records for select using (patient_id = auth.uid() or uploaded_by = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "rec insert by self or doctor" on public.medical_records for insert with check (
  uploaded_by = auth.uid() and (patient_id = auth.uid() or public.has_role(auth.uid(),'doctor'))
);
create policy "rec patient delete" on public.medical_records for delete using (patient_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- reviews
create policy "rev public read" on public.reviews for select to authenticated using (true);
create policy "rev patient write" on public.reviews for insert with check (patient_id = auth.uid());
create policy "rev patient update" on public.reviews for update using (patient_id = auth.uid());
create policy "rev admin delete" on public.reviews for delete using (public.has_role(auth.uid(),'admin'));

-- =====================
-- TRIGGERS
-- =====================

-- updated_at touch
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger doctor_profiles_touch before update on public.doctor_profiles for each row execute function public.touch_updated_at();
create trigger appointments_touch before update on public.appointments for each row execute function public.touch_updated_at();

-- auto-create profile on signup; assign default 'user' role; if metadata.role='doctor' also create doctor_profiles row
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  desired_role text;
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  desired_role := coalesce(new.raw_user_meta_data->>'role', 'user');

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  if desired_role = 'doctor' then
    insert into public.user_roles (user_id, role) values (new.id, 'doctor') on conflict do nothing;
    insert into public.doctor_profiles (user_id) values (new.id) on conflict do nothing;
  end if;

  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================
-- STORAGE BUCKETS
-- =====================
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('doctor-kyc', 'doctor-kyc', false),
  ('prescriptions', 'prescriptions', false),
  ('medical-records', 'medical-records', false)
on conflict (id) do nothing;

-- avatars: public read, owner write (path = userId/...)
create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars owner write" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars owner update" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars owner delete" on storage.objects for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- doctor-kyc: only owner doctor + admins
create policy "kyc owner read" on storage.objects for select using (bucket_id = 'doctor-kyc' and (auth.uid()::text = (storage.foldername(name))[1] or public.has_role(auth.uid(),'admin')));
create policy "kyc owner write" on storage.objects for insert with check (bucket_id = 'doctor-kyc' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "kyc owner update" on storage.objects for update using (bucket_id = 'doctor-kyc' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "kyc owner delete" on storage.objects for delete using (bucket_id = 'doctor-kyc' and (auth.uid()::text = (storage.foldername(name))[1] or public.has_role(auth.uid(),'admin')));

-- prescriptions: doctor (owner) + admins read/write; patients read their own (path = patientId/...)
create policy "rx read" on storage.objects for select using (
  bucket_id = 'prescriptions' and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.has_role(auth.uid(),'admin')
    or public.has_role(auth.uid(),'doctor')
  )
);
create policy "rx write" on storage.objects for insert with check (bucket_id = 'prescriptions' and (public.has_role(auth.uid(),'doctor') or public.has_role(auth.uid(),'admin')));

-- medical-records: patient owner read/write, doctors with role read
create policy "rec read" on storage.objects for select using (
  bucket_id = 'medical-records' and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.has_role(auth.uid(),'doctor')
    or public.has_role(auth.uid(),'admin')
  )
);
create policy "rec write" on storage.objects for insert with check (bucket_id = 'medical-records' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "rec update" on storage.objects for update using (bucket_id = 'medical-records' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "rec delete" on storage.objects for delete using (bucket_id = 'medical-records' and (auth.uid()::text = (storage.foldername(name))[1] or public.has_role(auth.uid(),'admin')));
