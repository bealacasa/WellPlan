-- =============================================================================
-- WellPlan · Objetivo del día en el plan y foto en las sesiones
--
-- 1) Un ejercicio de cardio puesto en un día del plan puede tener SU PROPIO objetivo
--    (p. ej. el ejercicio "Correr" dice 5 km, pero el martes toca 8 × CaCo). Si estas
--    columnas son null, vale el objetivo del ejercicio.
-- 2) Las sesiones pueden tener foto, igual que los ejercicios.
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- =============================================================================

begin;

-- 1) Objetivo del día (mismos límites que en exercises).
alter table public.week_plan
  add column if not exists target_distance_km numeric(6, 2) check (target_distance_km between 0 and 1000),
  add column if not exists duration_sec integer check (duration_sec between 1 and 10800),
  add column if not exists interval_run_sec integer check (interval_run_sec between 1 and 3600),
  add column if not exists interval_walk_sec integer check (interval_walk_sec between 0 and 3600),
  add column if not exists interval_rounds smallint check (interval_rounds between 1 and 100);

-- Los intervalos CaCo van completos o no van: num_nulls cuenta los argumentos null,
-- así que debe ser 0 (los tres puestos) o 3 (ninguno).
alter table public.week_plan drop constraint if exists week_plan_intervals_complete;
alter table public.week_plan add constraint week_plan_intervals_complete
  check (num_nulls(interval_run_sec, interval_walk_sec, interval_rounds) in (0, 3));

-- 2) Foto de la sesión (los archivos van en Storage, como las de los ejercicios).
alter table public.sessions add column if not exists photo_id uuid;

commit;
