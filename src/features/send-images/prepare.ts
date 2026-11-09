/**
 * Photos carry hidden details (GPS location, camera, time). Redrawing the image
 * drops all of it, and big photos are scaled down so they upload quickly. GIFs go
 * as they are, since redrawing would stop their animation.
 */
const MAX_SIDE = 2048;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function prepareImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // PNGs may be transparent; everything else becomes a JPEG.
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
  if (!blob) throw new Error("Couldn't read this image.");
  const name = file.name.replace(/\.\w+$/, "") || "image";
  return new File([blob], `${name}.${type === "image/png" ? "png" : "jpg"}`, { type });
}
