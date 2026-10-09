import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo } from "react";
import type { ProcessedImage } from "@/lib/image";
import { db } from "../database";
import { createRecord, isAlive, tombstone } from "../records";
import type { Photo } from "../types";

/** Prepara la foto para guardarla. Llamar ANTES de abrir una transacción de Dexie. */
export async function newPhoto(image: ProcessedImage): Promise<Photo> {
  return createRecord<Photo>({
    full: await image.full.arrayBuffer(),
    thumb: await image.thumb.arrayBuffer(),
    mime: image.mime,
    width: image.width,
    height: image.height,
  });
}

export async function removePhoto(id: string): Promise<void> {
  await db.photos.update(id, tombstone<Photo>());
}

/**
 * URL temporal (blob:) para mostrar una foto guardada en IndexedDB. Se libera al
 * desmontar el componente para no acumular memoria.
 */
export function usePhotoUrl(photoId: string | null, variant: "full" | "thumb"): string | null {
  const photo = useLiveQuery(async () => {
    if (!photoId) return null;
    const stored = await db.photos.get(photoId);
    return isAlive(stored) && stored[variant].byteLength > 0 ? stored : null;
  }, [photoId]);
  const url = useMemo(
    () => (photo ? URL.createObjectURL(new Blob([photo[variant]], { type: photo.mime })) : null),
    [photo, variant],
  );
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}
