import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Зөвхөн ДОТООД зам руу redirect (open-redirect-аас сэргийлнэ): "/path" хэлбэртэй,
// "//host" буюу "/\\" хэлбэрийн protocol-relative/host-injection-ийг таслана.
function safeNext(next) {
  if (typeof next !== "string" || !next.startsWith("/")) return "/";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

// Google OAuth (PKCE) буцах цэг — code-г session болгож солино.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next") ?? "/");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
