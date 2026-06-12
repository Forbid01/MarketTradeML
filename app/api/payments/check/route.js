// POST /api/payments/check { order, kind? } — QPay төлбөрийн авто-poll-д зориулсан
// route handler (server action-аар poll хийвэл client талын action дараалал блоклогддог).
// Гар шалгалтын товч action хэвээр (revalidatePath + локалчилсан алдаа).
import { NextResponse } from "next/server";
import { getActiveUserId } from "@/lib/auth";
import { checkPaymentCore } from "@/lib/payments";
import { isUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req) {
  // getActiveUserId: server action checkPaymentNow-тэй ижил deleted_at гвард.
  const u = await getActiveUserId();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const orderId = body?.order;
  const kind = body?.kind === "boost" ? "boost" : undefined;
  if (!isUuid(orderId)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  try {
    const r = await checkPaymentCore(u, orderId, kind);
    return NextResponse.json(r);
  } catch (e) {
    console.error("payments check route:", e?.message ?? e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
