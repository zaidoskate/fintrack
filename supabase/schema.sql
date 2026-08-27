-- ============================================================
-- FinTrack — Esquema de Supabase (PostgreSQL)
-- Versión: 1.0 · Reemplaza el modelo de Google Sheets
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── 1. PROFILES (extiende auth.users, que Supabase ya gestiona) ──
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- Crea automáticamente un profile cuando alguien se registra
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. TARJETAS ────────────────────────────────────────────────
create table public.tarjetas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  limite numeric(12,2) not null default 0,
  dia_corte int not null check (dia_corte between 1 and 31),
  dia_pago int not null check (dia_pago between 1 and 31),
  rendimiento_anual numeric(5,2) not null default 0, -- Solo para Débito
  created_at timestamptz not null default now()
);

-- ── 3. MOVIMIENTOS ─────────────────────────────────────────────
create table public.movimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  hora time not null default current_time,
  tipo text not null check (tipo in ('Gasto', 'Ingreso')),
  monto numeric(12,2) not null check (monto > 0),
  categoria text not null default 'Sin categoría',
  comercio text not null default 'N/A',
  metodo_pago text not null default 'Efectivo',
  created_at timestamptz not null default now()
);

create index idx_movimientos_user_fecha on public.movimientos (user_id, fecha);
create index idx_movimientos_user_metodo on public.movimientos (user_id, metodo_pago);

-- ── 4. METAS DE AHORRO ─────────────────────────────────────────
create table public.metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  costo_objetivo numeric(12,2) not null check (costo_objetivo > 0),
  created_at timestamptz not null default now()
);

-- ── 4.5 APORTES A METAS ────────────────────────────────────────
create table public.meta_aportes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meta_id uuid not null references public.metas(id) on delete cascade,
  monto numeric(12,2) not null check (monto > 0),
  fecha date not null default current_date,
  tarjeta_origen_id uuid references public.tarjetas(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_aportes_meta on public.meta_aportes (meta_id);

-- ── 5. COMPRAS A MESES (MSI) ────────────────────────────────────
create table public.compras_msi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tarjeta_id uuid not null references public.tarjetas(id) on delete cascade,
  fecha_compra date not null default current_date,
  comercio text not null,
  categoria text not null default 'Sin categoría',
  monto_total numeric(12,2) not null check (monto_total > 0),
  meses_totales int not null check (meses_totales >= 2),
  cuota_mensual numeric(12,2) generated always as (round(monto_total / meses_totales, 2)) stored,
  fecha_primer_cargo date not null default current_date,
  fecha_ultima_cuota date not null,
  created_at timestamptz not null default now()
);

create index idx_msi_user_tarjeta on public.compras_msi (user_id, tarjeta_id);

-- ============================================================
-- ROW LEVEL SECURITY — aislamiento automático por usuario
-- ============================================================

alter table public.profiles enable row level security;
alter table public.tarjetas enable row level security;
alter table public.movimientos enable row level security;
alter table public.metas enable row level security;
alter table public.compras_msi enable row level security;

-- profiles: cada quien ve/edita solo su propio perfil
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Patrón repetido para tarjetas, movimientos, metas, compras_msi:
-- el usuario solo puede ver/crear/editar/borrar SUS PROPIAS filas.

create policy "tarjetas_all_own" on public.tarjetas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "movimientos_all_own" on public.movimientos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "metas_all_own" on public.metas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "meta_aportes_all_own" on public.meta_aportes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "compras_msi_all_own" on public.compras_msi
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- NOTA: la ruta de captura del Shortcut de iPhone usa la
-- SERVICE ROLE KEY (nunca expuesta al navegador), que se salta
-- RLS por diseño — así puede insertar en nombre de tu user_id
-- fijo sin necesidad de que el Shortcut haga login OAuth.
-- ============================================================