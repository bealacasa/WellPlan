-- =============================================================================
-- WellPlan · Nuevo tipo de ejercicio: "clase" (pilates, yoga, spinning…)
--
-- Idea clave (para aprender): las restricciones CHECK no se "editan": se borran y se
-- vuelven a crear. Postgres les puso nombre automáticamente al crear la tabla
-- (<tabla>_<columna>_check). Al ir en una sola transacción, nunca queda la tabla sin regla.
-- =============================================================================

begin;

alter table public.exercises drop constraint exercises_type_check;
alter table public.exercises add constraint exercises_type_check
  check (type in ('maquina', 'peso_libre', 'peso_corporal', 'estiramiento', 'clase'));

-- Las clases duran más que un estiramiento: hasta 3 horas (10 800 s).
alter table public.exercises drop constraint exercises_duration_sec_check;
alter table public.exercises add constraint exercises_duration_sec_check
  check (duration_sec between 1 and 10800);

commit;
