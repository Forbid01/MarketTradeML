import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// Нэвтэрсэн хэрэглэгч + public.users профайлыг буцаана (Server Component/Action-уудад).
export async function getCurrentUser() {
  if (!isSupabaseConfigured) return { user: null, profile: null, supabase: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null, supabase };

  const { data: profile } = await supabase
    .from("users")
    .select("id, display_name, phone, avatar_url, role, is_verified, rating_avg, trades_count")
    .eq("auth_id", user.id)
    .maybeSingle();

  return { user, profile, supabase };
}
