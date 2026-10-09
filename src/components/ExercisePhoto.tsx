import { usePhotoUrl } from "@/db/repositories/photos";
import type { ExerciseType } from "@/db/types";
import { ExerciseIllustration, illustrationFor } from "./illustrations";
import { TYPE_STYLE } from "./typeStyle";

/**
 * Foto o miniatura de un ejercicio, cargada en diferido. Si no hay foto, muestra una
 * ilustración del ejercicio (si su nombre es conocido) o el icono de su tipo, sobre el
 * color del tipo, para reconocerlo de un vistazo.
 */
export function ExercisePhoto({
  photoId,
  type,
  name,
  variant,
  alt,
  className,
}: {
  photoId: string | null;
  type: ExerciseType;
  name: string;
  variant: "full" | "thumb";
  alt: string;
  className: string;
}) {
  const url = usePhotoUrl(photoId, variant);
  if (!url) {
    const { Icon, tile } = TYPE_STYLE[type];
    const illustration = illustrationFor(name);
    const size = variant === "full" ? "size-1/2" : illustration ? "size-4/5" : "size-1/2";
    return (
      <div className={`grid place-items-center ${tile} ${className}`} aria-hidden="true">
        {illustration ? (
          <ExerciseIllustration kind={illustration} className={size} />
        ) : (
          <Icon className={size} />
        )}
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
