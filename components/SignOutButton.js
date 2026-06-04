"use client";

import { signOut } from "next-auth/react";
import { useT } from "@/lib/i18n/client";

export default function SignOutButton() {
  const t = useT();
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="w-full rounded-lg border border-red-500/30 bg-red-500/15 px-4 py-2 text-sm text-red-300 hover:bg-red-500/25"
    >
      {t("account.signout")}
    </button>
  );
}
