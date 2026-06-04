import { updateSession } from "@/lib/supabase/proxy";

// Next 16: Middleware → Proxy. Supabase session-г хүсэлт тус бүрт сэргээнэ.
export async function proxy(request) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Дотоод статик файл, зураг, PWA файлуудаас бусад бүх замд ажиллана.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)",
  ],
};
