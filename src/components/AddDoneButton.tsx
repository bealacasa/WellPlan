import type { PlanTarget } from "@/db/repositories/plan";

type Option = { id: string; name: string };

/**
 * Botón «+ He hecho…» para apuntar algo ya hecho: abre la lista de sesiones y ejercicios
 * que ya existen. El selector nativo (ruleta del iPhone) va invisible encima del botón: se
 * toca el botón y se abre la lista.
 */
export function AddDoneButton({
  label,
  ariaLabel,
  sessions,
  exercises,
  onPick,
}: {
  label: string;
  ariaLabel: string;
  sessions: Option[];
  exercises: Option[];
  onPick: (target: PlanTarget, name: string) => void;
}) {
  if (sessions.length === 0 && exercises.length === 0) return null;
  const names = new Map([...sessions, ...exercises].map((x) => [x.id, x.name]));
  return (
    <div className="relative mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-dashed border-accent font-bold text-accent">
      <span aria-hidden="true" className="text-xl leading-none">
        +
      </span>
      <span aria-hidden="true">{label}</span>
      <label htmlFor="add-done" className="sr-only">
        {ariaLabel}
      </label>
      <select
        id="add-done"
        value=""
        onChange={(e) => {
          const [kind, id] = e.target.value.split(":");
          if (!id) return;
          onPick(kind === "s" ? { sessionId: id } : { exerciseId: id }, names.get(id) ?? "");
        }}
        className="absolute inset-0 w-full cursor-pointer opacity-0"
      >
        <option value="">Elige lo que has hecho…</option>
        {sessions.length > 0 && (
          <optgroup label="Sesiones">
            {sessions.map((s) => (
              <option key={s.id} value={`s:${s.id}`}>
                {s.name}
              </option>
            ))}
          </optgroup>
        )}
        {exercises.length > 0 && (
          <optgroup label="Ejercicios">
            {exercises.map((e) => (
              <option key={e.id} value={`e:${e.id}`}>
                {e.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
