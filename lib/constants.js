// MLBB домэйн тогтмолууд + төлөвийн монгол шошго.

// MLBB рэнк (доороос дээш)
export const RANKS = [
  "Warrior",
  "Elite",
  "Master",
  "Grandmaster",
  "Epic",
  "Legend",
  "Mythic",
  "Mythical Honor",
  "Mythical Glory",
  "Mythical Immortal",
];

// MLBB сервер/бүс (нийтлэг)
export const SERVERS = [
  "Asia",
  "Europe",
  "America",
  "Middle East",
  "Other",
];

// orders.status → монгол шошго + өнгө
export const ORDER_STATUS = {
  created:      { label: "Үүссэн",            tone: "zinc" },
  paid:         { label: "Төлсөн (escrow)",   tone: "blue" },
  transferring: { label: "Шилжүүлж байна",     tone: "amber" },
  inspecting:   { label: "Шалгаж байна",       tone: "amber" },
  completed:    { label: "Дууссан",            tone: "green" },
  disputed:     { label: "Маргаантай",         tone: "red" },
  cancelled:    { label: "Цуцалсан",           tone: "zinc" },
  expired:      { label: "Хугацаа дууссан",    tone: "zinc" },
  refunded:     { label: "Буцаагдсан",         tone: "violet" },
};

export const LISTING_STATUS = {
  draft:    "Ноорог",
  active:   "Идэвхтэй",
  reserved: "Захиалагдсан",
  sold:     "Зарагдсан",
  hidden:   "Нуусан",
  banned:   "Хориглосон",
};

export const PAYOUT_STATUS = {
  pending:  "Хүлээгдэж буй",
  paid_out: "Олгосон",
  refunded: "Буцаасан",
  failed:   "Амжилтгүй",
};

// transfer_checklist талбарууд (UI-д дарааллаар) — Build Plan 1.11 (ШИНЭЧИЛСЭН)
export const CHECKLIST_FIELDS = [
  { key: "primary_email_ownership_transferred",      label: "Анхдагч и-мэйлийн БҮРЭН эзэмшил шилжсэн", side: "buyer" },
  { key: "email_password_changed_by_buyer",          label: "И-мэйлийн нууц үгийг худалдан авагч сольсон", side: "buyer" },
  { key: "recovery_phone_changed_by_buyer",          label: "Recovery утсыг худалдан авагч сольсон", side: "buyer" },
  { key: "secondary_verification_email_transferred", label: "Secondary verification и-мэйл шилжсэн", side: "buyer" },
  { key: "two_fa_reset_done",                        label: "2FA reset хийгдсэн", side: "buyer" },
  { key: "facebook_unbound",                         label: "Facebook binding тасарсан", side: "seller" },
  { key: "google_unbound",                           label: "Google binding тасарсан", side: "seller" },
  { key: "tiktok_unbound",                           label: "TikTok binding тасарсан", side: "seller" },
  { key: "original_topup_receipts_handed_over",      label: "Топ-ап Order ID/баримт дамжуулсан", side: "seller" },
  { key: "seller_signed_release",                    label: "Зарагч 'эргүүлэн нэхэхгүй' зөвшөөрсөн", side: "seller" },
  { key: "seller_link_cut",                          label: "Зарагчийн бүх холбоос тасарсан", side: "seller" },
  { key: "verified_by_buyer",                        label: "Худалдан авагч эцэслэн баталгаажуулсан", side: "buyer" },
];

// Moonton-ийн эрсдэлийн анхааруулга (UI-д ил харуулна)
export const MOONTON_WARNING =
  "Анхаар: Moonton-ийн анхдагч (master) и-мэйл binding ХЭЗЭЭ Ч бүрэн салгагдахгүй. " +
  "Зарагч топ-ап Order ID-аар Moonton support-д хандаж аккаунтаа эргүүлэн авах эрсдэл үлддэг. " +
  "Тиймээс и-мэйлийн БҮРЭН эзэмшил (нууц үг + recovery) шилжих нь хамгийн чухал.";

export const PLATFORM_FEE_RATE = 0.05; // 5% (order_create функцтэй ижил)
