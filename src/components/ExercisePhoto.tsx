import { usePhotoUrl } from "@/db/repositories/photos";
import type { ExerciseType } from "@/db/types";
import { TYPE_STYLE } from "./typeStyle";

/**
 * Foto o miniatura de un ejercicio, cargada en diferido. Si no hay foto, muestra el
 * icono de su tipo sobre su color, para reconocerlo de un vistazo.
 */
export function ExercisePhoto({
  photoId,
  type,
  variant,
  alt,
  className,
}: {
  photoId: string | null;
  type: ExerciseType;
  variant: "full" | "thumb";
  alt: string;
  className: string;
}) {
  const url = usePhotoUrl(photoId, variant);
  if (!url) {
    const { Icon, tile } = TYPE_STYLE[type];
    return (
      <div className={`grid place-items-center ${tile} ${className}`} aria-hidden="true">
        <Icon className={variant === "full" ? "size-20" : "size-1/2"} />
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
