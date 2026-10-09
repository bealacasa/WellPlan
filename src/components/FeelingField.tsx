/** Zonas habituales de molestias (se guardan como texto). */
export const PAIN_AREAS = [
  "Rodilla",
  "Lumbar",
  "Cadera",
  "Hombro",
  "Cuello",
  "Tobillo",
  "Muñeca",
  "Otra",
] as const;

/**
 * "¿Cómo te has encontrado?" de 0 a 10 (opcional) y, si algo ha molestado, la zona.
 * Con la sensación menor de 6 o una zona marcada, Hoy no deja repetir el registro de un
 * toque la próxima vez: hay que pasar por la ficha.
 */
export function FeelingField({
  feeling,
  onFeeling,
  painArea,
  onPainArea,
}: {
  feeling: number | null;
  onFeeling: (value: number | null) => void;
  painArea: string | null;
  onPainArea: (value: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium">
          ¿Cómo te has encontrado? (0 = fatal, 10 = perfecto)
        </legend>
        <div className="mt-1 grid grid-cols-6 gap-2">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              onClick={() => onFeeling(feeling === n ? null : n)}
              aria-pressed={feeling === n}
              aria-label={`Sensación ${n} de 10`}
              className={`grid min-h-12 place-items-center rounded-xl border-2 text-lg font-bold tabular-nums ${
                feeling === n
                  ? n < 6
                    ? "border-danger bg-danger/15 text-danger"
                    : "border-accent bg-accent-soft"
                  : "border-border bg-surface"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">¿Te ha molestado algo? (opcional)</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {PAIN_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => onPainArea(painArea === area ? null : area)}
              aria-pressed={painArea === area}
              className={`min-h-11 rounded-full border-2 px-4 font-semibold ${
                painArea === area
                  ? "border-danger bg-danger/15 text-danger"
                  : "border-border bg-surface text-muted"
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
