-- =============================================================================
-- WellPlan · Horario de clases del gimnasio
--
-- Cada fila es UNA clase en UN día de la semana a UNA hora (si el Pilates es lunes y
-- miércoles, son dos filas). Si la marcas con "voy" (attending), la app la enlaza con un
-- ejercicio de tipo "clase" para que salga en Hoy y su historial se guarde como siempre.
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- =============================================================================

begin;

create table if not exists public.gym_classes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  -- 1 = lunes … 7 = domingo (igual que en week_plan).
  weekday smallint not null check (weekday between 1 and 7),
  -- Tipo "time": solo la hora del día, sin fecha ni zona horaria (p. ej. 18:30:00).
  start_time time not null,
  duration_min smallint not null check (duration_min between 5 and 300),
  room text not null default '' check (char_length(room) <= 60),
  instructor text not null default '' check (char_length(instructor) <= 60),
  attending boolean not null default false,
  -- Ejercicio "clase" con el que se registra la asistencia (null hasta que la marcas).
  exercise_id uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  -- Si se borra el ejercicio, la clase se queda sin enlazar: "set null (exercise_id)"
  -- pone a null SOLO esa columna (user_id forma parte de la clave pero no debe tocarse).
  constraint gym_classes_exercise_fkey foreign key (exercise_id, user_id)
    references public.exercises (id, user_id) on delete set null (exercise_id)
);

-- Lo mismo que en las demás tablas: marca de tiempo del servidor para sincronizar…
drop trigger if exists gym_classes_server_updated_at on public.gym_classes;
create trigger gym_classes_server_updated_at before insert or update on public.gym_classes
  for each row execute function public.set_server_updated_at();

-- …índice para "dame lo que ha cambiado desde X"…
create index if not exists gym_classes_sync_idx on public.gym_classes (user_id, server_updated_at);

-- …y seguridad por filas: cada persona solo ve y toca su propio horario.
alter table public.gym_classes enable row level security;
revoke all on table public.gym_classes from anon, authenticated;
grant select, insert, update, delete on table public.gym_classes to authenticated;

drop policy if exists "gym_classes: solo el propietario" on public.gym_classes;
create policy "gym_classes: solo el propietario" on public.gym_classes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;
