import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useConfirm } from "@/components/ConfirmDialog";
import { NumberStepper } from "@/components/NumberStepper";
import { PageHeader, buttonPrimary, inputClass } from "@/components/ui";
import {
  createGymClasses,
  deleteGymClass,
  updateGymClass,
  useGymClass,
} from "@/db/repositories/gymClasses";
import { WEEKDAYS } from "@/db/repositories/plan";
import type { GymClass } from "@/db/types";
import { isoWeekday, weekdayName, weekdayShort } from "@/lib/dates";
import { gymClassInputSchema } from "@/lib/validation";

const DURATION_PRESETS = [30, 45, 50, 60, 90] as const;

/** Alta (/horario/nueva?dia=N) y edición (/horario/:id) de una clase del horario. */
export function GymClassFormPage() {
  const { id } = useParams();
  const gymClass = useGymClass(id);
  const [params] = useSearchParams();
  if (id && gymClass === undefined) return null;
  if (id && gymClass === null) {
    return (
      <>
        <PageHeader title="Clase no encontrada" />
        <Link to="/horario" className="underline">
          Volver al horario
        </Link>
      </>
    );
  }
  const fromUrl = Number(params.get("dia"));
  const initialDay = WEEKDAYS.includes(fromUrl as (typeof WEEKDAYS)[number])
    ? fromUrl
    : isoWeekday(new Date());
  return <GymClassForm key={id ?? "nueva"} gymClass={gymClass ?? null} initialDay={initialDay} />;
}

function GymClassForm({ gymClass, initialDay }: { gymClass: GymClass | null; initialDay: number }) {
  const navigate = useNavigate();
  const [dialog, confirm] = useConfirm();
  const [name, setName] = useState(gymClass?.name ?? "");
  // Al crear se pueden elegir varios días (una fila por día); al editar, uno.
  const [days, setDays] = useState<number[]>(gymClass ? [gymClass.weekday] : [initialDay]);
  const [startTime, setStartTime] = useState(gymClass?.startTime ?? "");
  const [durationMin, setDurationMin] = useState(gymClass?.durationMin ?? 60);
  const [room, setRoom] = useState(gymClass?.room ?? "");
  const [instructor, setInstructor] = useState(gymClass?.instructor ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: number) =>
    setDays((current) =>
      gymClass
        ? [day]
        : current.includes(day)
          ? current.filter((d) => d !== day)
          : [...current, day].sort((a, b) => a - b),
    );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (days.length === 0) {
      setError("Elige al menos un día.");
      return;
    }
    const parsed = gymClassInputSchema.safeParse({
      name,
      weekday: days[0],
      startTime,
      durationMin,
      room,
      instructor,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }
    setSaving(true);
    try {
      if (gymClass) await updateGymClass(gymClass.id, parsed.data);
      else await createGymClasses(parsed.data, days);
      navigate(`/horario?dia=${days[0]}`, { replace: true });
    } catch {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }

  async function remove() {
    if (!gymClass) return;
    const ok = await confirm({
      title: `¿Borrar «${gymClass.name}» del ${weekdayName(gymClass.weekday)}?`,
      message: "Se quita del horario. Tu historial de clases hechas no se borra.",
      confirmLabel: "Borrar clase",
    });
    if (!ok) return;
    await deleteGymClass(gymClass.id);
    navigate(`/horario?dia=${gymClass.weekday}`, { replace: true });
  }

  const back = `/horario?dia=${gymClass?.weekday ?? initialDay}`;

  return (
    <>
      <Link to={back} className="mb-2 inline-flex min-h-11 items-center font-medium text-muted">
        ← Horario
      </Link>
      <PageHeader title={gymClass ? "Editar clase" : "Nueva clase"} />
      <form onSubmit={save} className="space-y-6" noValidate>
        <div>
          <label htmlFor="class-name" className="text-sm font-medium">
            Nombre
          </label>
          <input
            id="class-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoCapitalize="sentences"
            placeholder="Ej.: Pilates"
            className={`${inputClass} mt-1`}
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium">{gymClass ? "Día" : "Días"}</legend>
          {!gymClass && (
            <p className="text-sm text-muted">Si se repite en varios días, márcalos todos.</p>
          )}
          <div className="mt-2 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => {
              const checked = days.includes(d);
              return (
                <label
                  key={d}
                  className={`grid min-h-12 cursor-pointer place-items-center rounded-xl text-sm font-bold has-focus-visible:ring-2 has-focus-visible:ring-accent ${
                    checked
                      ? "bg-linear-to-br from-accent to-accent-2 text-accent-contrast"
                      : "border border-border bg-surface"
                  }`}
                >
                  <input
                    type={gymClass ? "radio" : "checkbox"}
                    name="days"
                    checked={checked}
                    onChange={() => toggleDay(d)}
                    aria-label={weekdayName(d)}
                    className="sr-only"
                  />
                  <span aria-hidden="true">{weekdayShort(d)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="class-time" className="text-sm font-medium">
            Hora de inicio
          </label>
          <input
            id="class-time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={`${inputClass} mt-1 text-lg font-semibold`}
          />
        </div>

        <div>
          <NumberStepper
            id="class-duration"
            label="Duración (minutos)"
            value={durationMin}
            onChange={setDurationMin}
            min={5}
            max={300}
          />
          <div
            className="mt-2 flex flex-wrap gap-2"
            role="group"
            aria-label="Duraciones habituales"
          >
            {DURATION_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDurationMin(m)}
                aria-pressed={durationMin === m}
                className={`min-h-11 rounded-full px-4 font-semibold ${
                  durationMin === m ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="class-room" className="text-sm font-medium">
              Sala (opcional)
            </label>
            <input
              id="class-room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              maxLength={60}
              placeholder="Ej.: Sala 2"
              className={`${inputClass} mt-1`}
            />
          </div>
          <div>
            <label htmlFor="class-instructor" className="text-sm font-medium">
              Monitor/a (opcional)
            </label>
            <input
              id="class-instructor"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              maxLength={60}
              autoCapitalize="words"
              className={`${inputClass} mt-1`}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="font-semibold text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={saving} className={buttonPrimary}>
          {saving ? "Guardando…" : gymClass ? "Guardar clase" : "Añadir al horario"}
        </button>
        {gymClass && (
          <button
            type="button"
            onClick={() => void remove()}
            className="min-h-12 w-full font-semibold text-danger"
          >
            Borrar clase
          </button>
        )}
      </form>
      {dialog}
    </>
  );
}
