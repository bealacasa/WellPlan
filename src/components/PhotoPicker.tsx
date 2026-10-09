import { useEffect, useId, useState } from "react";
import { ImageError, processImage, type ProcessedImage } from "@/lib/image";
import { buttonSecondary } from "./ui";

/**
 * Foto del ejercicio: "Hacer foto" abre directamente la cámara trasera y "Elegir de la
 * galería" abre las fotos. Se redimensiona y comprime en el iPhone antes de guardarla.
 */
export function PhotoPicker({
  currentUrl,
  onChange,
  label = "Foto de la máquina (opcional)",
}: {
  /** Foto ya guardada (al editar). */
  currentUrl: string | null;
  /** ProcessedImage = nueva, "remove" = quitarla, undefined = sin cambios. */
  onChange: (value: ProcessedImage | "remove" | undefined) => void;
  label?: string;
}) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function handle(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const image = await processImage(file);
      setPreview(URL.createObjectURL(image.thumb));
      setRemoved(false);
      onChange(image);
    } catch (e) {
      setError(e instanceof ImageError ? e.message : "No se pudo usar esa foto.");
    } finally {
      setBusy(false);
    }
  }

  const shown = preview ?? (removed ? null : currentUrl);
  const input = (suffix: string, capture: boolean) => (
    <input
      id={`${id}-${suffix}`}
      type="file"
      accept="image/*"
      {...(capture ? { capture: "environment" as const } : {})}
      className="sr-only"
      onChange={(e) => {
        void handle(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      {shown && (
        <img
          src={shown}
          alt="Foto del ejercicio"
          className="mt-2 aspect-[4/3] w-full rounded-2xl object-cover"
        />
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label htmlFor={`${id}-camera`} className={`${buttonSecondary} cursor-pointer`}>
          {busy ? "Procesando…" : "Hacer foto"}
        </label>
        {input("camera", true)}
        <label htmlFor={`${id}-gallery`} className={`${buttonSecondary} cursor-pointer`}>
          Elegir de la galería
        </label>
        {input("gallery", false)}
      </div>
      {shown && (
        <button
          type="button"
          onClick={() => {
            setPreview(null);
            setRemoved(true);
            onChange(currentUrl ? "remove" : undefined);
          }}
          className="mt-2 min-h-11 text-sm font-medium text-danger underline"
        >
          Quitar la foto
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
