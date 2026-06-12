// Зарын карт — SERVER wrapper: орчуулга/үнэ форматыг сервер талд шийдэж цэвэр
// ListingCardView-д өгнө. Өмнө нь "use client" байсан тул browse-ийн 48 карт бүр
// тусдаа client boundary үүсгэж hydration-ийг хүндрүүлдэг байв. Client доторх
// хэрэглээ (ListingForm preview) ListingCardView-г шууд ашиглана.
import { getT, getLocale } from "@/lib/i18n/server";
import { formatMNT } from "@/lib/format";
import { sellerTier } from "@/lib/sellerTier";
import ListingCardView from "@/components/ListingCardView";

export default async function ListingCard({ listing, seller, imageUrl }) {
  const t = await getT();
  const locale = await getLocale();
  const tier = seller ? sellerTier(seller.trades_count) : null;
  const inactive = listing.status && listing.status !== "active";

  return (
    <ListingCardView
      listing={listing}
      seller={seller}
      imageUrl={imageUrl}
      priceText={formatMNT(listing.price, locale)}
      labels={{
        fresh: t("card.new"),
        escrow: t("card.escrow"),
        status: inactive ? t(`listingStatus.${listing.status}`) : null,
        tier: tier ? { label: t(`sellerTier.${tier.key}`), color: tier.color } : null,
      }}
    />
  );
}
