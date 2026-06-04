// Next metadata route → /robots.txt
export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://mlbb-market.vercel.app";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/orders", "/admin", "/notifications", "/favorites", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
