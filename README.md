# MLBB Аккаунт Маркетплейс

Mobile Legends аккаунтыг **escrow ба итгэлцлийн хамгаалалттай** худалдан авах/зарах PWA маркетплейс.
Facebook group-ийн scam-тай орчныг зохион байгуулалттай, итгэлцэлд суурилсан болгох зорилготой.

> 📐 Архитектур: [MLBB_Marketplace_Architecture.md](MLBB_Marketplace_Architecture.md) ·
> 🗺 Бүтээх төлөвлөгөө: [MLBB_Marketplace_Build_Plan.md](MLBB_Marketplace_Build_Plan.md)

## Технологи (Vercel-төвт)
- **Frontend**: Next.js 16 (App Router, **JavaScript**), React 19, Tailwind v4, PWA
- **DB**: Neon (serverless Postgres) — escrow логик Postgres функцэд
- **Auth**: Auth.js (NextAuth v5) — Google + и-мэйл 6 оронтой код (Resend)
- **Storage**: Vercel Blob (зарын зураг)
- **Төлбөр**: QPay v2 — Next.js API route (`/api/qpay/callback`)
- **Cron**: Vercel Cron (`/api/cron`) — 48ц sweep + QPay reconcile
- **Hosting**: Vercel

## Гол зарчим
1. **PWA эхэлнэ** — app store-ийн аккаунт зарах хоригийг тойрно.
2. **Гар escrow** — мөнгийг өөрөө барина. DB зөвхөн төлөв хөтөлнө.
3. **Итгэлцэл = бүтээгдэхүүн** — review, баталгаажсан тэмдэг, шилжүүлгийн шалгах жагсаалт.
4. RLS байхгүй — эрхийн шалгалт **серверийн давхаргад** ([lib/actions.js](lib/actions.js),
   [lib/queries.js](lib/queries.js)); мөнгө/төлөвийн шилжилт зөвхөн `actor_id`-тэй Postgres функцээр.

## Хурдан эхлэх
```bash
npm install
cp .env.local.example .env.local      # DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_*, RESEND_API_KEY ...

# Neon DB schema ачаалах
psql "$DATABASE_URL" -f db/schema.sql

npm run dev                            # http://localhost:3000
```
> DB тохируулаагүй ч апп ажиллаж, browse дээр тохиргооны заавар харуулна. RESEND_API_KEY
> хоосон бол и-мэйл код **консолд** хэвлэгдэнэ (dev).

### Орчны хувьсагч
`DATABASE_URL` (Neon) · `AUTH_SECRET` · `AUTH_GOOGLE_ID/SECRET` · `RESEND_API_KEY` `EMAIL_FROM` ·
`BLOB_READ_WRITE_TOKEN` (Vercel Blob) · `NEXT_PUBLIC_SITE_URL` · QPay: `QPAY_BASE_URL`
`QPAY_CLIENT_ID/SECRET` `QPAY_INVOICE_CODE` `QPAY_CALLBACK_TOKEN` · `CRON_SECRET`. Жагсаалт:
[.env.local.example](.env.local.example).

## Escrow төлөвийн урсгал
```
created ─QPay paid─▶ paid ─зарагч─▶ transferring ─худ.авагч─▶ inspecting ─48ц/checklist─▶ completed
   │                                      │                            │
 cancelled                            disputed ◀───────────────────────┘  (refunded / completed — админ)
```
- Шилжилт бүр атомик `order_transition(order, target, actor)` дотор (FOR UPDATE + матриц).
- `inspecting → completed` нь **checklist бүрэн** үед л (буцааж авах scam-аас сэргийлнэ).
- QPay төлбөр `payment_id` түвшинд idempotent, **нийт дүнгээр** баталгаажна (`confirm_payment`).

## Бүтэц
```
app/                  # Next.js App Router (хуудас бүр server component)
  api/auth/[...nextauth]   # Auth.js handler
  api/qpay/callback        # QPay webhook (token + payment/check)
  api/cron                 # Vercel Cron: sweep + reconcile (CRON_SECRET)
  listings, orders, admin, account, notifications, favorites, login
auth.js               # Auth.js (NextAuth v5) тохиргоо
lib/db.js             # Neon client (query/queryOne/withTx)
lib/queries.js        # серверийн УНШИХ функцууд (эрх шалгалттай)
lib/actions.js        # серверийн БИЧИХ үйлдлүүд ("use server")
lib/auth.js           # getCurrentUser (session) ; lib/auth/{otp,users}.js
lib/qpay.js           # QPay v2 REST wrapper ; lib/blob.js — Vercel Blob
components/           # UI (EscrowActions, TransferChecklist, OrderChat, ...)
db/schema.sql         # Neon schema (хүснэгт, функц, trigger, index)
```

## Аюулгүй байдал (товч)
- Эрхийн шалгалт серверийн action/query бүрт (RLS-ийн оронд); escrow функц `actor_id`-аар.
- `DATABASE_URL` зөвхөн сервер тал; и-мэйл OTP код hash-лагдаж, TTL + оролдлогын хязгаартай.
- Утас/хувийн талбарыг `public_profiles` view-ээр нуудаг.
- QPay callback `?token` + сервер-сервер баталгаажуулалт; reconcile `CRON_SECRET`.

## Deploy (Vercel)
1. **Neon**: project → `DATABASE_URL` → `psql "$DATABASE_URL" -f db/schema.sql`.
2. **Vercel**: import repo → Env vars (дээрх жагсаалт) → **Vercel Blob** холбох → deploy.
3. **Auth.js**: Google OAuth redirect `https://<домэйн>/api/auth/callback/google`.
4. **Cron**: [vercel.json](vercel.json)-д `/api/cron` 5 мин тутам (CRON_SECRET-ээр хамгаалагдсан).
5. **Админ эрх**: `update public.users set role='admin' where email='...';`
