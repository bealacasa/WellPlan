export const FULL_MAX_SIDE = 1200;
export const THUMB_MAX_SIDE = 240;
/** Límite del archivo original (antes de comprimir): fotos de iPhone de hasta ~20 MB. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

export type ProcessedImage = {
  full: Blob;
  thumb: Blob;
  mime: string;
  width: number;
  height: number;
};

/** Dimensiones escaladas para que el lado mayor no supere `maxSide` (nunca amplía). */
export function fitWithin(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export class ImageError extends Error {}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function render(bitmap: ImageBitmap, maxSide: number, quality: number) {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  // WebP si el navegador sabe codificarlo; si no (Safari antiguo devuelve PNG), JPEG.
  let blob = await encode(canvas, "image/webp", quality);
  if (!blob || blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg", quality);
  if (!blob) throw new ImageError("No se pudo comprimir la imagen.");
  return { blob, width, height };
}

/**
 * Redimensiona y comprime una foto en el propio iPhone antes de guardarla: versión de
 * ~1200 px para la ficha y miniatura de ~240 px para los listados. Respeta la orientación EXIF.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith("image/")) throw new ImageError("El archivo no es una imagen.");
  if (file.size > MAX_SOURCE_BYTES) throw new ImageError("La imagen es demasiado grande.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError("No se pudo leer la imagen. Prueba con otra foto.");
  }
  try {
    const full = await render(bitmap, FULL_MAX_SIDE, 0.8);
    const thumb = await render(bitmap, THUMB_MAX_SIDE, 0.7);
    return {
      full: full.blob,
      thumb: thumb.blob,
      mime: full.blob.type,
      width: full.width,
      height: full.height,
    };
  } finally {
    bitmap.close();
  }
}
