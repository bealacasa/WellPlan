-- =============================================================================
-- WellPlan · Extras de un día concreto ("solo para hoy")
--
-- El plan semanal se repite cada semana (todos los jueves…). Esta tabla guarda lo que
-- añades para UNA fecha concreta (p. ej. hoy me apetece Yoga), sin tocar el plan.
-- Cada fila es una sesión O un ejercicio (nunca las dos), como en week_plan.
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- =============================================================================

begin;

create table if not exists public.day_extras (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Tipo date: solo el día (sin hora), en el calendario del usuario.
  date date not null,
  session_id uuid,
  exercise_id uuid,
  position smallint not null default 0 check (position between 0 and 50),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  constraint day_extras_one_target check (num_nonnulls(session_id, exercise_id) = 1),
  -- Claves compuestas: solo se puede enlazar con sesiones y ejercicios propios.
  constraint day_extras_session_fkey foreign key (session_id, user_id)
    references public.sessions (id, user_id) on delete cascade,
  constraint day_extras_exercise_fkey foreign key (exercise_id, user_id)
    references public.exercises (id, user_id) on delete cascade
);

drop trigger if exists day_extras_server_updated_at on public.day_extras;
create trigger day_extras_server_updated_at before insert or update on public.day_extras
  for each row execute function public.set_server_updated_at();

create index if not exists day_extras_sync_idx on public.day_extras (user_id, server_updated_at);

alter table public.day_extras enable row level security;
revoke all on table public.day_extras from anon, authenticated;
grant select, insert, update, delete on table public.day_extras to authenticated;

drop policy if exists "day_extras: solo el propietario" on public.day_extras;
create policy "day_extras: solo el propietario" on public.day_extras
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;
