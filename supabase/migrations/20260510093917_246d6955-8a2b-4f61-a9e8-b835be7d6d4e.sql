-- Banners table for admin-managed home ads
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  cta_label text,
  cta_url text,
  image_url text,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.banners enable row level security;

drop policy if exists "banners read all" on public.banners;
create policy "banners read all" on public.banners for select to authenticated using (true);

drop policy if exists "banners admin write" on public.banners;
create policy "banners admin write" on public.banners for all
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

drop trigger if exists banners_touch_updated on public.banners;
create trigger banners_touch_updated before update on public.banners
  for each row execute function public.touch_updated_at();

-- Public bucket for banner images
insert into storage.buckets (id, name, public) values ('banners', 'banners', true)
  on conflict (id) do nothing;

drop policy if exists "banners bucket public read" on storage.objects;
create policy "banners bucket public read" on storage.objects for select using (bucket_id = 'banners');

drop policy if exists "banners bucket admin write" on storage.objects;
create policy "banners bucket admin write" on storage.objects for all
  using (bucket_id = 'banners' and public.has_role(auth.uid(), 'admin'::app_role))
  with check (bucket_id = 'banners' and public.has_role(auth.uid(), 'admin'::app_role));