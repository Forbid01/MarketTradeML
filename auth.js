// Auth.js (NextAuth v5) тохиргоо — Supabase Auth-ийг орлоно.
// Нэвтрэх: Google (OAuth) + и-мэйл 6 оронтой код (Credentials + өөрийн OTP).
// JWT session (DB adapter шаардахгүй); нэвтрэх бүрт users мөр upsert.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { verifyEmailOtp } from "@/lib/auth/otp";
import { upsertUserByEmail } from "@/lib/auth/users";

// Referral attribution: нэвтрэх үед "ref" cookie-г уншина (RefCapture-аас тавигдсан).
// Auth.js callback хүсэлтийн контекстэд ажилладаг тул next/headers боломжтой; алдвал алгасна.
async function readRefCookie() {
  try {
    const { cookies } = await import("next/headers");
    const c = await cookies();
    return c.get("ref")?.value ?? null;
  } catch {
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Google, // AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET

    Credentials({
      id: "otp",
      name: "Email code",
      credentials: { email: {}, code: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const code = String(creds?.code ?? "").trim();
        if (!email || !code) return null;
        const ok = await verifyEmailOtp(email, code);
        if (!ok) return null;
        const u = await upsertUserByEmail(email, { referredByCode: await readRefCookie() });
        if (!u) return null;
        return { id: u.id, email: u.email, name: u.display_name, role: u.role };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Google нэвтрэлтэд users мөр upsert хийж id/role-ийг user-д залгана
      if (account?.provider === "google") {
        // Google зөвхөн баталгаажсан и-мэйлд токен олгодог. email_verified нь boolean true,
        // string "true", эсвэл заримдаа байхгүй ирдэг тул ЗӨВХӨН тодорхой false үед татгалзана
        // (хэт хатуу шалгалт жинхэнэ хэрэглэгчийг "Access Denied" болгохоос сэргийлнэ).
        const ev = profile?.email_verified;
        if (ev === false || ev === "false") return false;
        const email = (user?.email ?? profile?.email ?? "").toLowerCase();
        if (!email) return false;
        try {
          const u = await upsertUserByEmail(email, {
            name: user?.name ?? profile?.name,
            image: user?.image ?? profile?.picture,
            referredByCode: await readRefCookie(),
          });
          if (!u) return false;
          user.id = u.id;
          user.role = u.role;
        } catch (e) {
          // Ихэвчлэн DATABASE_URL тавиагүй / schema ачаалаагүй (users хүснэгт алга).
          // Vercel → Logs дээр энэ мессеж харагдана.
          console.error("Google signIn DB upsert FAILED — DATABASE_URL/schema шалгана уу:", e?.message ?? e);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.role = token.role ?? "user";
      }
      return session;
    },
  },
});
