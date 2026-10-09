-- =============================================================================
-- WellPlan · Guardar el orden de los ejercicios de una sesión de forma ATÓMICA
--
-- Idea clave (para aprender): una función de Postgres se ejecuta dentro de UNA
-- transacción. Si algo falla a mitad (p. ej. un ejercicio que no existe), se deshace
-- todo y la sesión conserva su lista anterior: nunca queda a medias.
--
-- "security invoker" (lo normal): la función corre con los permisos de quien la llama,
-- así que las políticas RLS siguen aplicándose. Nadie puede tocar sesiones ajenas.
-- =============================================================================

create function public.set_session_exercises(p_session_id uuid, p_exercise_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(array_length(p_exercise_ids, 1), 0) > 100 then
    raise exception 'Una sesión admite como máximo 100 ejercicios';
  end if;

  -- Gracias a RLS, solo "existe" si la sesión es del usuario que llama.
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'Sesión no encontrada';
  end if;

  delete from public.session_exercises where session_id = p_session_id;

  -- unnest ... with ordinality convierte el array en filas numeradas: 1, 2, 3…
  insert into public.session_exercises (session_id, position, exercise_id)
  select p_session_id, (t.ord - 1)::smallint, t.exercise_id
  from unnest(p_exercise_ids) with ordinality as t (exercise_id, ord);
end;
$$;

revoke all on function public.set_session_exercises(uuid, uuid[]) from public, anon;
grant execute on function public.set_session_exercises(uuid, uuid[]) to authenticated;
