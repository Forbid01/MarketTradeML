import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY нь Edge Runtime-д автоматаар бий.

// Service-role client — RLS-ийг тойрно (зөвхөн серверийн логикт).
export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// Дуудагч хэрэглэгчийн JWT-ээр client — RLS хэрэгжинэ (эрх шалгахад).
export function userClient(req) {
  return createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_ANON_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    }
  );
}

// CORS — нийтийн "*" биш, APP_ORIGIN env-ээр хязгаарлана (тохируулаагүй бол хөгжүүлэлтийн
// үед л "*"). create-invoice нь зөвхөн зөв JWT-тэй ажилладаг тул origin-ийг бэхлэх нь
// нэмэлт давхар хамгаалалт.
const ALLOW_ORIGIN = Deno.env.get("APP_ORIGIN") ?? "*";

export const cors = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", ...extraHeaders },
  });
}

// Тогтмол-хугацааны (timing-safe) string харьцуулалт — нууц токен шалгахад.
export function timingSafeEqual(a, b) {
  const sa = String(a ?? "");
  const sb = String(b ?? "");
  if (sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i++) diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  return diff === 0;
}
