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
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
