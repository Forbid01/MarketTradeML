// Supabase орчны хувьсагч — нэг дороос. Тохируулаагүй үед апп ажиллаж, тохиргооны
// сануулга харуулна (Build Plan 1.7: эхэндээ free tier, дараа Pro).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
