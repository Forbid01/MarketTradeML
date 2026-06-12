// Next 16 metadata route → /manifest.webmanifest (Build Plan 1.1: PWA, display standalone)
export default function manifest() {
  return {
    name: "MLBB Аккаунт Маркетплейс",
    short_name: "MLBB Market",
    description: "MLBB аккаунт худалдаа — escrow хамгаалалт ба итгэлцэлтэй.",
    start_url: "/",
    display: "standalone",
    background_color: "#06070E",
    theme_color: "#06070E",
    lang: "mn",
    icons: [
      // PNG-үүд эхэндээ: iOS/Android-ийн install-д PNG шаардлагатай (SVG зөвхөн нөөц)
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
