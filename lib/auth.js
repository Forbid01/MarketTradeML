import { cache } from "react";
import { auth } from "@/auth";
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

export async function isAdmin() {
  const { profile } = await getCurrentUser();
  return profile?.role === "admin";
}
