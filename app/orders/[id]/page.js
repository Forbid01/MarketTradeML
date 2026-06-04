import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ORDER_STATUS } from "@/lib/constants";
import { formatMNT, formatDateTime, timeLeft } from "@/lib/format";
import { getT, getLocale } from "@/lib/i18n/server";
import StatusBadge from "@/components/StatusBadge";
import EscrowStepper from "@/components/EscrowStepper";
import EscrowActions from "@/components/EscrowActions";
import TransferChecklist from "@/components/TransferChecklist";
import OrderChat from "@/components/OrderChat";
import DisputeBox from "@/components/DisputeBox";
import ReviewForm from "@/components/ReviewForm";
import AdminDisputeResolve from "@/components/AdminDisputeResolve";
import AdminPayoutForm from "@/components/AdminPayoutForm";
import AdminVerifyToggle from "@/components/AdminVerifyToggle";
import QPayPay from "@/components/QPayPay";
import { Clock, Star } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function OrderDetail({ params }) {
  const { id } = await params;
  const { user, profile, supabase } = await getCurrentUser();
  if (!user) redirect(`/login?next=/orders/${id}`);

  const { data: order } = await supabase
    .from("orders")
    .select("*, listings(title, seller_id)")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const isBuyer = profile?.id === order.buyer_id;
  const isSeller = profile?.id === order.seller_id;
  const isAdmin = profile?.role === "admin";
  if (!isBuyer && !isSeller && !isAdmin) notFound();

  const t = await getT();
  const locale = await getLocale();

  const [
    { data: checklist },
    { data: dispute },
    { data: messages },
    { data: review },
    { data: sellerProfile },
  ] = await Promise.all([
    supabase.from("transfer_checklist").select("*").eq("order_id", id).maybeSingle(),
    supabase.from("disputes").select("*").eq("order_id", id).order("created_at", { ascending: false }).maybeSingle(),
    supabase.from("messages").select("id, sender_id, body, created_at").eq("order_id", id).order("created_at", { ascending: true }),
    supabase.from("reviews").select("id, stars, comment").eq("order_id", id).maybeSingle(),
    supabase.from("public_profiles").select("id, is_verified").eq("id", order.seller_id).maybeSingle(),
  ]);

  const tone = ORDER_STATUS[order.status]?.tone ?? "zinc";
  const canEditChecklist =
    (isBuyer || isSeller || isAdmin) &&
    ["paid", "transferring", "inspecting"].includes(order.status);
  const canOpenDispute =
    (isBuyer || isSeller) && ["transferring", "inspecting"].includes(order.status);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/orders" className="text-sm text-slate-500 hover:text-slate-900">{t("order.backToOrders")}</Link>

      {/* Толгой */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{order.listings?.title ?? "—"}</h1>
            <p className="mt-1 text-xs text-slate-400">
              {isBuyer ? t("order.buyer") : isSeller ? t("order.seller") : t("order.admin")} · {formatDateTime(order.created_at, locale)}
            </p>
          </div>
          <StatusBadge label={t(`orderStatus.${order.status}`)} tone={tone} />
        </div>

        <EscrowStepper status={order.status} />

        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-slate-500">{t("order.amount")}: <b className="text-slate-900 font-semibold">{formatMNT(order.amount, locale)}</b></span>
          <span className="text-slate-500">{t("order.fee")}: <b className="text-slate-900 font-semibold">{formatMNT(order.fee, locale)}</b></span>
          <span className="text-slate-500">{t("order.toSeller")}: <b className="text-slate-900 font-semibold">{formatMNT(order.amount - order.fee, locale)}</b></span>
          <span className="text-slate-500">{t("order.payout")}: <b className="text-slate-900 font-semibold">{t(`payoutStatus.${order.payout_status}`)}</b></span>
        </div>

        {order.status === "inspecting" && order.inspection_ends && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-700">
            <Clock size={16} className="shrink-0 text-amber-600" />
            {t("order.inspection", { left: timeLeft(order.inspection_ends, locale), date: formatDateTime(order.inspection_ends, locale) })}
          </p>
        )}

        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          {order.status === "created" && isBuyer && <QPayPay orderId={order.id} />}
          <EscrowActions
            orderId={order.id}
            status={order.status}
            isBuyer={isBuyer}
            isSeller={isSeller}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      {/* Админ удирдлага */}
      {isAdmin && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-700">{t("order.adminControls")}</h2>
          <AdminVerifyToggle userId={order.seller_id} isVerified={sellerProfile?.is_verified ?? false} />
          {order.status === "disputed" && dispute && <AdminDisputeResolve disputeId={dispute.id} />}
          {order.status === "completed" && order.payout_status === "pending" && (
            <AdminPayoutForm orderId={order.id} netAmount={order.amount - order.fee} />
          )}
        </div>
      )}

      {/* Маргаан */}
      <DisputeBox orderId={order.id} status={order.status} dispute={dispute} canOpen={canOpenDispute} />

      {/* Шилжүүлгийн шалгах жагсаалт */}
      {["paid", "transferring", "inspecting", "disputed", "completed"].includes(order.status) && (
        <TransferChecklist orderId={order.id} checklist={checklist} canEdit={canEditChecklist} />
      )}

      {/* Review */}
      {order.status === "completed" && (
        review ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <h3 className="mb-1 font-semibold text-slate-700">{t("review.yours")}</h3>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  filled={i < review.stars}
                  className={i < review.stars ? "text-amber-500" : "text-slate-300"}
                />
              ))}
            </div>
            {review.comment && <p className="mt-1 text-slate-600">{review.comment}</p>}
          </div>
        ) : isBuyer ? (
          <ReviewForm orderId={order.id} sellerId={order.seller_id} reviewerId={profile.id} />
        ) : null
      )}

      {/* Чат */}
      <OrderChat orderId={order.id} myUserId={profile.id} initialMessages={messages ?? []} />
    </div>
  );
}
