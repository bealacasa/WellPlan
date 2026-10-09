import { ListIcon } from "@/components/icons";
import { ExerciseIllustration, sessionIllustrationFor } from "@/components/illustrations";
import { usePhotoUrl } from "@/db/repositories/photos";

/**
 * Foto de una sesión (miniatura). Si no tiene, un dibujo según su nombre o sus ejercicios
 * y, si tampoco, un icono; siempre sobre el color de la app.
 */
export function SessionPhoto({
  photoId,
  name,
  exerciseNames,
  className,
}: {
  photoId: string | null;
  name: string;
  exerciseNames: readonly string[];
  className: string;
}) {
  const url = usePhotoUrl(photoId, "thumb");
  if (!url) {
    const illustration = sessionIllustrationFor(name, exerciseNames);
    return (
      <div
        className={`grid place-items-center bg-accent-soft text-accent ${className}`}
        aria-hidden="true"
      >
        {illustration ? (
          <ExerciseIllustration kind={illustration} className="size-4/5" />
        ) : (
          <ListIcon className="size-1/2" />
        )}
      </div>
    );
  }
  return (
    <img src={url} alt="" loading="lazy" decoding="async" className={`object-cover ${className}`} />
  );
}
