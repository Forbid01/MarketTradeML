// Client рүү илгээх dictionary-ийн SUBSET — зөвхөн "use client" компонентуудын
// ашигладаг namespace-ууд. Бүтэн dictionary (~18KB) hydration payload-д давхар
// serialize хийгддэг байсан. Шинэ client компонент ШИНЭ namespace хэрэглэвэл энд
// нэмнэ — tests/client-dict.test.js automated шалгалтаар хамгаалагдсан.
export const CLIENT_NAMESPACES = [
  "account", "adminAct", "boost", "buy", "card", "chat", "checklist", "common",
  "dispute", "errorPage", "errors", "escrow", "favorite", "gallery", "install",
  "landing", "listingForm", "listingStatus", "login", "nav", "notif", "owner",
  "payoutStatus", "qpay", "review", "sellerTier",
];

export function clientDict(dict) {
  const out = {};
  for (const ns of CLIENT_NAMESPACES) {
    if (dict[ns] != null) out[ns] = dict[ns];
  }
  return out;
}
