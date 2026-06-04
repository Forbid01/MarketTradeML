// И-мэйл OTP код (6 оронтой) — илгээх + баталгаажуулах. ЗӨВХӨН сервер тал.
// Resend-ээр илгээнэ; RESEND_API_KEY байхгүй бол консолд хэвлэнэ (dev).
import crypto from "node:crypto";
import { query, queryOne } from "@/lib/db";

const OTP_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export async function sendEmailOtp(email) {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) throw new Error("И-мэйл хаяг буруу байна");

  // Rate limit (email-bomb/cost-аас сэргийлнэ): 60с cooldown + 15 мин дотор ≤3 удаа.
  const rl = await queryOne(
    `select
       count(*) filter (where created_at > now() - interval '60 seconds') as recent,
       count(*) filter (where created_at > now() - interval '15 minutes') as window
     from public.email_otps where email = $1`,
    [normalized]
  );
  if (Number(rl?.recent ?? 0) > 0) throw new Error("Түр хүлээгээд дахин код хүснэ үү.");
  if (Number(rl?.window ?? 0) >= 3) throw new Error("Хэт олон удаа хүссэн байна. Дараа дахин оролдоно уу.");

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await query(
    `insert into public.email_otps (email, code_hash, expires_at)
     values ($1, $2, now() + ($3 || ' minutes')::interval)`,
    [normalized, hashCode(code), String(OTP_TTL_MIN)]
  );
  await deliver(normalized, code);
  return { ok: true };
}

async function deliver(email, code) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "MLBB Market <onboarding@resend.dev>";
  if (!key) {
    // RESEND тохируулаагүй (dev) — кодыг консолд харуулна
    console.log(`[DEV OTP] ${email} → ${code}`);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  await resend.emails.send({
    from,
    to: email,
    subject: "MLBB — нэвтрэх код",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#0f172a">
      <h2 style="font-size:18px">MLBB Marketplace — нэвтрэх код</h2>
      <p style="font-size:14px;color:#475569">Доорх кодыг апп руу оруулна уу:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;text-align:center">${code}</p>
      <p style="font-size:12px;color:#94a3b8">Код ${OTP_TTL_MIN} минутын дотор хүчинтэй.</p></div>`,
  });
}

export async function verifyEmailOtp(email, code) {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(normalized) || !/^\d{6}$/.test(String(code ?? ""))) return false;

  // Атомик: хамгийн сүүлийн хүчинтэй (attempts<MAX) кодын attempts-ийг нэг statement-д нэмж,
  // зэрэгцээ brute-force цонхыг хаана. Мөр буцаагүй = хүчингүй/оролдлого дууссан.
  const row = await queryOne(
    `update public.email_otps set attempts = attempts + 1
      where id = (
        select id from public.email_otps
         where email = $1 and consumed_at is null and expires_at > now() and attempts < $2
         order by created_at desc limit 1)
      returning id, code_hash`,
    [normalized, MAX_ATTEMPTS]
  );
  if (!row) return false;
  if (row.code_hash !== hashCode(code)) return false;

  await query(`update public.email_otps set consumed_at = now() where id = $1`, [row.id]);
  return true;
}
