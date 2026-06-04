# MLBB Marketplace — нэмэлт санаа / roadmap

Одоо хэрэгжсэн: account escrow худалдаа, бустинг (winrate/rank/squad) calculator + QPay
захиалга, dark cinematic UI + hero animation, Auth.js (Google + и-мэйл код), admin worklist.

## 🔐 Итгэлцэл / аюулгүй байдал
- ✅ **Booster профайл + үнэлгээ** — boost review + booster-ийн дундаж үнэлгээ захиалгын хуудсанд (Phase 4).
- ✅ **Escrow бустингд** — payout_status + admin олголт бүртгэх RPC; held → явц → completed → олголт (Phase 4).
- **KYC / 2FA** админд (TOTP), их дүнтэй худалдаанд баталгаажуулалт.
- **Маргааны нотолгоо** — чат + зураг + checklist-ийн snapshot-ийг dispute-д хавсаргах.

## 🛒 Маркетплейс
- ✅ **Хайлт/шүүлт** — үнийн муж, win-rate, level, "verified only", эрэмбэ, filter chip + skeleton (Phase 2).
- **Watchlist мэдэгдэл** — хадгалсан зар үнэ буурвал/зарагдвал мэдэгдэх.
- **Зар сэргээх (bump)** + онцлох зар (paid promotion) — орлогын суваг.
- **Олон зураг + видео** listing-д; зар засах UI (одоо устгах/нуух л байгаа).

## ⚔️ Бустинг (skycoach маягаар тэлэх)
- **Илүү үйлчилгээ**: Placement/Calibration boost, Coaching (цаг тутам), Achievement boost, Hero mastery.
- ✅ **Booster хуваарилалт + явцын статус** — booster-д хуваарилах, дууссан match-ийн прогресс bar (Phase 4).
- **Live явц** — ✅ match прогресс; ⏳ booster↔buyer чат (messages одоо зөвхөн account захиалгад — boost-д өргөтгөх).
- ✅ **Урамшуулал** — олон match дээр bulk discount (10+→5%, 20+→10%, 40+→15%) + promo код.

## 📈 Өсөлт / орлого
- ~~Referral систем / Loyalty оноо~~ — **2026-06-д ХАСАВ** (шаардлагагүй гэж шийдсэн).
- **SEO**: per-listing metadata + OpenGraph зураг (одоо sitemap/robots нэмсэн).
- **Олон валют** (₮/$/₽) + ханш.

## 🛠 Ops / найдвартай байдал
- **Booster/seller payout dashboard** + автомат тооцоо.
- **Имэйл мэдэгдэл** (Resend) — захиалгын төлөв, OTP-аас гадна.
- **Rate-limit бүх mutating action-д** (одоо зөвхөн OTP-д).
- **Тест** — escrow state machine + price тооцооллын unit test; e2e (Playwright).
- **Observability** — Sentry/log, QPay reconcile-ийн алерт.

## 🎮 UX / polish
- **Realtime чат** (одоо polling) — Pusher/Ably эсвэл SSE.
- **Хэл нэмэх** — i18n систем бэлэн (одоо MN/EN); RU/EN-CN нэмж болно.
- **Skeleton/loading** бүх route-д; optimistic UI.
- **Hero showcase** — лицензтэй splash-art (`public/heroes/`), per-hero particle theme.
- **Mobile polish** — bottom-nav, haptics, PWA push notification.

> Дууссан (2026-06): analysis bug-fix-үүд, loyalty/referral хасалт, Landing wow (Phase 1),
> Browse/ListingCard (Phase 2), Зар нэмэх wizard (Phase 3), Boost escrow + явц (Phase 4).
> Дараагийн: Orders dashboard (Phase 5), boost чат, email мэдэгдэл өргөтгөх, тест.
