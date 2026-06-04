import { SUPABASE_URL } from "@/lib/supabase/env";

// Public bucket доторх зарын зургийн URL.
export function listingImageUrl(path) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;
}
