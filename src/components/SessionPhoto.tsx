import { ListIcon } from "@/components/icons";
import { usePhotoUrl } from "@/db/repositories/photos";

/** Foto de una sesión (miniatura) o, si no tiene, un icono sobre el color de la app. */
export function SessionPhoto({
  photoId,
  className,
}: {
  photoId: string | null;
  className: string;
}) {
  const url = usePhotoUrl(photoId, "thumb");
  if (!url) {
    return (
      <div
        className={`grid place-items-center bg-accent-soft text-accent ${className}`}
        aria-hidden="true"
      >
        <ListIcon className="size-1/2" />
      </div>
    );
  }
  return (
    <img src={url} alt="" loading="lazy" decoding="async" className={`object-cover ${className}`} />
  );
}
