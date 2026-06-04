// Client-side зураг шахалт (Build Plan 1.7: WebP-д шахаж Storage хэмнэнэ).
// Зөвхөн браузерт ажиллана (canvas).
export async function compressImage(file, { maxDim = 1280, quality = 0.8 } = {}) {
  if (!file?.type?.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", quality));
    return blob ?? file;
  } catch {
    return file; // шахаж чадахгүй бол эх файлыг буцаана
  }
}
