# MLBB Аккаунт Маркетплейс

Mobile Legends аккаунтыг **escrow ба итгэлцлийн хамгаалалттай** худалдан авах/зарах PWA маркетплейс.
Facebook group-ийн scam-тай орчныг зохион байгуулалттай, итгэлцэлд суурилсан болгох зорилготой.

> 📐 Архитектур: [MLBB_Marketplace_Architecture.md](MLBB_Marketplace_Architecture.md) ·
> 🗺 Бүтээх төлөвлөгөө: [MLBB_Marketplace_Build_Plan.md](MLBB_Marketplace_Build_Plan.md) ·
> 🛠 Supabase тохиргоо: [supabase/README.md](supabase/README.md)

## Технологи
- **Frontend**: Next.js 16 (App Router, **JavaScript**), React 19, Tailwind v4, PWA
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime + Edge Functions)
- **Төлбөр**: QPay v2 (OAuth2, invoice/QR, webhook) — Edge Functions
- **Hosting**: Vercel (арилжаанд Pro)

## Гол зарчим
1. **PWA эхэлнэ** — app store-ийн аккаунт зарах хоригийг тойрно.
2. **Гар escrow** — мөнгийг өөрөө барина (хуулийн эрсдэл бага). DB зөвхөн төлөв хөтөлнө.
3. **Итгэлцэл = бүтээгдэхүүн** — review, баталгаажсан тэмдэг, шилжүүлгийн шалгах жагсаалт.
4. Бизнес логик **Edge Functions + Postgres функц**-д; мөнгө/төлөв зөвхөн тэндүүр.

## Хурдан эхлэх
```bash
# 1) Хамаарал
npm install

# 2) Орчны хувьсагч
cp .env.local.example .env.local   # Supabase URL + anon key бөглө

# 3) Database (supabase/README.md үзнэ үү)
npx supabase link --project-ref <REF>
npx supabase db push

# 4) Ажиллуулах
npm run dev        # http://localhost:3000
```
> Supabase тохируулаагүй ч апп ажиллаж, нүүр хуудсанд тохиргооны заавар харуулна.

## Escrow төлөвийн урсгал
```
created ─QPay paid─▶ paid ─зарагч─▶ transferring ─худ.авагч нэвтрэв─▶ inspecting ─48ц/баталгаажуулав─▶ completed
   │                                      │                               │
 cancelled                            disputed ◀──────────────────────────┘  (refunded / completed — админ)
```
- Шилжилт бүр атомик `order_transition()` (FOR UPDATE + матриц) дотор.
- QPay төлбөр `payment_id` түвшинд idempotent (`confirm_payment`).
- Дүн зөрвөл автоматаар `disputed`.

## Бүтэц
```
app/                    # Next.js App Router (route бүр)
  page.js               # нүүр: зар grid + хайлт/шүүлт
  listings/new          # зар нэмэх (зураг WebP шахалт)
  listings/[id]         # зарын дэлгэрэнгүй + худалдаж авах
  orders, orders/[id]   # захиалга + escrow UI (checklist/чат/маргаан/review/QPay)
  admin                 # админ worklist
  notifications         # мэдэгдэл
  login, account, auth/ # нэвтрэлт
components/             # UI (EscrowActions, TransferChecklist, OrderChat, ...)
lib/                    # supabase client/server/proxy, constants, format, auth
proxy.js                # Next 16 Proxy — Supabase session refresh
supabase/migrations/    # 0001–0009 SQL (schema, RLS, функц, QPay)
supabase/functions/     # Edge Functions (create-invoice, qpay-callback, qpay-reconcile)
```

## Аюулгүй байдал (товч)
- **RLS** бүх хүснэгтэд; хэрэглэгч зөвхөн өөрийн өгөгдөл; админ `is_admin()` нь **JWT app_metadata**-аас (recursion-гүй).
- Утас зэрэг хувийн талбарыг `public_profiles` view-ээр нуудаг.
- Нэвтрэх мэдээллийг **шифрлэж** (`credentials_handoff` / private bucket) — plain text БИШ.
- `service_role` key зөвхөн server/Edge талд.

## Хэрэгжилтийн төлөв
| Phase | Агуулга | Төлөв |
|---|---|---|
| 1 | Итгэлцлийн цөмтэй MVP (escrow, checklist, чат, маргаан, review, RLS) | ✅ код |
| 2 | audit_log, DB guard, notifications, админ RPC + UI | ✅ код |
| 3 | QPay автомат төлбөр (idempotent, сервер-сервер баталгаажуулалт) | ✅ код |
| 4 | Автомат payout, KYC, тэлэлт — голдуу ops/хууль | ⏳ |

> ⚠ Код нь Supabase/QPay-ийн баримтжуулсан загварт нийцүүлж бичсэн ч **амьд орчинд
> туршаагүй**. Эхлээд sandbox/dev дээр escrow урсгал + RLS-ийг рол бүрээр шалгана уу.

## Deploy
- **Vercel**: project import → env var-уудыг тохируул (`NEXT_PUBLIC_SUPABASE_*`). Арилжаанд **Pro**.
- **Supabase**: `db push` + `functions deploy` (`verify_jwt` нь `config.toml`-д тохируулагдсан) +
  Edge secrets (`QPAY_*`, `CRON_SECRET`, `APP_ORIGIN`) + pg_cron (`inspection-sweep`, `qpay-reconcile`).
  Дэлгэрэнгүй: [supabase/README.md](supabase/README.md).
