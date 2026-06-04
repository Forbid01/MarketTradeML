"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";

// Браузер талын Supabase client (Client Component-уудад).
// NEXT_PUBLIC_* нь build үед inline хийгддэг тул, тохируулаагүй build/prerender унахаас
// сэргийлж placeholder өгнө (бодит дуудлага хийгдэхгүй, зөвхөн render үед throw болохгүй).
export function createClient() {
  return createBrowserClient(
    SUPABASE_URL || "https://placeholder.supabase.co",
    SUPABASE_ANON_KEY || "placeholder-anon-key"
  );
}
