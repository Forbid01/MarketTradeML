// Транзакцийн и-мэйл (Resend). RESEND_API_KEY байхгүй бол консолд лог (dev). Зөвхөн сервер тал.
export async function sendEmail({ to, subject, html }) {
  if (!to) return;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "MLBB Market <onboarding@resend.dev>";
  if (!key) {
    console.log(`[DEV EMAIL] → ${to}: ${subject}`);
    return;
  }
  try {
    const { Resend } = await import("resend");
    // Resend SDK алдааг throw хийхгүй { error } болгож БУЦААДАГ — шалгахгүй бол
    // илгээгдээгүй и-мэйл "амжилттай" мэт чимээгүй алга болно.
    const { error } = await new Resend(key).emails.send({ from, to, subject, html });
    if (error) console.error("email send failed:", to, subject, error?.message ?? error);
  } catch (e) {
    console.error("email send failed:", to, subject, e?.message ?? e);
  }
}

export function emailShell(title, body) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
    <h2 style="font-size:18px;margin:0 0 8px">${title}</h2>
    <div style="font-size:14px;color:#475569;line-height:1.6">${body}</div>
    <p style="margin-top:20px;font-size:12px;color:#94a3b8">MLBB Marketplace</p>
  </div>`;
}

// HTML-escape — хэрэглэгчийн оруулсан текстийг (зарын гарчиг гэх мэт) и-мэйлийн HTML-д
// шууд тавихаас сэргийлнэ (injection/phishing). emailShell-ийн body доторх ${...}-д ашиглана.
const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
