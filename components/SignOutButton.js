"use client";

import { signOut } from "next-auth/react";
import { useT } from "@/lib/i18n/client";

export default function SignOutButton() {
  const t = useT();
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
    >
      {t("account.signout")}
    </button>
  );
}
