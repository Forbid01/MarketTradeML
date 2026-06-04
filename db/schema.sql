-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  MLBB Marketplace — Neon/Postgres schema (Supabase-ГҮЙ)                ║
-- ║  Supabase-аас порт: auth.users/RLS/storage/grants/realtime ХАССАН.     ║
-- ║  Эрхийн шалгалт серверийн давхаргад; escrow функцүүд actor_id-тэй.     ║
-- ║  Ачаалах:  psql "$DATABASE_URL" -f db/schema.sql                       ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ───────────── Extensions ─────────────
create extension if not exists pgcrypto;     -- gen_random_uuid()
create extension if not exists pg_trgm;       -- текст хайлт (trigram)
-- updated_at-ийг гар бичсэн trigger-ээр (moddatetime contrib-аас хамаарахгүй — Neon-д найдвартай)

-- ───────────── Enums ─────────────
do $$ begin
  create type public.order_status as enum
    ('created','paid','transferring','inspecting','completed','disputed','cancelled','expired','refunded');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.listing_status as enum ('draft','active','reserved','sold','hidden','banned');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payout_status as enum ('pending','paid_out','refunded','failed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.dispute_status as enum ('open','released','refunded','rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.notification_channel as enum ('in_app','email');
exception when duplicate_object then null; end $$;

-- ───────────── users (Auth.js-аар удирдагдана; email үндсэн таних) ─────────────
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  display_name  text not null,
  image         text,                                    -- профайл зураг (Google avatar)
  phone         text,                                    -- сонголтоор (одоо ашиглахгүй)
  avatar_url    text,
  role          text not null default 'user' check (role in ('user','admin')),
  is_verified   boolean not null default false,
  rating_avg    numeric(3,2) not null default 0,
  trades_count  int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

-- email OTP кодууд (нэвтрэх 6 оронтой код; magic link БИШ)
create table if not exists public.email_otps (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code_hash   text not null,            -- sha256(code) — plain text БИШ
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  attempts    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_email_otps_email on public.email_otps (email, created_at desc);

-- ───────────── listings ─────────────
create table if not exists public.listings (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null references public.users(id) on delete restrict,
  title         text not null check (char_length(title) between 3 and 140),
  price         bigint not null check (price > 0),
  server        text not null,
  rank          text not null,
  description   text check (description is null or char_length(description) <= 4000),
  level         int check (level is null or level between 0 and 1000),
  heroes_count  int check (heroes_count is null or heroes_count between 0 and 500),
  skins_count   int check (skins_count is null or skins_count between 0 and 5000),
  win_rate      numeric(5,2) check (win_rate is null or (win_rate >= 0 and win_rate <= 100)),
  status        public.listing_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table if not exists public.listing_images (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings(id) on delete cascade,
  url           text not null,                           -- Vercel Blob public URL
  storage_path  text,                                    -- Blob pathname (устгахад)
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- ───────────── orders (escrow-ийн зүрх) ─────────────
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id) on delete restrict,
  buyer_id        uuid not null references public.users(id) on delete restrict,
  seller_id       uuid not null references public.users(id) on delete restrict,
  amount          bigint not null check (amount >= 0),
  fee             bigint not null default 0 check (fee >= 0),
  status          public.order_status not null default 'created',
  qpay_invoice_id text,
  inspection_ends timestamptz,
  payout_status   public.payout_status not null default 'pending',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint orders_buyer_ne_seller check (buyer_id <> seller_id),
  constraint orders_fee_le_amount   check (fee <= amount)
);

create table if not exists public.transfer_checklist (
  id                                        uuid primary key default gen_random_uuid(),
  order_id                                  uuid not null unique references public.orders(id) on delete cascade,
  primary_email_ownership_transferred       boolean not null default false,
  email_password_changed_by_buyer           boolean not null default false,
  recovery_phone_changed_by_buyer           boolean not null default false,
  secondary_verification_email_transferred  boolean not null default false,
  two_fa_reset_done                         boolean not null default false,
  facebook_unbound                          boolean not null default false,
  google_unbound                            boolean not null default false,
  tiktok_unbound                            boolean not null default false,
  original_topup_receipts_handed_over       boolean not null default false,
  seller_signed_release                     boolean not null default false,
  seller_link_cut                           boolean not null default false,
  verified_by_buyer                         boolean not null default false,
  created_at                                timestamptz not null default now(),
  updated_at                                timestamptz not null default now()
);

create table if not exists public.credentials_handoff (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null unique references public.orders(id) on delete cascade,
  encrypted_payload     bytea,
  revealed_to_buyer_at  timestamptz,
  expires_at            timestamptz,
  wiped_at              timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.payment_events (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid references public.orders(id) on delete set null,
  qpay_payment_id text not null unique,
  qpay_invoice_id text,
  amount          bigint,
  status          text,
  raw_payload     jsonb,
  processed_at    timestamptz not null default now()
);

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null unique references public.orders(id) on delete cascade,
  reviewer_id  uuid not null references public.users(id) on delete restrict,
  seller_id    uuid not null references public.users(id) on delete restrict,
  stars        int not null check (stars between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now()
);

create table if not exists public.disputes (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete restrict,
  opened_by    uuid not null references public.users(id) on delete restrict,
  reason       text not null,
  status       public.dispute_status not null default 'open',
  admin_note   text,
  resolved_by  uuid references public.users(id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  sender_id    uuid not null references public.users(id) on delete restrict,
  body         text not null check (char_length(body) between 1 and 4000),
  created_at   timestamptz not null default now()
);

create table if not exists public.payouts (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null unique references public.orders(id) on delete restrict,
  recipient_id     uuid not null references public.users(id) on delete restrict,
  amount           bigint not null check (amount >= 0),
  fee_deducted     bigint not null default 0 check (fee_deducted >= 0),
  net_amount       bigint not null check (net_amount >= 0),
  method           text,
  bank_account     text,
  external_txn_ref text,
  status           public.payout_status not null default 'pending',
  paid_by          uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  paid_at          timestamptz
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  order_id   uuid references public.orders(id) on delete cascade,
  channel    public.notification_channel not null default 'in_app',
  is_read    boolean not null default false,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.users(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id    uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ───────────── Indexes ─────────────
create index if not exists idx_listings_status_created on public.listings (status, created_at desc) where deleted_at is null;
create index if not exists idx_listings_server  on public.listings (server) where deleted_at is null;
create index if not exists idx_listings_rank    on public.listings (rank)   where deleted_at is null;
create index if not exists idx_listings_price   on public.listings (price)  where deleted_at is null;
create index if not exists idx_listings_seller  on public.listings (seller_id);
create index if not exists idx_listings_title_trgm on public.listings using gin (title gin_trgm_ops);
create index if not exists idx_listing_images_listing on public.listing_images (listing_id);
create index if not exists idx_orders_buyer    on public.orders (buyer_id);
create index if not exists idx_orders_seller   on public.orders (seller_id);
create index if not exists idx_orders_listing  on public.orders (listing_id);
create index if not exists idx_orders_status   on public.orders (status);
create index if not exists idx_messages_order  on public.messages (order_id);
create index if not exists idx_reviews_seller  on public.reviews (seller_id);
create index if not exists idx_reviews_reviewer on public.reviews (reviewer_id);
create index if not exists idx_disputes_order  on public.disputes (order_id);
create index if not exists idx_disputes_status on public.disputes (status);
create index if not exists idx_disputes_opened_by on public.disputes (opened_by);
create index if not exists idx_notifications_user on public.notifications (user_id, is_read, created_at desc);
create index if not exists idx_payouts_recipient on public.payouts (recipient_id);
create index if not exists idx_favorites_listing on public.favorites (listing_id);
create index if not exists idx_payment_events_order on public.payment_events (order_id);
create unique index if not exists uq_orders_qpay_invoice on public.orders (qpay_invoice_id) where qpay_invoice_id is not null;
create unique index if not exists uq_orders_one_active_per_listing
  on public.orders (listing_id) where status in ('created','paid','transferring','inspecting','disputed');
create index if not exists idx_orders_inspection on public.orders (inspection_ends) where status = 'inspecting';
create unique index if not exists uq_disputes_one_open_per_order
  on public.disputes (order_id) where status = 'open';

-- ───────────── Олон нийтийн профайл (safe багана) ─────────────
create or replace view public.public_profiles as
  select id, display_name, coalesce(image, avatar_url) as avatar_url, is_verified, rating_avg, trades_count, created_at
  from public.users where deleted_at is null;

-- ═══════════════════════ Functions / Triggers ═══════════════════════

-- Админ эсэх (actor_id-аар; RLS байхгүй тул users-ээс шууд шалгана). Soft-delete-ийг хасна.
create or replace function public.is_admin(p_actor_id uuid)
returns boolean language sql stable as $$
  select coalesce((select role = 'admin' from public.users where id = p_actor_id and deleted_at is null), false);
$$;

-- updated_at автомат (гар бичсэн — contrib extension шаардахгүй)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$ begin
  create trigger set_updated_at before update on public.users
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on public.listings
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on public.orders
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on public.transfer_checklist
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on public.credentials_handoff
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on public.disputes
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- users-ийн итгэлцлийн баганыг хамгаалах (tx-local флагтай үед л зөвшөөрнө)
create or replace function public.guard_user_privileged_columns()
returns trigger language plpgsql as $$
begin
  if current_setting('app.allow_trust_update', true) = '1' then
    return new;
  end if;
  new.role         := old.role;
  new.is_verified  := old.is_verified;
  new.rating_avg   := old.rating_avg;
  new.trades_count := old.trades_count;
  return new;
end;
$$;
do $$ begin
  create trigger trg_guard_user_cols before update on public.users
    for each row execute function public.guard_user_privileged_columns();
exception when duplicate_object then null; end $$;

-- Зарагчийн rating дахин тооцоолох
create or replace function public.recompute_seller_rating()
returns trigger language plpgsql as $$
declare sid uuid := coalesce(new.seller_id, old.seller_id);
begin
  perform set_config('app.allow_trust_update', '1', true);
  update public.users u
    set rating_avg = coalesce(
      (select round(avg(r.stars)::numeric, 2) from public.reviews r where r.seller_id = sid), 0)
    where u.id = sid;
  perform set_config('app.allow_trust_update', '0', true);  -- цонхыг шууд хаах (defense)
  return null;
end;
$$;
do $$ begin
  create trigger trg_recompute_rating after insert or update or delete on public.reviews
    for each row execute function public.recompute_seller_rating();
exception when duplicate_object then null; end $$;

-- trades_count: зөвхөн completed + paid_out
create or replace function public.bump_trades_count()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed' and new.payout_status = 'paid_out'
     and (old.payout_status is distinct from new.payout_status
          or old.status is distinct from new.status) then
    perform set_config('app.allow_trust_update', '1', true);
    update public.users set trades_count = trades_count + 1 where id = new.seller_id;
    perform set_config('app.allow_trust_update', '0', true);  -- цонхыг шууд хаах (defense)
  end if;
  return null;
end;
$$;
do $$ begin
  create trigger trg_bump_trades after update on public.orders
    for each row execute function public.bump_trades_count();
exception when duplicate_object then null; end $$;

-- audit_log (actor-ийг app.actor_id GUC-аас уншина — серверээс/функцээс тавина)
create or replace function public.audit_row()
returns trigger language plpgsql as $$
declare act text := TG_ARGV[0];
begin
  insert into public.audit_log(actor_id, action, entity_type, entity_id, before, after)
  values (
    nullif(current_setting('app.actor_id', true), '')::uuid,
    act, TG_TABLE_NAME, coalesce(new.id, old.id),
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('UPDATE','INSERT') then to_jsonb(new) else null end
  );
  return null;
end;
$$;
do $$ begin
  create trigger audit_dispute after update on public.disputes
    for each row when (old.status is distinct from new.status)
    execute function public.audit_row('dispute_resolved');
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger audit_user_verify after update on public.users
    for each row when (old.is_verified is distinct from new.is_verified)
    execute function public.audit_row('user_verified');
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger audit_payout after insert on public.payouts
    for each row execute function public.audit_row('payout_recorded');
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger audit_order_status after update on public.orders
    for each row when (old.status is distinct from new.status)
    execute function public.audit_row('order_status_change');
exception when duplicate_object then null; end $$;

-- Эцсийн төлвөөс цааш шилжихийг хориглоно
create or replace function public.guard_order_terminal()
returns trigger language plpgsql as $$
begin
  if old.status in ('completed','cancelled','expired','refunded')
     and new.status is distinct from old.status then
    raise exception 'захиалга эцсийн төлөвт (%) — төлөв өөрчлөх хориотой', old.status;
  end if;
  return new;
end;
$$;
do $$ begin
  create trigger trg_guard_order_terminal before update on public.orders
    for each row execute function public.guard_order_terminal();
exception when duplicate_object then null; end $$;

-- payout зөвхөн 'completed' захиалгад
create or replace function public.guard_payout_insert()
returns trigger language plpgsql as $$
declare st public.order_status;
begin
  select status into st from public.orders where id = new.order_id;
  if st <> 'completed' then raise exception 'payout зөвхөн completed захиалгад (одоо: %)', st; end if;
  return new;
end;
$$;
do $$ begin
  create trigger trg_guard_payout before insert on public.payouts
    for each row execute function public.guard_payout_insert();
exception when duplicate_object then null; end $$;

-- notifications trigger-ууд
create or replace function public.notify_order_status()
returns trigger language plpgsql as $$
begin
  insert into public.notifications(user_id, type, title, body, order_id, channel)
  values (new.buyer_id,  'order_status', 'Захиалгын төлөв шинэчлэгдлээ', new.status, new.id, 'in_app'),
         (new.seller_id, 'order_status', 'Захиалгын төлөв шинэчлэгдлээ', new.status, new.id, 'in_app');
  return null;
end;
$$;
do $$ begin
  create trigger trg_notify_order_status after update on public.orders
    for each row when (old.status is distinct from new.status)
    execute function public.notify_order_status();
exception when duplicate_object then null; end $$;

create or replace function public.notify_new_message()
returns trigger language plpgsql as $$
declare o public.orders; recipient uuid;
begin
  select * into o from public.orders where id = new.order_id;
  recipient := case when new.sender_id = o.buyer_id then o.seller_id else o.buyer_id end;
  insert into public.notifications(user_id, type, title, body, order_id, channel)
  values (recipient, 'message', 'Шинэ мессеж', left(new.body, 80), new.order_id, 'in_app');
  return null;
end;
$$;
do $$ begin
  create trigger trg_notify_message after insert on public.messages
    for each row execute function public.notify_new_message();
exception when duplicate_object then null; end $$;

-- ───────────── Escrow суллах нөхцөл (гар ба автомат нэг эх) ─────────────
create or replace function public.checklist_release_ok(p_order_id uuid)
returns boolean language sql stable as $$
  select coalesce((
    select tc.primary_email_ownership_transferred and tc.email_password_changed_by_buyer
       and tc.recovery_phone_changed_by_buyer and tc.secondary_verification_email_transferred
       and tc.two_fa_reset_done and tc.verified_by_buyer
       and tc.seller_link_cut and tc.seller_signed_release and tc.original_topup_receipts_handed_over
    from public.transfer_checklist tc where tc.order_id = p_order_id
  ), false);
$$;

-- ───────────── Захиалга үүсгэх (атомик) ─────────────
create or replace function public.order_create(p_listing_id uuid, p_actor_id uuid)
returns public.orders language plpgsql as $$
declare l public.listings; o public.orders; v_fee bigint;
begin
  if p_actor_id is null then raise exception 'нэвтрээгүй байна'; end if;
  perform set_config('app.actor_id', p_actor_id::text, true);

  select * into l from public.listings where id = p_listing_id for update;
  if not found or l.deleted_at is not null then raise exception 'зар олдсонгүй'; end if;
  if l.status <> 'active' then raise exception 'зар идэвхгүй (бэлэн бус)'; end if;
  if l.seller_id = p_actor_id then raise exception 'өөрийн зарыг худалдаж авах боломжгүй'; end if;

  v_fee := round(l.price * 0.05);

  insert into public.orders (listing_id, buyer_id, seller_id, amount, fee, status)
  values (l.id, p_actor_id, l.seller_id, l.price, v_fee, 'created') returning * into o;

  insert into public.transfer_checklist (order_id) values (o.id);
  insert into public.credentials_handoff (order_id, expires_at) values (o.id, now() + interval '7 days');
  update public.listings set status = 'reserved' where id = l.id;
  return o;
end;
$$;

-- ───────────── Escrow төлөв шилжүүлэх (атомик, FOR UPDATE) ─────────────
create or replace function public.order_transition(p_order_id uuid, p_target public.order_status, p_actor_id uuid)
returns public.orders language plpgsql as $$
declare
  o public.orders; admin boolean := public.is_admin(p_actor_id);
  is_buyer boolean; is_seller boolean; ok boolean := false;
begin
  perform set_config('app.actor_id', coalesce(p_actor_id::text,''), true);
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'захиалга олдсонгүй'; end if;

  is_buyer := (o.buyer_id = p_actor_id); is_seller := (o.seller_id = p_actor_id);
  if not (admin or is_buyer or is_seller) then raise exception 'энэ захиалгад эрх байхгүй'; end if;
  if o.status in ('completed','cancelled','expired','refunded') then
    raise exception 'захиалга эцсийн төлөвт (%), шилжилт хориотой', o.status;
  end if;

  ok := case
    when o.status = 'created'      and p_target = 'paid'         and admin                then true
    when o.status = 'created'      and p_target = 'cancelled'    and (is_buyer or admin)  then true
    when o.status = 'created'      and p_target = 'expired'      and admin                then true
    when o.status = 'paid'         and p_target = 'transferring' and (is_seller or admin) then true
    when o.status = 'transferring' and p_target = 'inspecting'   and (is_buyer or admin)  then true
    when o.status = 'inspecting'   and p_target = 'completed'    and (is_buyer or admin)  then true
    -- 'disputed'-руу шилжүүлэхийг ЗОРИУДААР хассан: маргааныг ЗӨВХӨН open_dispute()-ээр
    -- (disputes мөр үүсгэдэг) нээнэ. Эс бөгөөс захиалга disputes-мөргүйгээр царцана.
    when o.status = 'disputed'     and p_target = 'completed'    and admin                then true
    when o.status = 'disputed'     and p_target = 'refunded'     and admin                then true
    when o.status = 'inspecting'   and p_target = 'expired'      and admin                then true
    else false end;
  if not ok then raise exception 'шилжилт % -> % зөвшөөрөгдөхгүй', o.status, p_target; end if;

  -- ГОЛ ХЯНАЛТ: buyer escrow суллахад (inspecting→completed) checklist бүрэн байх ёстой
  if p_target = 'completed' and o.status = 'inspecting' and not admin then
    if not public.checklist_release_ok(o.id) then
      raise exception 'шилжүүлгийн checklist бүрэн биш — дуусгах боломжгүй';
    end if;
  end if;

  update public.orders set status = p_target,
     inspection_ends = case when p_target = 'inspecting' then now() + interval '48 hours' else inspection_ends end
   where id = o.id returning * into o;

  if p_target = 'completed' then
    update public.listings set status = 'sold' where id = o.listing_id;
  elsif p_target in ('cancelled','expired','refunded') then
    update public.listings set status = 'active' where id = o.listing_id and status = 'reserved';
  end if;
  return o;
end;
$$;

-- ───────────── Checklist нэг талбар (тал бүрийн эрхтэй) ─────────────
create or replace function public.set_checklist_item(p_order_id uuid, p_field text, p_value boolean, p_actor_id uuid)
returns void language plpgsql as $$
declare o public.orders; admin boolean := public.is_admin(p_actor_id); v_side text;
begin
  if p_actor_id is null then raise exception 'нэвтрээгүй байна'; end if;
  select * into o from public.orders where id = p_order_id;
  if not found then raise exception 'захиалга олдсонгүй'; end if;
  if not (admin or o.buyer_id = p_actor_id or o.seller_id = p_actor_id) then
    raise exception 'энэ захиалгад эрх байхгүй';
  end if;
  if o.status not in ('transferring','inspecting','disputed') then
    raise exception 'checklist-ийг зөвхөн шилжүүлэг/шалгалт/маргааны үед засна (одоо: %)', o.status;
  end if;

  v_side := case p_field
    when 'primary_email_ownership_transferred' then 'buyer'
    when 'email_password_changed_by_buyer' then 'buyer'
    when 'recovery_phone_changed_by_buyer' then 'buyer'
    when 'secondary_verification_email_transferred' then 'buyer'
    when 'two_fa_reset_done' then 'buyer'
    when 'verified_by_buyer' then 'buyer'
    when 'facebook_unbound' then 'seller'
    when 'google_unbound' then 'seller'
    when 'tiktok_unbound' then 'seller'
    when 'original_topup_receipts_handed_over' then 'seller'
    when 'seller_signed_release' then 'seller'
    when 'seller_link_cut' then 'seller'
    else null end;
  if v_side is null then raise exception 'буруу checklist талбар: %', p_field; end if;

  if not admin then
    if v_side = 'buyer'  and o.buyer_id  <> p_actor_id then raise exception 'энэ хэсгийг зөвхөн худалдан авагч тэмдэглэнэ'; end if;
    if v_side = 'seller' and o.seller_id <> p_actor_id then raise exception 'энэ хэсгийг зөвхөн зарагч тэмдэглэнэ'; end if;
  end if;

  execute format('update public.transfer_checklist set %I = $1 where order_id = $2', p_field)
    using p_value, p_order_id;
end;
$$;

-- ───────────── Маргаан нээх ─────────────
create or replace function public.open_dispute(p_order_id uuid, p_reason text, p_actor_id uuid)
returns public.disputes language plpgsql as $$
declare o public.orders; d public.disputes;
begin
  if p_actor_id is null then raise exception 'нэвтрээгүй байна'; end if;
  perform set_config('app.actor_id', p_actor_id::text, true);
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'захиалга олдсонгүй'; end if;
  if not (o.buyer_id = p_actor_id or o.seller_id = p_actor_id or public.is_admin(p_actor_id)) then
    raise exception 'энэ захиалгад эрх байхгүй';
  end if;
  if o.status not in ('transferring','inspecting') then
    raise exception 'маргааныг зөвхөн шилжүүлж/шалгаж байх үед нээнэ';
  end if;
  insert into public.disputes (order_id, opened_by, reason) values (o.id, p_actor_id, p_reason) returning * into d;
  update public.orders set status = 'disputed' where id = o.id;
  return d;
end;
$$;

-- ───────────── 48 цагийн inspection timeout sweep ─────────────
create or replace function public.sweep_inspection_timeouts()
returns int language plpgsql as $$
declare r record; n int := 0; checklist_ok boolean;
begin
  for r in select id, listing_id from public.orders
           where status = 'inspecting' and inspection_ends < now() for update skip locked
  loop
    checklist_ok := public.checklist_release_ok(r.id);
    if coalesce(checklist_ok, false) then
      update public.orders set status = 'completed' where id = r.id;
      update public.listings set status = 'sold' where id = r.listing_id;
    else
      update public.orders set status = 'disputed' where id = r.id;
      insert into public.disputes (order_id, opened_by, reason)
        select r.id, o.seller_id, 'Шалгах хугацаа дуусав, checklist бүрэн биш — автомат маргаан'
        from public.orders o where o.id = r.id;
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ───────────── QPay төлбөр баталгаажуулах (idempotent, НИЙЛБЭР) ─────────────
create or replace function public.confirm_payment(
  p_order_id uuid, p_qpay_invoice_id text, p_paid_total bigint, p_payments jsonb, p_raw jsonb)
returns text language plpgsql as $$
declare o public.orders; p jsonb;
begin
  if p_payments is not null then
    for p in select value from jsonb_array_elements(p_payments) as t(value) loop
      insert into public.payment_events(order_id, qpay_payment_id, qpay_invoice_id, amount, status, raw_payload)
      values (p_order_id, p->>'payment_id', p_qpay_invoice_id,
              coalesce(nullif(p->>'amount','')::bigint, 0), coalesce(p->>'status','PAID'), p)
      on conflict (qpay_payment_id) do nothing;
    end loop;
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then return 'order_not_found'; end if;
  if o.status <> 'created' then return 'noop'; end if;

  if p_paid_total < o.amount then
    return 'underpaid';
  elsif p_paid_total > o.amount then
    update public.orders set status = 'disputed' where id = o.id;
    insert into public.disputes(order_id, opened_by, reason)
    values (o.id, o.buyer_id, 'Илүү төлбөр: ' || p_paid_total || ' > ' || o.amount || ' (автомат)');
    return 'overpaid';
  else
    update public.orders set status = 'paid',
      qpay_invoice_id = coalesce(qpay_invoice_id, p_qpay_invoice_id) where id = o.id;
    return 'paid';
  end if;
end;
$$;

-- ───────────── Админ RPC (actor_id-аар эрх шалгана) ─────────────
create or replace function public.admin_resolve_dispute(p_dispute_id uuid, p_outcome text, p_note text, p_actor_id uuid)
returns void language plpgsql as $$
declare d public.disputes;
begin
  if not public.is_admin(p_actor_id) then raise exception 'зөвхөн админ'; end if;
  if p_outcome not in ('released','refunded','rejected') then raise exception 'буруу outcome'; end if;
  perform set_config('app.actor_id', p_actor_id::text, true);

  select * into d from public.disputes where id = p_dispute_id for update;
  if not found then raise exception 'маргаан олдсонгүй'; end if;

  update public.disputes set status = p_outcome::public.dispute_status, admin_note = p_note,
    resolved_by = p_actor_id, resolved_at = now() where id = p_dispute_id;

  if p_outcome = 'released' then
    update public.orders set status = 'completed' where id = d.order_id and status = 'disputed';
    update public.listings set status = 'sold' where id = (select listing_id from public.orders where id = d.order_id);
  elsif p_outcome = 'refunded' then
    update public.orders set status = 'refunded' where id = d.order_id and status = 'disputed';
    update public.listings set status = 'active'
      where id = (select listing_id from public.orders where id = d.order_id) and status = 'reserved';
  elsif p_outcome = 'rejected' then
    -- inspecting-руу буцаахдаа 48ц-ийг ШИНЭЧИЛНЭ (эс бөгөөс sweep шууд дахин timeout болгоно)
    update public.orders set status = 'inspecting', inspection_ends = now() + interval '48 hours'
      where id = d.order_id and status = 'disputed';
  end if;
end;
$$;

create or replace function public.admin_record_payout(
  p_order_id uuid, p_method text, p_bank_account text, p_external_txn_ref text, p_actor_id uuid)
returns void language plpgsql as $$
declare o public.orders;
begin
  if not public.is_admin(p_actor_id) then raise exception 'зөвхөн админ'; end if;
  perform set_config('app.actor_id', p_actor_id::text, true);
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'захиалга олдсонгүй'; end if;
  if o.status <> 'completed' then raise exception 'зөвхөн completed захиалгад payout (одоо: %)', o.status; end if;
  if o.payout_status = 'paid_out' then raise exception 'аль хэдийн олгосон'; end if;

  insert into public.payouts(order_id, recipient_id, amount, fee_deducted, net_amount,
                             method, bank_account, external_txn_ref, status, paid_by, paid_at)
  values (o.id, o.seller_id, o.amount, o.fee, o.amount - o.fee,
          p_method, p_bank_account, p_external_txn_ref, 'paid_out', p_actor_id, now());
  update public.orders set payout_status = 'paid_out' where id = o.id;
end;
$$;

create or replace function public.admin_set_verified(p_user_id uuid, p_verified boolean, p_actor_id uuid)
returns void language plpgsql as $$
begin
  if not public.is_admin(p_actor_id) then raise exception 'зөвхөн админ'; end if;
  perform set_config('app.actor_id', p_actor_id::text, true);
  perform set_config('app.allow_trust_update', '1', true);
  update public.users set is_verified = p_verified where id = p_user_id;
  perform set_config('app.allow_trust_update', '0', true);  -- цонхыг шууд хаах (defense)
end;
$$;

-- ═══════════════════════ Boosting захиалга (services) ═══════════════════════
-- Account худалдаанаас тусдаа: winrate/rank/squad үйлчилгээ. Үнийг СЕРВЕР талд
-- lib/boost.js-ийн логикоор дахин тооцоолно (client дүнд найдахгүй).
create table if not exists public.boost_orders (
  id              uuid primary key default gen_random_uuid(),
  buyer_id        uuid not null references public.users(id) on delete restrict,
  service         text not null check (service in ('winrate','rank','squad','placement','coaching')),
  config          jsonb not null,
  matches         int not null check (matches > 0),
  amount          bigint not null check (amount > 0),
  status          text not null default 'created'
                    check (status in ('created','paid','in_progress','completed','cancelled','refunded')),
  qpay_invoice_id text,
  booster_id      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_boost_orders_buyer on public.boost_orders (buyer_id);
create unique index if not exists uq_boost_qpay_invoice
  on public.boost_orders (qpay_invoice_id) where qpay_invoice_id is not null;

do $$ begin
  create trigger set_updated_at before update on public.boost_orders
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- Boost төлбөр баталгаажуулах (idempotent — created→paid зөвхөн нэг удаа, FOR UPDATE).
create or replace function public.confirm_boost_payment(
  p_order_id uuid, p_qpay_invoice_id text, p_paid_total bigint)
returns text language plpgsql as $$
declare o public.boost_orders;
begin
  select * into o from public.boost_orders where id = p_order_id for update;
  if not found then return 'order_not_found'; end if;
  if o.status <> 'created' then return 'noop'; end if;
  if p_paid_total < o.amount then return 'underpaid'; end if;
  update public.boost_orders set status = 'paid',
    qpay_invoice_id = coalesce(qpay_invoice_id, p_qpay_invoice_id) where id = o.id;
  return 'paid';
end;
$$;

-- ═══════════════════════ Rate limiting (mutating action-ууд) ═══════════════════════
create table if not exists public.rate_events (
  id         bigserial primary key,
  bucket     text not null,        -- "<action>:<userId>"
  created_at timestamptz not null default now()
);
create index if not exists idx_rate_events_bucket on public.rate_events (bucket, created_at desc);

-- ═══════════════════════ Promo код (boost хямдрал) ═══════════════════════
create table if not exists public.promo_codes (
  code        text primary key,
  percent_off int not null check (percent_off between 1 and 90),
  active      boolean not null default true,
  expires_at  timestamptz,
  max_uses    int,
  used_count  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ═══════════════════════ Watchlist: зар зарагдвал мэдэгдэх ═══════════════════════
create or replace function public.notify_favorites_sold()
returns trigger language plpgsql as $$
begin
  if new.status = 'sold' and old.status is distinct from 'sold' then
    insert into public.notifications (user_id, type, title, body)
    select f.user_id, 'listing_sold', 'Хадгалсан зар зарагдлаа', new.title
    from public.favorites f where f.listing_id = new.id;
  end if;
  return null;
end;
$$;
do $$ begin
  create trigger trg_notify_fav_sold after update on public.listings
    for each row when (old.status is distinct from new.status)
    execute function public.notify_favorites_sold();
exception when duplicate_object then null; end $$;

-- Демо промо код (хүсвэл өөрчилнө)
insert into public.promo_codes (code, percent_off) values ('WELCOME10', 10)
on conflict (code) do nothing;

-- ═══════════════════════ Boost review (дууссан boost-ийг үнэлэх) ═══════════════════════
create table if not exists public.boost_reviews (
  id             uuid primary key default gen_random_uuid(),
  boost_order_id uuid not null unique references public.boost_orders(id) on delete cascade,
  reviewer_id    uuid not null references public.users(id) on delete restrict,
  booster_id     uuid references public.users(id) on delete set null,
  stars          int not null check (stars between 1 and 5),
  comment        text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_boost_reviews_booster on public.boost_reviews (booster_id);

-- boost_orders.service check-ийг шинэ үйлчилгээнд тааруулах (одоо байгаа хүснэгтэд)
do $$ begin
  alter table public.boost_orders drop constraint if exists boost_orders_service_check;
  alter table public.boost_orders add constraint boost_orders_service_check
    check (service in ('winrate','rank','squad','placement','coaching'));
exception when others then null; end $$;
