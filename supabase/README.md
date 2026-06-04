# Supabase тохиргоо

## 1. Project үүсгэх
1. [supabase.com](https://supabase.com) дээр project үүсгэ (эхэндээ Free tier — Build Plan 1.2).
2. Project Settings → API-аас `Project URL` ба `anon`/`publishable` key-г аваад `.env.local`-д бөглө.
3. Бодит мөнгөн арилжаа эхлэхэд **Pro tier ($25)** руу шилж (backup + 7 хоногийн pause эрсдэл — Build Plan 1.16).

## 2. Migration ачаалах
```bash
# CLI суулгах (нэг удаа)
npm i -D supabase            # эсвэл: brew install supabase/tap/supabase

# Project-той холбох (Dashboard → Project ref)
npx supabase link --project-ref <PROJECT_REF>

# Schema-г ачаалах (migrations/ доторх 0001..0006)
npx supabase db push
```
Локал туршилт:
```bash
npx supabase start     # Docker шаардлагатай
npx supabase db reset  # migrations-ийг шинээр ачаална
```

## 3. Auth (Build Plan 1.7)
- **Google OAuth**: Authentication → Providers → Google идэвхжүүл, Client ID/Secret оруул.
- **Утасны OTP**: Authentication → Providers → Phone идэвхжүүл, SMS provider холбо
  (Twilio эсвэл MN SMS gateway). *Шийдвэр: Supabase дотоод OTP уу, өөрийн MN SMS gateway уу —
  сонголтоо тэмдэглэ. Custom бол `otp_codes` хүснэгт + provider зардал нэмэгдэнэ.*
- Redirect URL-д `NEXT_PUBLIC_SITE_URL/auth/callback` нэм.

## 4. Админ эрх олгох
RLS нь `is_admin()`-г JWT `app_metadata.role` дээр шалгана. Хэрэглэгчийг админ болгох:
```sql
-- Supabase Studio SQL editor (service_role)
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
where email = 'admin@example.com';
-- мөн public.users.role-г синк (UI-д харуулахад)
update public.users set role = 'admin'
where auth_id = (select id from auth.users where email = 'admin@example.com');
```
Хэрэглэгч дахин нэвтэрсний дараа шинэ JWT-д claim орно.

## 5. 48 цагийн inspection sweep (Build Plan 1.15 / 3.7)
`public.sweep_inspection_timeouts()` функц бэлэн. Phase 1-д Studio-аас гараар дуудаж болно:
```sql
select public.sweep_inspection_timeouts();
```
Phase 3-д `pg_cron`-оор автоматжуулна:
```sql
create extension if not exists pg_cron;
select cron.schedule('inspection-sweep', '*/5 * * * *',
  $$ select public.sweep_inspection_timeouts(); $$);
```

## 6. Storage
`listing-images` (public) ба `credentials` (private) bucket-ууд migration 0006-д үүснэ.
Нэвтрэх мэдээллийг `credentials` bucket / `credentials_handoff`-д **шифрлэж** (Edge Function /
service_role) хадгална — plain text БИШ.

## 7. Phase 2 ops (үйлдвэрлэлд бэлэн болгох)
- **2.2 Pro tier**: бодит мөнгөн арилжаа эхлэхэд Supabase Pro ($25) + Vercel Pro ($20)
  (эсвэл Cloudflare Pages). Free tier 7 хоног pause + backup байхгүй.
- **2.3 Аюулгүй байдал**:
  - `SUPABASE_SERVICE_ROLE_KEY`-г зөвхөн server/Edge талд — frontend-д ХЭЗЭЭ Ч бүү гарга.
  - Админ аккаунтад Supabase Auth **MFA (TOTP)** заавал асаа.
- **Backup (1.16)**: Pro дээр PITR; эсвэл `pg_dump` өдрийн cron. Анхны бодит арилжаатай нэг агшинд.
- Migration `0008` нь дараахыг нэмнэ: **audit_log trigger** (dispute/verify/payout/order
  status), **terminal guard** (эцсийн төлвөөс цааш үгүй), **payout guard** (зөвхөн completed),
  **notifications trigger** (төлөв/мессеж), админ RPC: `admin_resolve_dispute`,
  `admin_record_payout`, `admin_set_verified`.

## 8. Phase 3 — QPay (Edge Functions)
- **3.1 Merchant гэрээ**: `info@qpay.mn`-ээс `client_id`/`client_secret`/`invoice_code`-ийг
  **sandbox БА production**-д тусад нь ав. Хураамж (~300k + ~1%), callback signature
  дэмждэг эсэхийг бичгээр тодруул (баталгаажаагүй).
- **3.2 Орчны хувьсагч** (`supabase secrets set`):
  ```bash
  supabase secrets set QPAY_BASE_URL=https://merchant-sandbox.qpay.mn \
    QPAY_CLIENT_ID=... QPAY_CLIENT_SECRET=... QPAY_INVOICE_CODE=... \
    QPAY_CALLBACK_TOKEN=$(openssl rand -hex 16) \
    CRON_SECRET=$(openssl rand -hex 32) \
    APP_ORIGIN=https://<таны-домэйн>
  ```
  (`SUPABASE_URL/ANON/SERVICE_ROLE` нь автоматаар бий.)
  - `CRON_SECRET` — `qpay-reconcile`-ийг pg_cron дуудах нууц (service-role key БИШ).
  - `APP_ORIGIN` — Edge CORS-ийн зөвшөөрөгдөх origin (`*` биш).
- **Deploy** (verify_jwt нь `config.toml`-д тохируулагдсан тул нэмэлт flag шаардлагагүй):
  ```bash
  supabase functions deploy create-invoice
  supabase functions deploy qpay-callback
  supabase functions deploy qpay-reconcile
  ```
- **3.7 / 3.8 pg_cron** (5 мин тутам sweep + reconcile):
  ```sql
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
  -- inspection timeout sweep
  select cron.schedule('inspection-sweep','*/5 * * * *',
    $$ select public.sweep_inspection_timeouts(); $$);
  -- хоцорсон төлбөр барих (reconcile-ийг CRON_SECRET-ээр дуудна — service-role key БИШ)
  select cron.schedule('qpay-reconcile','*/5 * * * *', $$
    select net.http_post(
      url := '<SUPABASE_URL>/functions/v1/qpay-reconcile',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer <CRON_SECRET>'));
  $$);
  ```
  ⚠️ `qpay-reconcile` нь зөвхөн **POST**-той тул `net.http_post` ашиглана. `<CRON_SECRET>` нь
  `supabase secrets set CRON_SECRET=...`-д тавьсан утгатай ижил байх ёстой.
- **3.9 Sandbox тест**: invoice → QR/deeplink → (sandbox төлөх) → callback → `payment/check`
  → давхар callback idempotency. Дараа production-д **100₮**-өөр баталгаажуул.
- **Урсгал**: buyer `order_create` → `create-invoice` (QR) → төлнө → QPay `qpay-callback`
  → `payment/check` баталгаажуулалт → `confirm_payment` (idempotent) → `paid`.

## Migration файлууд
| Файл | Агуулга |
|---|---|
| `0001_extensions_enums` | pgcrypto, pg_trgm, moddatetime + enum төрлүүд |
| `0002_tables` | 8 үндсэн + 6 нэмэлт хүснэгт (payouts, credentials_handoff, payment_events, notifications, audit_log, favorites) |
| `0003_indexes` | хайлт/FK index, idempotency + давхар зарах unique |
| `0004_functions` | escrow `order_transition` (FOR UPDATE), `order_create`, `open_dispute`, rating/trades trigger, sweep |
| `0005_rls` | бүх хүснэгтийн RLS + `public_profiles` view |
| `0006_storage` | bucket + policy |
| `0007_realtime` | messages/notifications-ийг Realtime publication-д нэмэх |
| `0008_admin_audit_notifications` | audit_log, terminal/payout guard, notifications trigger, админ RPC (Phase 2) |
| `0009_confirm_payment` | QPay төлбөр баталгаажуулах idempotent RPC (Phase 3) |

## Edge Functions (`supabase/functions/`)
| Функц | Үүрэг | verify_jwt |
|---|---|---|
| `create-invoice` | QPay invoice үүсгэх (buyer-ийн эрх RLS-ээр), QR/deeplink буцаах | true |
| `qpay-callback` | QPay callback → `payment/check` баталгаажуулалт → `confirm_payment` | **false** |
| `qpay-reconcile` | Хоцорсон төлбөр барих (pg_cron) | **false** (service role) |
| `_shared/qpay.ts` | QPay v2 REST wrapper (token/invoice/check) | — |
