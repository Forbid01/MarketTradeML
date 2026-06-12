// QPay v2 REST wrapper (Node/сервер тал). Supabase Edge _shared/qpay.ts-аас порт.
const BASE = process.env.QPAY_BASE_URL || "https://merchant-sandbox.qpay.mn";
const CLIENT_ID = process.env.QPAY_CLIENT_ID;
const CLIENT_SECRET = process.env.QPAY_CLIENT_SECRET;
const INVOICE_CODE = process.env.QPAY_INVOICE_CODE;

let cached = { token: null, exp: 0 };
export function clearToken() { cached = { token: null, exp: 0 }; }

export async function getToken(force = false) {
  const now = Date.now() / 1000;
  if (!force && cached.token && cached.exp - 60 > now) return cached.token;
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${BASE}/v2/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`QPay auth ${res.status}`);
  const data = await res.json();
  cached = { token: data.access_token, exp: now + (Number(data.expires_in) || 600) };
  return cached.token;
}

async function authedFetch(path, body, method = "POST") {
  const build = (token) => ({
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let res = await fetch(`${BASE}${path}`, build(await getToken()));
  if (res.status === 401) { clearToken(); res = await fetch(`${BASE}${path}`, build(await getToken(true))); }
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
  if (!res.ok) throw httpError("QPay invoice", res.status);
  return res.json();
}

// HTTP статусыг алдаан дээр хадгална — дуудагч тал "тодорхой олдсонгүй" (404)
// болон түр зуурын алдааг (5xx/сүлжээ) ялгаж шийдвэр гаргахад хэрэгтэй.
function httpError(label, status) {
  const e = new Error(`${label} ${status}`);
  e.status = status;
  return e;
}

export async function getInvoice(invoiceId) {
  const res = await authedFetch(`/v2/invoice/${invoiceId}`, undefined, "GET");
  if (!res.ok) throw httpError("QPay get-invoice", res.status);
  return res.json();
}

// Invoice цуцлах — давхар үүссэн invoice-ийг QPay талд хаахад ашиглана
// (цуцлаагүй орхивол төлөгдөх боломжтой "сохор" invoice үлдэнэ).
export async function cancelInvoice(invoiceId) {
  const res = await authedFetch(`/v2/invoice/${invoiceId}`, undefined, "DELETE");
  if (!res.ok) throw httpError("QPay cancel-invoice", res.status);
  return res.json().catch(() => ({}));
}

export async function checkPayment(invoiceId) {
  const res = await authedFetch("/v2/payment/check", {
    object_type: "INVOICE",
    object_id: invoiceId,
    offset: { page_number: 1, page_limit: 100 },
  });
  if (!res.ok) throw httpError("QPay check", res.status);
  return res.json();
}

// PAID мөрүүдийг нэгтгэх: idempotent бүртгэлд + нийт төлсөн дүн.
// payment_id-ээр dedup хийнэ — QPay хариу давхар мөр буцаавал хуурамч overpayment-аас сэргийлнэ.
export function summarizePaidRows(check) {
  const rows = check?.rows ?? [];
  const payments = [];
  const seen = new Set();
  let paidTotal = 0;
  for (const p of rows) {
    if (String(p.payment_status ?? "").toUpperCase() !== "PAID") continue;
    const id = String(p.payment_id);
    if (seen.has(id)) continue;
    seen.add(id);
    const amount = Number(p.payment_amount ?? p.amount ?? 0);
    payments.push({ payment_id: id, amount, status: "PAID" });
    paidTotal += amount;
  }
  return { payments, paidTotal };
}
