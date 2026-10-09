-- =============================================================================
-- WellPlan · Esquema inicial
--
-- Ideas clave (para aprender):
-- 1. Cada tabla tiene user_id: los datos de cada persona están separados.
-- 2. RLS (Row Level Security): Postgres filtra las filas según quién pregunta.
--    Aunque alguien tenga la clave pública de la app, solo ve SUS filas.
-- 3. Los ids (uuid) los genera el iPhone: así se pueden crear datos sin conexión.
-- 4. deleted_at = borrado lógico, para que un borrado hecho offline llegue a la nube.
-- 5. server_updated_at lo pone siempre el servidor: es el "cursor" para descargar
--    solo lo que ha cambiado desde la última sincronización.
-- =============================================================================

-- Función reutilizable: el servidor marca cuándo cambió cada fila.
create function public.set_server_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Ejercicios
-- -----------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  type text not null check (type in ('maquina', 'peso_libre', 'peso_corporal', 'estiramiento')),
  photo_id uuid,
  physio_notes text not null default '' check (char_length(physio_notes) <= 4000),
  sets smallint not null check (sets between 1 and 20),
  reps smallint check (reps between 1 and 200),
  duration_sec integer check (duration_sec between 1 and 3600),
  target_kg numeric(5, 2) check (target_kg between 0 and 500),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  -- Necesario para las claves foráneas compuestas de abajo.
  unique (id, user_id)
);

-- -----------------------------------------------------------------------------
-- Fotos (los archivos van en Storage; aquí solo los metadatos)
-- -----------------------------------------------------------------------------
create table public.photos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mime text not null check (mime in ('image/webp', 'image/jpeg')),
  width integer not null check (width between 1 and 4000),
  height integer not null check (height between 1 and 4000),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Registros de peso
-- -----------------------------------------------------------------------------
create table public.weight_logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id uuid not null,
  date date not null,
  kg numeric(5, 2) check (kg between 0 and 500),
  sets smallint not null check (sets between 1 and 20),
  reps smallint check (reps between 1 and 200),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  -- Clave foránea COMPUESTA: el ejercicio debe ser del mismo usuario.
  -- (Las FK no pasan por RLS; sin esto, alguien podría enlazar con un id ajeno.)
  foreign key (exercise_id, user_id) references public.exercises (id, user_id) on delete cascade
);

create index weight_logs_exercise_date_idx on public.weight_logs (exercise_id, date desc);

-- -----------------------------------------------------------------------------
-- Sesiones y su lista ordenada de ejercicios
-- -----------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  unique (id, user_id)
);

-- Tabla intermedia (relación muchos a muchos con orden): una sesión tiene varios
-- ejercicios y un ejercicio puede estar en varias sesiones.
create table public.session_exercises (
  session_id uuid not null,
  position smallint not null check (position between 0 and 99),
  exercise_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (session_id, position),
  foreign key (session_id, user_id) references public.sessions (id, user_id) on delete cascade,
  foreign key (exercise_id, user_id) references public.exercises (id, user_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Plan semanal: qué sesiones tocan cada día (1 = lunes … 7 = domingo)
-- -----------------------------------------------------------------------------
create table public.week_plan (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  session_id uuid not null,
  position smallint not null default 0 check (position between 0 and 20),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.sessions (id, user_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Triggers, índices de sincronización, privilegios y RLS (igual para todas)
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['exercises', 'photos', 'weight_logs', 'sessions', 'week_plan'] loop
    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function public.set_server_updated_at()',
      t || '_server_updated_at', t);
    -- "Dame lo que ha cambiado desde X" de forma eficiente.
    execute format('create index %I on public.%I (user_id, server_updated_at)', t || '_sync_idx', t);
  end loop;

  foreach t in array array['exercises', 'photos', 'weight_logs', 'sessions', 'session_exercises', 'week_plan'] loop
    execute format('alter table public.%I enable row level security', t);
    -- Nadie sin sesión (anon) puede tocar nada; con sesión, solo lo propio (RLS).
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t || ': solo el propietario', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Storage: bucket privado para las fotos, una carpeta por usuario ({user_id}/...)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "photos: leer las propias" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: subir a la carpeta propia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: reemplazar las propias" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: borrar las propias" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
