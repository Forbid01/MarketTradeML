-- 0002 — Үндсэн хүснэгтүүд
-- Build Plan 1.3: үндсэн 8 хүснэгт + дутуу боловч ЧУХАЛ хүснэгтүүд
-- (payouts, credentials_handoff, payment_events, notifications, audit_log, favorites).
-- Бүгдэд: uuid PK, created_at/updated_at, мөнгө bigint, soft-delete (deleted_at) шаардлагатайд.

-- users — Supabase auth-тай холбогдсон апп профайл
create table public.users (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid not null unique references auth.users(id) on delete cascade,
  display_name  text not null,
  phone         text,
  avatar_url    text,
  role          text not null default 'user' check (role in ('user','admin')),
  is_verified   boolean not null default false,          -- баталгаажсан зарагч тэмдэг (зөвхөн админ)
  rating_avg    numeric(3,2) not null default 0,         -- review-аас trigger-ээр тооцоологдоно
  trades_count  int not null default 0,                  -- амжилттай арилжаа (completed + paid_out)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

-- listings — зар
create table public.listings (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null references public.users(id) on delete restrict,
  title         text not null check (char_length(title) between 3 and 140),
  price         bigint not null check (price > 0),         -- ₮ (бутархайгүй, үнэгүй зар үгүй)
  server        text not null,                            -- MLBB сервер
  rank          text not null,                            -- Mythic, Legend гэх мэт
  description   text check (description is null or char_length(description) <= 4000),
  -- Phase 4-д UI-д гаргах баялаг талбарууд (MVP-д хойшлуулсан, nullable)
  level         int check (level is null or level between 0 and 1000),
  heroes_count  int check (heroes_count is null or heroes_count between 0 and 500),
  skins_count   int check (skins_count is null or skins_count between 0 and 5000),
  win_rate      numeric(5,2) check (win_rate is null or (win_rate >= 0 and win_rate <= 100)),
  status        public.listing_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

-- listing_images
create table public.listing_images (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings(id) on delete cascade,
  storage_path  text not null,                            -- listing-images bucket доторх зам
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- orders — захиалга (escrow-ийн зүрх)
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id) on delete restrict,
  buyer_id        uuid not null references public.users(id) on delete restrict,
  seller_id       uuid not null references public.users(id) on delete restrict,
  amount          bigint not null check (amount >= 0),    -- escrow-д дамжин өнгөрөх дүн
  fee             bigint not null default 0 check (fee >= 0), -- платформын орлого
  status          public.order_status not null default 'created',
  qpay_invoice_id text,
  inspection_ends timestamptz,                            -- шалгах хугацаа дуусах
  payout_status   public.payout_status not null default 'pending', -- мөнгө бодитоор олгогдсон уу
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint orders_buyer_ne_seller check (buyer_id <> seller_id),
  constraint orders_fee_le_amount   check (fee <= amount)  -- net_amount = amount - fee >= 0
);

-- transfer_checklist — "буцааж авах" scam-аас хамгаалах (ШИНЭЧИЛСЭН)
-- Moonton master/анхдагч и-мэйл binding ХЭЗЭЭ Ч салгагдахгүй тул и-мэйлийн БҮРЭН эзэмшил гол.
create table public.transfer_checklist (
  id                                        uuid primary key default gen_random_uuid(),
  order_id                                  uuid not null unique references public.orders(id) on delete cascade,
  -- и-мэйл эзэмшил (жинхэнэ хяналт — зөвхөн unbind биш)
  primary_email_ownership_transferred       boolean not null default false,
  email_password_changed_by_buyer           boolean not null default false,
  recovery_phone_changed_by_buyer           boolean not null default false,
  secondary_verification_email_transferred  boolean not null default false,
  two_fa_reset_done                         boolean not null default false,
  -- сошиал binding
  facebook_unbound                          boolean not null default false,
  google_unbound                            boolean not null default false,
  tiktok_unbound                            boolean not null default false,
  -- баримт + хууль
  original_topup_receipts_handed_over       boolean not null default false,
  seller_signed_release                     boolean not null default false,  -- "эргүүлэн нэхэхгүй"
  seller_link_cut                           boolean not null default false,
  verified_by_buyer                         boolean not null default false,
  created_at                                timestamptz not null default now(),
  updated_at                                timestamptz not null default now()
);

-- credentials_handoff — нэвтрэх мэдээллийг шифрлэж дамжуулах (plain text БИШ), TTL-тэй
create table public.credentials_handoff (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null unique references public.orders(id) on delete cascade,
  encrypted_payload     bytea,                            -- апп/Edge давхаргад шифрлэгдэнэ
  revealed_to_buyer_at  timestamptz,
  expires_at            timestamptz,
  wiped_at              timestamptz,                       -- дууссаны дараа устгасан агшин
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- payment_events — idempotency-г qpay_payment_id ТҮВШИНД барих (нэг invoice олон payment байж болно)
create table public.payment_events (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid references public.orders(id) on delete set null,
  qpay_payment_id text not null unique,                   -- давхар event-ийг чимээгүй алгасах түлхүүр
  qpay_invoice_id text,
  amount          bigint,
  status          text,
  raw_payload     jsonb,
  processed_at    timestamptz not null default now()
);

-- reviews — нэр хүнд
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null unique references public.orders(id) on delete cascade, -- нэг захиалгад нэг review
  reviewer_id  uuid not null references public.users(id) on delete restrict,
  seller_id    uuid not null references public.users(id) on delete restrict,
  stars        int not null check (stars between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now()
);

-- disputes — маргаан
create table public.disputes (
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

-- messages — захиалга тус бүрийн чат
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  sender_id    uuid not null references public.users(id) on delete restrict,
  body         text not null check (char_length(body) between 1 and 4000),
  created_at   timestamptz not null default now()
);

-- payouts — ГАР мөнгө олголтын журнал (гар escrow-ийн санхүүгийн цөм)
create table public.payouts (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null unique references public.orders(id) on delete restrict,
  recipient_id     uuid not null references public.users(id) on delete restrict,
  amount           bigint not null check (amount >= 0),   -- нийт
  fee_deducted     bigint not null default 0 check (fee_deducted >= 0),
  net_amount       bigint not null check (net_amount >= 0), -- amount - fee
  method           text,
  bank_account     text,
  external_txn_ref text,                                   -- банкны гүйлгээний дугаар
  status           public.payout_status not null default 'pending',
  paid_by          uuid references public.users(id) on delete set null, -- админ
  created_at       timestamptz not null default now(),
  paid_at          timestamptz
);

-- notifications
create table public.notifications (
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

-- audit_log — мэдрэмжтэй админ үйлдлийн бүртгэл (хууль/маргааны нотолгоо)
create table public.audit_log (
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

-- favorites — хадгалсан зар (watchlist)
create table public.favorites (
  user_id    uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
