// Зарагчийн түвшин — амжилттай арилжааны тоогоор. UI badge-д (ListingCard, профайл).
// Өнгө нь брэнд палитраас; шошгыг i18n-ээр (sellerTier.<key>). Client+server аль алинд.
export const SELLER_TIERS = [
  { key: "legend", min: 50, color: "#F5C451" },
  { key: "elite", min: 20, color: "#A78BFA" },
  { key: "trusted", min: 5, color: "#38BDF8" },
  { key: "active", min: 1, color: "#94A3B8" },
  { key: "rookie", min: 0, color: "#64748B" },
];

export function sellerTier(tradesCount = 0) {
  const n = Number(tradesCount) || 0;
  return SELLER_TIERS.find((tier) => n >= tier.min) ?? SELLER_TIERS[SELLER_TIERS.length - 1];
}
