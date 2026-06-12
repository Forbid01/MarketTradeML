import { cache } from "react";
import { auth } from "@/auth";
import { queryOne } from "@/lib/db";
import { getUserById } from "@/lib/auth/users";

// Нэвтэрсэн хэрэглэгч (session) + public.users профайл. Server Component/Action-уудад.
// React cache(): нэг хүсэлтийн дотор Header + page давхар дуудсан ч ганц л DB round-trip (F3).
export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return { user: null, profile: null };
  const profile = await getUserById(id);
  return { user: session.user, profile };
});

export async function getUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

// Session-ий хэрэглэгч DB-д ИДЭВХТЭЙ (deleted_at is null) хэвээр байгааг шалгасан id.
// JWT 30 хоног амьдардаг тул устгагдсан/бан болсон хэрэглэгчийн хуучин session-ийг
// блоклоно. Server action (lib/actions.js uid) болон route handler (api/messages,
// api/payments) хоёул ЭНДЭЭС дуудна — auth() vs uid() эрхийн parity нэг эх сурвалжаас.
// cache(): нэг хүсэлтэд олон дуудлага байсан ч ганц DB roundtrip.
export const getActiveUserId = cache(async function getActiveUserId() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  try {
    const u = await queryOne(`select id from public.users where id = $1 and deleted_at is null`, [id]);
    return u?.id ?? null;
  } catch {
    return null; // DB унасан үед эрх олгохгүй
  }
});

export async function isAdmin() {
  const { profile } = await getCurrentUser();
  return profile?.role === "admin";
}
