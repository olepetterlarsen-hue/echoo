"use client";

/**
 * Klientside-komprimering før opplasting (B4/F-15): ned til maks 1600 px på
 * lengste side og iterativt redusert JPEG-kvalitet mot en byte-grense —
 * uten dette ville en 12MP telefonbildefil lastes opp rått.
 * Faller tilbake til originalfilen hvis nettleseren ikke kan dekode den
 * (f.eks. HEIC uten dekoderstøtte) eller Canvas ikke er tilgjengelig.
 */
export async function compressImage(
  file: File,
  opts: { maxDim?: number; targetBytes?: number } = {},
): Promise<File> {
  const { maxDim = 1600, targetBytes = 300 * 1024 } = opts;
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let blob: Blob | null = null;
  let quality = 0.85;
  for (let i = 0; i < 5; i++) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob || blob.size <= targetBytes || quality <= 0.4) break;
    quality -= 0.15;
  }
  if (!blob) return file;

  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], newName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
