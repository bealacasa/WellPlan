import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useConfirm } from "@/components/ConfirmDialog";
import { ExercisePhoto } from "@/components/ExercisePhoto";
import {
  EmptyState,
  PageHeader,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "@/components/ui";
import { useExercises } from "@/db/repositories/exercises";
import {
  createSession,
  deleteSession,
  updateSession,
  useSession,
} from "@/db/repositories/sessions";
import type { Exercise, Session } from "@/db/types";
import { targetLabel } from "@/lib/labels";
import { moveItem } from "@/lib/lists";
import { sessionInputSchema } from "@/lib/validation";

/** Alta (/sesiones/nueva) y edición (/sesiones/:id) de una sesión. */
export function SessionFormPage() {
  const { id } = useParams();
  const session = useSession(id);
  const exercises = useExercises();
  if ((id && session === undefined) || exercises === undefined) return null;
  if (id && session === null) {
    return (
      <>
        <PageHeader title="Sesión no encontrada" />
        <Link to="/plan" className="underline">
          Volver al plan
        </Link>
      </>
    );
  }
  return <SessionForm key={id ?? "nueva"} session={session ?? null} catalog={exercises} />;
}

const iconButton =
  "grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-xl font-bold active:scale-95 disabled:opacity-30";

function SessionForm({ session, catalog }: { session: Session | null; catalog: Exercise[] }) {
  const navigate = useNavigate();
  const [dialog, confirm] = useConfirm();
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const [name, setName] = useState(session?.name ?? "");
  // Ignora ejercicios que ya no existen (borrados en otro dispositivo).
  const [ids, setIds] = useState(() => (session?.exerciseIds ?? []).filter((id) => byId.has(id)));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const available = catalog.filter((e) => !ids.includes(e.id));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = sessionInputSchema.safeParse({ name, exerciseIds: ids });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }
    if (ids.length === 0) {
      setError("Añade al menos un ejercicio.");
      return;
    }
    setSaving(true);
    try {
      if (session) await updateSession(session.id, parsed.data);
      else await createSession(parsed.data);
      navigate("/plan", { replace: true });
    } catch {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }

  async function remove() {
    if (!session) return;
    const ok = await confirm({
      title: `¿Borrar «${session.name}»?`,
      message: "Se quitará también de los días del plan. Los ejercicios no se borran.",
      confirmLabel: "Borrar sesión",
    });
    if (!ok) return;
    await deleteSession(session.id);
    navigate("/plan", { replace: true });
  }

  return (
    <>
      <Link to="/plan" className="mb-2 inline-flex min-h-11 items-center font-medium text-muted">
        ← Plan
      </Link>
      <PageHeader title={session ? "Editar sesión" : "Nueva sesión"} />
      <form onSubmit={save} className="space-y-6" noValidate>
        <div>
          <label htmlFor="session-name" className="text-sm font-medium">
            Nombre
          </label>
          <input
            id="session-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoCapitalize="sentences"
            placeholder="Ej.: Pierna + core"
            className={`${inputClass} mt-1`}
          />
        </div>

        <section aria-labelledby="orden">
          <h2 id="orden" className="text-lg font-semibold">
            Ejercicios, en orden ({ids.length})
          </h2>
          {ids.length === 0 ? (
            <p className="mt-2 text-muted">Añádelos desde la lista de abajo.</p>
          ) : (
            <ol aria-labelledby="orden" className="mt-2 space-y-2">
              {ids.map((exerciseId, index) => {
                const exercise = byId.get(exerciseId);
                if (!exercise) return null;
                return (
                  <li
                    key={exerciseId}
                    className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2"
                  >
                    <span className="w-6 shrink-0 text-center font-bold text-muted tabular-nums">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{exercise.name}</span>
                    <button
                      type="button"
                      onClick={() => setIds((list) => moveItem(list, index, -1))}
                      disabled={index === 0}
                      aria-label={`Subir ${exercise.name}`}
                      className={iconButton}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => setIds((list) => moveItem(list, index, 1))}
                      disabled={index === ids.length - 1}
                      aria-label={`Bajar ${exercise.name}`}
                      className={iconButton}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => setIds((list) => list.filter((x) => x !== exerciseId))}
                      aria-label={`Quitar ${exercise.name}`}
                      className={`${iconButton} text-danger`}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="catalogo">
          <h2 id="catalogo" className="text-lg font-semibold">
            Añadir ejercicios
          </h2>
          {catalog.length === 0 ? (
            <EmptyState title="Aún no tienes ejercicios">
              <Link to="/ejercicios/nuevo" className={`${buttonSecondary} mt-3`}>
                Crear un ejercicio
              </Link>
            </EmptyState>
          ) : available.length === 0 ? (
            <p className="mt-2 text-muted">Ya están todos en la sesión.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {available.map((exercise) => (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => setIds((list) => [...list, exercise.id])}
                    className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-dashed border-border p-2 pr-4 text-left active:scale-[0.99]"
                  >
                    <ExercisePhoto
                      photoId={exercise.photoId}
                      variant="thumb"
                      alt=""
                      className="size-12 shrink-0 rounded-xl"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{exercise.name}</span>
                      <span className="block text-sm text-muted">{targetLabel(exercise)}</span>
                    </span>
                    <span aria-hidden="true" className="text-2xl font-bold text-accent">
                      +
                    </span>
                    <span className="sr-only">Añadir a la sesión</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && (
          <p role="alert" className="font-medium text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={saving} className={buttonPrimary}>
          {saving ? "Guardando…" : "Guardar sesión"}
        </button>
        {session && (
          <button
            type="button"
            onClick={remove}
            className="min-h-12 w-full rounded-2xl font-semibold text-danger"
          >
            Borrar sesión
          </button>
        )}
      </form>
      {dialog}
    </>
  );
}
