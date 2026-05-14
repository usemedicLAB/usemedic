
-- ============ Doctor rating recompute ============
create or replace function public.recompute_doctor_rating(_doctor_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_avg numeric; v_count int;
begin
  select coalesce(avg(rating)::numeric(3,2), 0), count(*)
    into v_avg, v_count
    from public.reviews where doctor_id = _doctor_id;
  update public.doctor_profiles
     set rating = v_avg, reviews_count = v_count, updated_at = now()
   where user_id = _doctor_id;
end; $$;

create or replace function public.reviews_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_doctor_rating(old.doctor_id);
    return old;
  else
    perform public.recompute_doctor_rating(new.doctor_id);
    if (tg_op = 'UPDATE' and new.doctor_id <> old.doctor_id) then
      perform public.recompute_doctor_rating(old.doctor_id);
    end if;
    return new;
  end if;
end; $$;

drop trigger if exists trg_reviews_recompute on public.reviews;
create trigger trg_reviews_recompute
after insert or update or delete on public.reviews
for each row execute function public.reviews_after_change();

-- one review per appointment
create unique index if not exists reviews_appt_unique
  on public.reviews (appointment_id)
  where appointment_id is not null;

-- ============ Notifications ============
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notif self read" on public.notifications;
create policy "notif self read" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "notif self update" on public.notifications;
create policy "notif self update" on public.notifications
  for update using (user_id = auth.uid());

drop policy if exists "notif self delete" on public.notifications;
create policy "notif self delete" on public.notifications
  for delete using (user_id = auth.uid());

drop policy if exists "notif admin all" on public.notifications;
create policy "notif admin all" on public.notifications
  for all using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

alter publication supabase_realtime add table public.notifications;

-- ============ Auto-notify triggers ============
create or replace function public.notify_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.notifications (user_id, kind, title, body, link)
    values (new.doctor_id, 'appointment_new', 'New appointment',
            'A patient booked a consultation with you',
            '/doctor/dashboard');
    return new;
  end if;
  if (tg_op = 'UPDATE' and old.paid_at is null and new.paid_at is not null) then
    insert into public.notifications (user_id, kind, title, body, link)
    values (new.doctor_id, 'appointment_paid', 'Payment received',
            'A patient just paid for their consultation',
            '/doctor/dashboard');
  end if;
  return new;
end; $$;
drop trigger if exists trg_notify_appointment on public.appointments;
create trigger trg_notify_appointment
after insert or update on public.appointments
for each row execute function public.notify_appointment();

create or replace function public.notify_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_appt record; v_recipient uuid;
begin
  select a.patient_id, a.doctor_id, a.id
    into v_appt
    from public.consultations c
    join public.appointments a on a.id = c.appointment_id
   where c.id = new.consultation_id;
  if v_appt.id is null then return new; end if;
  v_recipient := case when new.sender_id = v_appt.patient_id
                     then v_appt.doctor_id else v_appt.patient_id end;
  insert into public.notifications (user_id, kind, title, body, link)
  values (v_recipient, 'message', 'New message',
          left(coalesce(new.body, 'New attachment'), 120),
          '/consultations/' || new.consultation_id::text);
  return new;
end; $$;
drop trigger if exists trg_notify_message on public.messages;
create trigger trg_notify_message
after insert on public.messages
for each row execute function public.notify_message();

create or replace function public.notify_kyc()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.kyc_status is distinct from old.kyc_status) then
    insert into public.notifications (user_id, kind, title, body, link)
    values (new.user_id, 'kyc_' || new.kyc_status::text,
            case new.kyc_status::text
              when 'approved' then 'KYC approved'
              when 'rejected' then 'KYC needs attention'
              else 'KYC update'
            end,
            coalesce(new.kyc_notes, 'Open KYC to view details'),
            '/doctor/kyc');
  end if;
  return new;
end; $$;
drop trigger if exists trg_notify_kyc on public.doctor_profiles;
create trigger trg_notify_kyc
after update on public.doctor_profiles
for each row execute function public.notify_kyc();

create or replace function public.notify_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, kind, title, body, link)
  values (new.doctor_id, 'review',
          'New ' || new.rating::text || '★ review',
          left(coalesce(new.comment, 'A patient left you a review'), 120),
          '/doctor/dashboard');
  return new;
end; $$;
drop trigger if exists trg_notify_review on public.reviews;
create trigger trg_notify_review
after insert on public.reviews
for each row execute function public.notify_review();
