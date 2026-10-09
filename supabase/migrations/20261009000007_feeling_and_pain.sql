-- =============================================================================
-- WellPlan · Sensación y zona de dolor en cada registro
--
-- feeling: "¿cómo te has encontrado?" de 0 (fatal) a 10 (perfecto). Null = sin valorar.
-- pain_area: zona donde has notado molestias (rodilla, lumbar…). Null = ninguna.
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- =============================================================================

begin;

alter table public.weight_logs
  add column if not exists feeling smallint check (feeling between 0 and 10),
  add column if not exists pain_area text check (char_length(pain_area) between 1 and 40);

commit;
