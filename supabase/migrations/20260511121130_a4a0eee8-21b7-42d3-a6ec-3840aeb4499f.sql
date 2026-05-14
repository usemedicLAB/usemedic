
-- AMBULANCE
create type public.ambulance_type as enum ('basic_life_support','advanced_life_support','patient_transport');
create type public.ambulance_status as enum ('available','busy');
create type public.booking_status as enum ('dispatched','en_route','arrived','completed','cancelled');

create table public.ambulance_units (
  id uuid primary key default gen_random_uuid(),
  unit_name text not null,
  unit_code text not null unique,
  type ambulance_type not null default 'basic_life_support',
  price numeric not null default 0,
  status ambulance_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ambulance_bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('MED-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  patient_id uuid not null,
  unit_id uuid not null references public.ambulance_units(id) on delete restrict,
  location_text text not null,
  lat numeric,
  lng numeric,
  fee numeric not null default 0,
  status booking_status not null default 'dispatched',
  rating smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ambulance_units enable row level security;
alter table public.ambulance_bookings enable row level security;

create policy "amb units read all" on public.ambulance_units for select to authenticated using (true);
create policy "amb units admin all" on public.ambulance_units for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create policy "amb book patient insert" on public.ambulance_bookings for insert with check (patient_id = auth.uid());
create policy "amb book patient read" on public.ambulance_bookings for select using (patient_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "amb book patient update" on public.ambulance_bookings for update using (patient_id = auth.uid() or has_role(auth.uid(),'admin'));

create trigger amb_units_touch before update on public.ambulance_units for each row execute function public.touch_updated_at();
create trigger amb_book_touch before update on public.ambulance_bookings for each row execute function public.touch_updated_at();

-- PHARMACY
create type public.product_category as enum ('prescription','otc','vitamins','devices','wellness');
create type public.pharmacy_order_status as enum ('processing','dispatched','delivered','cancelled');

create table public.pharmacy_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category product_category not null default 'otc',
  price numeric not null default 0,
  image_url text,
  in_stock boolean not null default true,
  requires_rx boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pharmacy_orders (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('PH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  patient_id uuid not null,
  status pharmacy_order_status not null default 'processing',
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  total numeric not null default 0,
  delivery_address text not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pharmacy_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.pharmacy_orders(id) on delete cascade,
  product_id uuid not null references public.pharmacy_products(id) on delete restrict,
  name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pharmacy_products enable row level security;
alter table public.pharmacy_orders enable row level security;
alter table public.pharmacy_order_items enable row level security;

create policy "rx products read all" on public.pharmacy_products for select to authenticated using (true);
create policy "rx products admin all" on public.pharmacy_products for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create policy "ph orders self insert" on public.pharmacy_orders for insert with check (patient_id = auth.uid());
create policy "ph orders self read" on public.pharmacy_orders for select using (patient_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "ph orders self update" on public.pharmacy_orders for update using (patient_id = auth.uid() or has_role(auth.uid(),'admin'));

create policy "ph items self read" on public.pharmacy_order_items for select using (
  exists (select 1 from public.pharmacy_orders o where o.id = order_id and (o.patient_id = auth.uid() or has_role(auth.uid(),'admin')))
);
create policy "ph items self insert" on public.pharmacy_order_items for insert with check (
  exists (select 1 from public.pharmacy_orders o where o.id = order_id and o.patient_id = auth.uid())
);

create trigger ph_products_touch before update on public.pharmacy_products for each row execute function public.touch_updated_at();
create trigger ph_orders_touch before update on public.pharmacy_orders for each row execute function public.touch_updated_at();
