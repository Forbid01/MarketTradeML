// QPay v2 REST wrapper (plain JS / Deno). Build Plan 3.3.
// @mnpay/qpay багц БИШ — REST API руу шууд (найдвартай). Endpoint-ууд шинжилгээгээр баталгаажсан.
const BASE = Deno.env.get("QPAY_BASE_URL") || "https://merchant-sandbox.qpay.mn";
const CLIENT_ID = Deno.env.get("QPAY_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("QPAY_CLIENT_SECRET");
export const INVOICE_CODE = Deno.env.get("QPAY_INVOICE_CODE");

// Token кэш (isolate тус бүрт). Хугацаа дуусахад дахин авна.
let cached = { token: null, exp: 0 };

export function clearToken() {
  cached = { token: null, exp: 0 };
}

export async function getToken(force = false) {
  const now = Date.now() / 1000;
  if (!force && cached.token && cached.exp - 60 > now) return cached.token;

  const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const res = await fetch(`${BASE}/v2/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`QPay auth ${res.status}: ${await res.text()}`);
  const data = await res.json();
  // expires_in алга бол консерватив 600s (өмнөх 3000s fallback токен дуусахаас өмнө байж болзошгүй).
  cached = {
    token: data.access_token,
    exp: now + (Number(data.expires_in) || 600),
  };
  return cached.token;
}

// Bearer-той дуудлага — 401 ирвэл токенийг хүчээр шинэчилж нэг удаа дахин оролдоно.
async function authedFetch(path, body, method = "POST") {
  const build = (token) => ({
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let res = await fetch(`${BASE}${path}`, build(await getToken()));
  if (res.status === 401) {
    clearToken();
    res = await fetch(`${BASE}${path}`, build(await getToken(true)));
  }
  return res;
}

export async function createInvoice({ senderInvoiceNo, amount, receiverCode = "terminal", description, callbackUrl }) {
  const res = await authedFetch("/v2/invoice", {
    invoice_code: INVOICE_CODE,
    sender_invoice_no: String(senderInvoiceNo),
    invoice_receiver_code: receiverCode,
    invoice_description: description,
    amount,
    callback_url: callbackUrl,
  });
  if (!res.ok) throw new Error(`QPay invoice ${res.status}: ${await res.text()}`);
  return await res.json(); // { invoice_id, qr_text, qr_image, qPay_shortUrl, urls:[{name,link}] }
}

export async function checkPayment(invoiceId) {
  const res = await authedFetch("/v2/payment/check", {
    object_type: "INVOICE",
    object_id: invoiceId,
    offset: { page_number: 1, page_limit: 100 },
  });
  if (!res.ok) throw new Error(`QPay check ${res.status}: ${await res.text()}`);
  return await res.json(); // { count, paid_amount, rows:[{ payment_id, payment_status, payment_amount }] }
}

// Байгаа invoice-ийн дэлгэрэнгүй (QR-ийг дахин харуулахад) — GET /v2/invoice/{id}.
export async function getInvoice(invoiceId) {
  const res = await authedFetch(`/v2/invoice/${invoiceId}`, undefined, "GET");
  if (!res.ok) throw new Error(`QPay get-invoice ${res.status}: ${await res.text()}`);
  return await res.json(); // { invoice_id, qr_text, qr_image, qPay_shortUrl, urls } (ойролцоо)
}

// PAID payment мөрүүдийг нэгтгэх: idempotent бүртгэлд зориулсан жагсаалт + НИЙТ төлсөн дүн.
// Escrow-д ганц мөр биш НИЙЛБЭР дүн чухал (хэсэгчилсэн/илүү төлбөрийг зөв илрүүлэхийн тулд).
export function summarizePaidRows(check) {
  const rows = check?.rows ?? [];
  const payments = [];
  let paidTotal = 0;
  for (const p of rows) {
    if (String(p.payment_status ?? "").toUpperCase() !== "PAID") continue;
    const amount = Number(p.payment_amount ?? p.amount ?? 0);
    payments.push({ payment_id: String(p.payment_id), amount, status: "PAID" });
    paidTotal += amount;
  }
  return { payments, paidTotal };
}
