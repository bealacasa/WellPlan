import { useDeferredValue, useState } from "react";
import { Link } from "react-router";
import { ExercisePhoto } from "@/components/ExercisePhoto";
import { TypeChip } from "@/components/typeStyle";
import { EmptyState, PageHeader, buttonPrimary, inputClass } from "@/components/ui";
import { useExercises } from "@/db/repositories/exercises";
import { EXERCISE_TYPE_LABEL, targetLabel } from "@/lib/labels";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function ExercisesPage() {
  const exercises = useExercises();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const visible = exercises?.filter((e) => normalize(e.name).includes(normalize(deferred)));

  return (
    <>
      <PageHeader title="Ejercicios" subtitle="Los ejercicios que te ha mandado tu fisio." />
      <Link to="/ejercicios/nuevo" className={`${buttonPrimary} mb-5`}>
        + Añadir ejercicio
      </Link>

      {exercises && exercises.length > 0 && (
        <div className="mb-4">
          <label htmlFor="buscar" className="sr-only">
            Buscar ejercicio
          </label>
          <input
            id="buscar"
            type="search"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      {exercises === undefined ? null : exercises.length === 0 ? (
        <EmptyState title="Todavía no hay ejercicios">
          <p>Añade el primero con una foto de la máquina y las indicaciones de tu fisio.</p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {visible?.map((e) => (
            <li key={e.id}>
              <Link
                to={`/ejercicios/${e.id}`}
                className="flex min-h-20 items-center gap-3 rounded-3xl border border-border bg-surface p-2 pr-4 shadow-sm active:scale-[0.99]"
              >
                <ExercisePhoto
                  photoId={e.photoId}
                  type={e.type}
                  name={e.name}
                  variant="thumb"
                  alt=""
                  className="size-16 shrink-0 rounded-xl"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-bold">{e.name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <TypeChip type={e.type} label={EXERCISE_TYPE_LABEL[e.type]} />
                    {targetLabel(e)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {visible?.length === 0 && (
            <li className="p-4 text-center text-muted">Ningún ejercicio coincide con «{query}».</li>
          )}
        </ul>
      )}
    </>
  );
}
