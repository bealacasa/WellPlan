-- =============================================================================
-- WellPlan · Cardio y ejercicios sueltos en el plan
--
-- Incluye también los cambios de la migración 0003 (tipo "clase"): si ya la ejecutaste,
-- no pasa nada, porque todo usa "if exists" / "if not exists" (es IDEMPOTENTE: se puede
-- ejecutar varias veces con el mismo resultado).
-- =============================================================================

begin;

-- 1) Tipos de ejercicio: + "clase" y + "cardio" (correr, bici, elíptica…)
alter table public.exercises drop constraint if exists exercises_type_check;
alter table public.exercises add constraint exercises_type_check
  check (type in ('maquina', 'peso_libre', 'peso_corporal', 'estiramiento', 'clase', 'cardio'));

alter table public.exercises drop constraint if exists exercises_duration_sec_check;
alter table public.exercises add constraint exercises_duration_sec_check
  check (duration_sec between 1 and 10800);

-- Objetivo de distancia para cardio (km, con dos decimales).
alter table public.exercises
  add column if not exists target_distance_km numeric(6, 2)
  check (target_distance_km between 0 and 1000);

-- Intervalos CaCo (caminar-correr), p. ej. 8 × (2 min corriendo + 1 min andando).
alter table public.exercises
  add column if not exists interval_run_sec integer check (interval_run_sec between 1 and 3600),
  add column if not exists interval_walk_sec integer check (interval_walk_sec between 0 and 3600),
  add column if not exists interval_rounds smallint check (interval_rounds between 1 and 100);

-- 2) Registros: además de kilos, datos de cardio. Todos opcionales (null = no aplica).
alter table public.weight_logs
  add column if not exists distance_km numeric(6, 2) check (distance_km between 0 and 1000),
  add column if not exists duration_sec integer check (duration_sec between 1 and 86400),
  -- Esfuerzo percibido (escala RPE): 1 = muy suave … 10 = máximo.
  add column if not exists effort smallint check (effort between 1 and 10);

-- 3) Plan: cada entrada es una sesión O un ejercicio suelto (nunca las dos, nunca ninguna).
alter table public.week_plan alter column session_id drop not null;
alter table public.week_plan add column if not exists exercise_id uuid;

alter table public.week_plan drop constraint if exists week_plan_exercise_fkey;
alter table public.week_plan add constraint week_plan_exercise_fkey
  foreign key (exercise_id, user_id) references public.exercises (id, user_id) on delete cascade;

-- num_nonnulls cuenta cuántos de sus argumentos no son null: exactamente uno.
alter table public.week_plan drop constraint if exists week_plan_one_target;
alter table public.week_plan add constraint week_plan_one_target
  check (num_nonnulls(session_id, exercise_id) = 1);

commit;
