import { usePhotoUrl } from "@/db/repositories/photos";
import { ListIcon } from "./icons";

/** Foto o miniatura de un ejercicio, cargada en diferido; si no hay foto, un icono. */
export function ExercisePhoto({
  photoId,
  variant,
  alt,
  className,
}: {
  photoId: string | null;
  variant: "full" | "thumb";
  alt: string;
  className: string;
}) {
  const url = usePhotoUrl(photoId, variant);
  if (!url) {
    return (
      <div
        className={`grid place-items-center bg-surface-2 text-muted ${className}`}
        aria-hidden="true"
      >
        <ListIcon className="size-1/3" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`object-cover ${className}`}
    />
  );
}
