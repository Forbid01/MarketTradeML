// Vercel Blob — зарын зураг хадгалах (Supabase Storage-ийг орлоно). Зөвхөн сервер тал.
// BLOB_READ_WRITE_TOKEN env шаардана (Vercel дээр автоматаар бий).
import { put, del } from "@vercel/blob";

export async function uploadListingImage(listingId, file) {
  const type = file.type || "image/webp";
  const ext = (type.split("/")[1] || "webp").replace("jpeg", "jpg");
  const pathname = `listings/${listingId}/${globalThis.crypto.randomUUID()}.${ext}`;
  const { url } = await put(pathname, file, { access: "public", contentType: type });
  return { url, pathname };
}

export async function deleteBlob(pathname) {
  if (!pathname) return;
  try { await del(pathname); } catch {}
}
