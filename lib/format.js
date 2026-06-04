// ₮ + огноо форматлах туслахууд. Хэл-мэдрэмжтэй (locale: "mn" | "en").
const INTL_LOCALE = { mn: "mn-MN", en: "en-US" };
function intl(locale) {
  return INTL_LOCALE[locale] ?? "mn-MN";
}

export function formatMNT(amount, locale = "mn") {
  if (amount == null) return "—";
  const nf = new Intl.NumberFormat(intl(locale), { maximumFractionDigits: 0 });
  return `${nf.format(amount)}₮`;
}

export function formatDateTime(value, locale = "mn") {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(intl(locale), {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

// Үлдсэн хугацаа (inspection_ends хүртэл) — цаг:минут, хэлээр.
export function timeLeft(endsAt, locale = "mn") {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return locale === "en" ? "Expired" : "Хугацаа дууссан";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return locale === "en" ? `${h}h ${m}m left` : `${h}ц ${m}м үлдсэн`;
}
