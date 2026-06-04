// Next metadata route → /sitemap.xml (нийтийн хуудсууд)
export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://mlbb-market.vercel.app";
  const routes = ["", "/browse", "/boost", "/login"];
  return routes.map((r) => ({
    url: `${base}${r}`,
    changeFrequency: r === "/browse" ? "hourly" : "daily",
    priority: r === "" ? 1 : 0.7,
  }));
}
