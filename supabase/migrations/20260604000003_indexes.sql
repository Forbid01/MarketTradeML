-- 0003 — Index ба unique constraint
-- Build Plan 1.4: хайлт/шүүлт, БҮХ FK дээр index (RLS гүйцэтгэлд зайлшгүй),
-- idempotency unique, давхар зарах хамгаалалт.

-- Зарын хайлт/шүүлт (rank/server/price) + жагсаалт
create index idx_listings_status_created on public.listings (status, created_at desc) where deleted_at is null;
create index idx_listings_server         on public.listings (server)  where deleted_at is null;
create index idx_listings_rank           on public.listings (rank)    where deleted_at is null;
create index idx_listings_price          on public.listings (price)   where deleted_at is null;
create index idx_listings_seller         on public.listings (seller_id);
-- Текст хайлт (trigram)
create index idx_listings_title_trgm     on public.listings using gin (title gin_trgm_ops);
create index idx_listings_desc_trgm      on public.listings using gin (description gin_trgm_ops);

-- FK index-үүд — RLS policy эдгээрийг ашигладаг тул индексгүй бол sequential scan (100x удаашрал)
create index idx_listing_images_listing  on public.listing_images (listing_id);
create index idx_orders_buyer            on public.orders (buyer_id);
create index idx_orders_seller           on public.orders (seller_id);
create index idx_orders_listing          on public.orders (listing_id);
create index idx_orders_status           on public.orders (status);
create index idx_messages_order          on public.messages (order_id);
create index idx_reviews_seller          on public.reviews (seller_id);
create index idx_reviews_reviewer        on public.reviews (reviewer_id);
create index idx_disputes_order          on public.disputes (order_id);
create index idx_disputes_status         on public.disputes (status);
create index idx_disputes_opened_by      on public.disputes (opened_by);
create index idx_disputes_resolved_by    on public.disputes (resolved_by);
create index idx_notifications_user      on public.notifications (user_id, is_read, created_at desc);
create index idx_payouts_recipient       on public.payouts (recipient_id);
create index idx_favorites_listing       on public.favorites (listing_id);
create index idx_payment_events_order    on public.payment_events (order_id);

-- Idempotency: нэг QPay invoice-ийг хоёр удаа боловсруулахгүй (partial — NULL зөвшөөрнө)
create unique index uq_orders_qpay_invoice on public.orders (qpay_invoice_id) where qpay_invoice_id is not null;

-- ДАВХАР ЗАРАХ хамгаалалт: нэг listing дээр идэвхтэй (terminal бус) ганц л захиалга байна
create unique index uq_orders_one_active_per_listing
  on public.orders (listing_id)
  where status in ('created','paid','transferring','inspecting','disputed');

-- 48 цагийн inspection sweep-д зориулсан index
create index idx_orders_inspection on public.orders (inspection_ends) where status = 'inspecting';

-- Нэг захиалгад зэрэг ганц л НЭЭЛТТЭЙ маргаан (state machine ганц амьд маргаан гэж үздэг).
-- Түүхийг хадгалахын тулд зөвхөн status='open' дээр partial unique.
create unique index uq_disputes_one_open_per_order
  on public.disputes (order_id) where status = 'open';
