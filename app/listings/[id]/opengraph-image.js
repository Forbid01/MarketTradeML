// Зар share хийхэд (Facebook/Twitter/чат) үүсэх динамик OG зураг — үнэ, ранк,
// сервер, зарагдсан зургийн хамт брэндийн dark-cinematic хэв маягаар.
import { ImageResponse } from "next/og";
import { getListingById } from "@/lib/queries";
import { isUuid } from "@/lib/validation";

export const alt = "MLBB Market listing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ₮ (U+20AE) тэмдэгт OG-ийн default font-д байхгүй (□ болдог) тул "MNT"
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n ?? 0)) + " MNT";

export default async function Image({ params }) {
  const { id } = await params;
  let l = null;
  try {
    if (isUuid(id)) l = await getListingById(id);
  } catch {}

  const title = l?.title ?? "MLBB Market";
  const img = l?.images?.[0]?.url ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #0B0E1A 0%, #06070E 65%, #131027 100%)",
          color: "#E8ECF8",
          fontFamily: "sans-serif",
        }}
      >
        {/* Зүүн: текст */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, padding: "64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#38BDF8", fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>
            🛡 MLBB MARKET
          </div>
          <div style={{ display: "flex", marginTop: 30, fontSize: 56, fontWeight: 800, lineHeight: 1.12, maxWidth: 660 }}>
            {title.length > 64 ? title.slice(0, 64) + "…" : title}
          </div>
          {l && (
            <div style={{ display: "flex", gap: 16, marginTop: 28, fontSize: 28 }}>
              <span style={{ display: "flex", background: "rgba(56,189,248,0.15)", color: "#7dd3fc", padding: "8px 20px", borderRadius: 12 }}>
                {l.rank}
              </span>
              <span style={{ display: "flex", background: "rgba(255,255,255,0.08)", color: "#cbd5e1", padding: "8px 20px", borderRadius: 12 }}>
                {l.server}
              </span>
            </div>
          )}
          {l && (
            <div style={{ display: "flex", marginTop: 34, fontSize: 64, fontWeight: 800, color: "#38BDF8" }}>
              {fmt(l.price)}
            </div>
          )}
          <div style={{ display: "flex", marginTop: 30, color: "#F5C451", fontSize: 26 }}>
            Escrow-аар хамгаалагдсан арилжаа
          </div>
        </div>
        {/* Баруун: зарын зураг */}
        {img && (
          <div style={{ display: "flex", width: 420, height: "100%", position: "relative" }}>
            <img src={img} alt="" width={420} height={630} style={{ objectFit: "cover", width: 420, height: 630 }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, #06070E 0%, rgba(6,7,14,0) 45%)",
              }}
            />
          </div>
        )}
      </div>
    ),
    size
  );
}
