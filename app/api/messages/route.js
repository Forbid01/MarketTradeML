// GET /api/messages?order=<uuid>[&kind=boost][&after=<seq>]
// Чатын poll-ийг server action БИШ route handler-ээр: Next-ийн docs-оор client талд
// action-ууд нэг дараалалд цувардаг тул 4с тутмын poll нь escrow/илгээх action-уудыг
// хойшлуулдаг байсан. Эрхийн хяналт SQL дотроо (party эсвэл админ) — RLS байхгүй.
import { NextResponse } from "next/server";
import { getActiveUserId } from "@/lib/auth";
import { query } from "@/lib/db";
import { isUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req) {
  // getActiveUserId: server action-уудтай ижил deleted_at гвард (устгагдсан хэрэглэгчийн
  // 30 хоногийн JWT-ээр чатаа уншихыг блоклоно — auth() шууд id өгдөг тул хангалтгүй).
  const u = await getActiveUserId();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const id = sp.get("order");
  const isBoost = sp.get("kind") === "boost";
  const after = sp.get("after");
  if (!isUuid(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const params = [id, u];
  let cursorClause = "";
  if (after != null && /^\d+$/.test(after)) {
    params.push(after);
    cursorClause = " and m.seq > $3::bigint";
  }

  const partyGate = isBoost
    ? `exists (select 1 from public.boost_orders bo where bo.id = $1 and $2 in (bo.buyer_id, bo.booster_id))`
    : `exists (select 1 from public.orders o where o.id = $1 and $2 in (o.buyer_id, o.seller_id))`;
  const parentCol = isBoost ? "m.boost_order_id" : "m.order_id";

  try {
    const rows = await query(
      `select m.id, m.sender_id, m.body, m.created_at, m.seq from public.messages m
        where ${parentCol} = $1
          and ( ${partyGate}
                or exists (select 1 from public.users uu where uu.id = $2 and uu.role = 'admin') )
          ${cursorClause}
        order by m.seq asc`,
      params
    );
    return NextResponse.json({ ok: true, messages: rows });
  } catch (e) {
    console.error("messages route:", e?.message ?? e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
