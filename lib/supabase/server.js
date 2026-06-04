import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";

// Сервер талын Supabase client (Server Component, Server Action, Route Handler-уудад).
// Next 16: cookies() нь async.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component-оос дуудсан үед cookie set боломжгүй —
          // proxy.js (session refresh) үүнийг хариуцна.
        }
      },
    },
  });
}
