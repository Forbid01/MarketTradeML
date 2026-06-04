-- 0001 — Өргөтгөл ба enum төрлүүд
-- Build Plan 1.2: pgcrypto (gen_random_uuid), pg_trgm (текст хайлт), moddatetime (updated_at).

create extension if not exists pgcrypto;       -- gen_random_uuid()
create extension if not exists pg_trgm;         -- title/description trigram хайлт
create extension if not exists moddatetime schema extensions;  -- updated_at trigger

-- Escrow төлөвийн машин (Architecture §5-тэй нийцнэ)
create type public.order_status as enum (
  'created',       -- Үүссэн
  'paid',          -- Төлсөн (escrow-д хадгалагдсан)
  'transferring',  -- Шилжүүлж байна
  'inspecting',    -- Шалгаж байна (48 цагийн таймер)
  'completed',     -- Дууссан (мөнгө зарагчид олгох эрх нээгдсэн)
  'disputed',      -- Маргаантай
  'cancelled',     -- Цуцалсан (төлбөрөөс өмнө)
  'expired',       -- Хугацаа дууссан
  'refunded'       -- Буцаагдсан (мөнгө худалдан авагчид)
);

create type public.listing_status as enum (
  'draft', 'active', 'reserved', 'sold', 'hidden', 'banned'
);

create type public.dispute_status as enum (
  'open', 'refunded', 'released', 'rejected'
);

create type public.payout_status as enum (
  'pending', 'paid_out', 'refunded', 'failed'
);

create type public.notification_channel as enum (
  'sms', 'push', 'in_app', 'email'
);
