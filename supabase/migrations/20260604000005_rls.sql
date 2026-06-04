-- 0005 — Row Level Security (RLS)
-- Build Plan 1.6: бүх хүснэгтэд RLS асаах. Хэрэглэгч зөвхөн өөрийн өгөгдөл; зарагч өөрийн зар;
-- мөнгө/төлөвт холбоотой бүх шилжилт зөвхөн SECURITY DEFINER функц/админаар.
-- auth.uid()-г (select auth.uid())-ээр боож гүйцэтгэлийг сайжруулна.

alter table public.users               enable row level security;
alter table public.listings            enable row level security;
alter table public.listing_images      enable row level security;
alter table public.orders              enable row level security;
alter table public.transfer_checklist  enable row level security;
alter table public.credentials_handoff enable row level security;
alter table public.payment_events      enable row level security;
alter table public.reviews             enable row level security;
alter table public.disputes            enable row level security;
alter table public.messages            enable row level security;
alter table public.payouts             enable row level security;
alter table public.notifications       enable row level security;
alter table public.audit_log           enable row level security;
alter table public.favorites           enable row level security;

-- ───────────── users ─────────────
-- Бүтэн мөрийг (утас зэрэг) зөвхөн өөрөө/админ хардаг. Бусдын ОЛОН НИЙТИЙН профайлыг
-- доорх public_profiles view-ээр аюулгүй (зөвхөн safe багана) харуулна.
create policy users_select_self on public.users
  for select to authenticated
  using (auth_id = (select auth.uid()) or public.is_admin());

create policy users_update_self on public.users
  for update to authenticated
  using (auth_id = (select auth.uid()))
  with check (auth_id = (select auth.uid()));
-- (итгэлцлийн баганыг guard_user_privileged_columns trigger хамгаална)

-- Олон нийтийн профайл view (safe багана). View нь RLS тойрдог тул аюулгүй баганыг л гаргана.
create view public.public_profiles as
  select id, display_name, avatar_url, is_verified, rating_avg, trades_count, created_at
  from public.users
  where deleted_at is null;
grant select on public.public_profiles to anon, authenticated;

-- ───────────── listings ─────────────
create policy listings_public_read on public.listings
  for select to anon, authenticated
  using (deleted_at is null and status in ('active','reserved','sold'));

create policy listings_seller_read_own on public.listings
  for select to authenticated
  using (seller_id = public.current_user_id() or public.is_admin());

create policy listings_seller_insert on public.listings
  for insert to authenticated
  with check (seller_id = public.current_user_id());

-- Зарагч зөвхөн ЗАРААГҮЙ/escrow-д ороогүй зараа засна (active/draft/hidden). reserved/sold
-- зарыг буцааж active болгож "дахин зарах" замыг хаана — статусын шилжилт зөвхөн SECURITY
-- DEFINER функцээр (order_create/order_transition/admin_resolve_dispute). Админд хязгааргүй.
create policy listings_seller_update on public.listings
  for update to authenticated
  using (
    public.is_admin()
    or (seller_id = public.current_user_id() and status in ('active','draft','hidden'))
  )
  with check (
    public.is_admin()
    or (seller_id = public.current_user_id() and status in ('active','draft','hidden'))
  );

-- ───────────── listing_images ─────────────
create policy listing_images_read on public.listing_images
  for select to anon, authenticated using (true);

-- Зураг бичих/устгахыг зөвхөн ЗАРААГҮЙ (active/draft/hidden) зар дээр зөвшөөрнө —
-- escrow явагдсаны дараа зар + зургийг өөрчилбөл маргааны нотолгоо алдагдана. Админд нээлттэй.
create policy listing_images_owner_write on public.listing_images
  for all to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.listings l
               where l.id = listing_id and l.seller_id = public.current_user_id()
                 and l.status in ('active','draft','hidden')))
  with check (
    public.is_admin()
    or exists (select 1 from public.listings l
               where l.id = listing_id and l.seller_id = public.current_user_id()
                 and l.status in ('active','draft','hidden')));

-- ───────────── orders ─────────────
-- Зөвхөн харах. Үүсгэх нь order_create(), шилжилт нь order_transition() (SECURITY DEFINER)-ээр.
create policy orders_party_read on public.orders
  for select to authenticated
  using (buyer_id = public.current_user_id()
         or seller_id = public.current_user_id()
         or public.is_admin());

-- ───────────── transfer_checklist ─────────────
create policy checklist_party_read on public.transfer_checklist
  for select to authenticated using (public.is_order_party(order_id) or public.is_admin());

-- БИЧИХ policy ЗОРИУДААР БАЙХГҮЙ (= deny). Чеклистийг зөвхөн public.set_checklist_item() RPC-ээр
-- засна — тэр нь buyer-side талбарыг зөвхөн худалдан авагч, seller-side-ийг зөвхөн зарагчид
-- зөвшөөрнө (RLS багана түвшинд ялгаж чадахгүй тул). Шууд table update боломжгүй.

-- ───────────── credentials_handoff ─────────────
-- Зөвхөн худалдан авагч (эсвэл админ) унших. Бичих нь Edge/service_role-оор (шифрлэлттэй).
create policy credentials_buyer_read on public.credentials_handoff
  for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.orders o
    where o.id = order_id and o.buyer_id = public.current_user_id()));

-- ───────────── payment_events ─────────────
-- Ердийн хэрэглэгчид хаалттай (policy байхгүй = deny). service_role RLS-ийг тойрно.

-- ───────────── reviews ─────────────
create policy reviews_public_read on public.reviews
  for select to anon, authenticated using (true);

create policy reviews_buyer_insert on public.reviews
  for insert to authenticated
  with check (
    reviewer_id = public.current_user_id()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.buyer_id = public.current_user_id()
        and o.seller_id = reviews.seller_id
        and o.status = 'completed'));

-- ───────────── disputes ─────────────
create policy disputes_party_read on public.disputes
  for select to authenticated using (public.is_order_party(order_id) or public.is_admin());
-- Нээх нь open_dispute(), шийдвэрлэх нь админ/service_role-оор (UPDATE policy байхгүй = deny).

-- ───────────── messages ─────────────
create policy messages_party_read on public.messages
  for select to authenticated using (public.is_order_party(order_id) or public.is_admin());

create policy messages_party_insert on public.messages
  for insert to authenticated
  with check (sender_id = public.current_user_id() and public.is_order_party(order_id));

-- ───────────── payouts ─────────────
create policy payouts_read on public.payouts
  for select to authenticated
  using (recipient_id = public.current_user_id() or public.is_admin());
-- Insert/Update зөвхөн админ/service_role-оор.

-- ───────────── notifications ─────────────
create policy notifications_own_read on public.notifications
  for select to authenticated using (user_id = public.current_user_id());

create policy notifications_own_update on public.notifications
  for update to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

-- ───────────── audit_log ─────────────
-- Ердийн хэрэглэгчид хаалттай (policy байхгүй = deny). Зөвхөн service_role.

-- ───────────── favorites ─────────────
create policy favorites_own_all on public.favorites
  for all to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());
