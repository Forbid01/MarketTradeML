import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/lib/validation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  getOrderForParty,
  getChecklist,
  getLatestDispute,
  getMessages,
  getReviewForOrder,
  getProfileVerified,
} from "@/lib/queries";
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
  if (!isUuid(id)) notFound();
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) redirect(`/login?next=/orders/${id}`);

  const isAdmin = profile?.role === "admin";
  const order = await getOrderForParty(id, profile?.id, isAdmin);
  if (!order) notFound();

  const isBuyer = profile?.id === order.buyer_id;
  const isSeller = profile?.id === order.seller_id;

  const t = await getT();
  const locale = await getLocale();

  const [checklist, dispute, messages, review, sellerProfile] = await Promise.all([
    getChecklist(id, profile.id, isAdmin),
    getLatestDispute(id, profile.id, isAdmin),
    getMessages(id, profile.id, isAdmin),
    getReviewForOrder(id, profile.id, isAdmin),
    getProfileVerified(order.seller_id),
  ]);

  const tone = ORDER_STATUS[order.status]?.tone ?? "zinc";
  const canEditChecklist =
    (isBuyer || isSeller || isAdmin) &&
    ["paid", "transferring", "inspecting"].includes(order.status);
  const canOpenDispute =
    (isBuyer || isSeller) && ["transferring", "inspecting"].includes(order.status);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/orders" className="text-sm text-slate-400 hover:text-slate-50">{t("order.backToOrders")}</Link>

      {/* Толгой */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-50">{order.listing_title ?? "—"}</h1>
            <p className="mt-1 text-xs text-slate-400">
              {isBuyer ? t("order.buyer") : isSeller ? t("order.seller") : t("order.admin")} · {formatDateTime(order.created_at, locale)}
            </p>
          </div>
          <StatusBadge label={t(`orderStatus.${order.status}`)} tone={tone} />
        </div>

        <EscrowStepper status={order.status} />

        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-slate-400">{t("order.amount")}: <b className="text-slate-50 font-semibold">{formatMNT(order.amount, locale)}</b></span>
          <span className="text-slate-400">{t("order.fee")}: <b className="text-slate-50 font-semibold">{formatMNT(order.fee, locale)}</b></span>
          <span className="text-slate-400">{t("order.toSeller")}: <b className="text-slate-50 font-semibold">{formatMNT(order.amount - order.fee, locale)}</b></span>
          <span className="text-slate-400">{t("order.payout")}: <b className="text-slate-50 font-semibold">{t(`payoutStatus.${order.payout_status}`)}</b></span>
        </div>

        {order.status === "inspecting" && order.inspection_ends && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-gold/10 px-3 py-1.5 text-sm text-gold">
            <Clock size={16} className="shrink-0 text-gold" />
            {t("order.inspection", { left: timeLeft(order.inspection_ends, locale), date: formatDateTime(order.inspection_ends, locale) })}
          </p>
        )}

        <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
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
        <div className="space-y-3 rounded-xl border border-gold/30 bg-gold/10 p-4">
          <h2 className="text-sm font-semibold text-gold">{t("order.adminControls")}</h2>
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
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
            <h3 className="mb-1 font-semibold text-slate-200">{t("review.yours")}</h3>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  filled={i < review.stars}
                  className={i < review.stars ? "text-gold" : "text-white/15"}
                />
              ))}
            </div>
            {review.comment && <p className="mt-1 text-slate-300">{review.comment}</p>}
          </div>
        ) : isBuyer ? (
          <ReviewForm orderId={order.id} />
        ) : null
      )}

      {/* Чат */}
      <OrderChat orderId={order.id} myUserId={profile.id} initialMessages={messages ?? []} />
    </div>
  );
}
