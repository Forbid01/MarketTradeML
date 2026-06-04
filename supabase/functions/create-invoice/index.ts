// Build Plan 3.4: QPay нэхэмжлэх үүсгэх Edge Function.
// Дуудагч нь захиалгын buyer мөн эсэхийг RLS-ээр шалгаж, QPay invoice үүсгэж,
// invoice_id-г захиалгад (service role) хадгална. verify_jwt = true.
import { serviceClient, userClient, cors, json } from "../_shared/supabase.ts";
import { createInvoice, getInvoice } from "../_shared/qpay.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const { order_id } = await req.json();
    if (!order_id) return json({ error: "order_id шаардлагатай" }, 400);

    // Дуудагчийн JWT — RLS зөвхөн оролцогчид order-г буцаана
    const uc = userClient(req);
    const { data: order, error } = await uc
      .from("orders")
      .select("id, amount, status, buyer_id, qpay_invoice_id")
      .eq("id", order_id)
      .maybeSingle();

    if (error || !order) return json({ error: "захиалга олдсонгүй / эрх алга" }, 404);
    if (order.status !== "created") return json({ error: "энэ захиалга төлбөр хүлээхгүй" }, 400);

    const siteUrl = Deno.env.get("SUPABASE_URL");
    const cbToken = Deno.env.get("QPAY_CALLBACK_TOKEN") ?? "";
    const callbackUrl = `${siteUrl}/functions/v1/qpay-callback?order=${order_id}&token=${encodeURIComponent(cbToken)}`;
    const sc = serviceClient();

    // Аль хэдийн invoice-той бол ДАХИН ШИНЭ үүсгэхгүй, байгааг нь дахин ашиглана — эс бөгөөс
    // хуучин (орхигдсон) invoice руу төлсөн төлбөр callback/reconcile-д хэзээ ч баригдахгүй алдагдана.
    if (order.qpay_invoice_id) {
      const existing = await getInvoice(order.qpay_invoice_id);
      return json({
        invoice_id: order.qpay_invoice_id,
        qr_text: existing.qr_text ?? null,
        qr_image: existing.qr_image ?? null,
        short_url: existing.qPay_shortUrl ?? existing.qpay_shorturl ?? null,
        urls: existing.urls ?? [],
        reused: true,
      });
    }

    const inv = await createInvoice({
      senderInvoiceNo: order_id,
      amount: order.amount,
      description: `MLBB захиалга ${order_id}`,
      callbackUrl,
    });

    // invoice_id-г захиалгад хадгалах (service role — RLS-ийг тойрно). АЛДААГ заавал шалгана:
    // хадгалж чадаагүй бол клиентэд бүртгэгдээгүй invoice өгвөл төлбөр алдагдана.
    const { error: upErr } = await sc
      .from("orders")
      .update({ qpay_invoice_id: inv.invoice_id })
      .eq("id", order_id)
      .eq("status", "created");
    if (upErr) {
      console.error("create-invoice persist error:", upErr.message);
      return json({ error: "invoice хадгалж чадсангүй" }, 500);
    }

    return json({
      invoice_id: inv.invoice_id,
      qr_text: inv.qr_text,
      qr_image: inv.qr_image,
      short_url: inv.qPay_shortUrl ?? inv.qpay_shorturl ?? null,
      urls: inv.urls ?? [],
    });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
