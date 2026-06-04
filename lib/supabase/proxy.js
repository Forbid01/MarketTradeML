import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "@/lib/supabase/env";

// Хүсэлт тус бүрт auth token-ийг сэргээж cookie-г шинэчилнэ (Next 16 Proxy).
export async function updateSession(request) {
  // Supabase тохируулаагүй бол алгасаж аппыг ажиллуулна (эхний хөгжүүлэлтэд).
  if (!isSupabaseConfigured) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // ВАЖНО: create болон getUser хооронд ямар ч логик бүү тавь (token refresh).
  await supabase.auth.getUser();

  return response;
}
