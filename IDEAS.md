# MLBB Marketplace — нэмэлт санаа / roadmap

Одоо хэрэгжсэн: account escrow худалдаа, бустинг (winrate/rank/squad) calculator + QPay
захиалга, dark cinematic UI + hero animation, Auth.js (Google + и-мэйл код), admin worklist.

## 🔐 Итгэлцэл / аюулгүй байдал
- **Booster профайл + үнэлгээ** — бустинг захиалга дуусахад худалдан авагч boost-г үнэлдэг (одоо review зөвхөн account-д).
- **Escrow бустингд** — boost төлбөрийг hold хийж, match дууссаны дараа boost-erт олгох (одоогийн created→paid-ийг in_progress→completed болгож, payout нэмэх).
- **KYC / 2FA** админд (TOTP), их дүнтэй худалдаанд баталгаажуулалт.
- **Маргааны нотолгоо** — чат + зураг + checklist-ийн snapshot-ийг dispute-д хавсаргах.

## 🛒 Маркетплейс
- **Хайлт/шүүлт сайжруулах** — үнийн муж, win-rate, скин тоо, "verified only", эрэмбэ.
- **Watchlist мэдэгдэл** — хадгалсан зар үнэ буурвал/зарагдвал мэдэгдэх.
- **Зар сэргээх (bump)** + онцлох зар (paid promotion) — орлогын суваг.
- **Олон зураг + видео** listing-д; зар засах UI (одоо устгах/нуух л байгаа).

## ⚔️ Бустинг (skycoach маягаар тэлэх)
- **Илүү үйлчилгээ**: Placement/Calibration boost, Coaching (цаг тутам), Achievement boost, Hero mastery.
- **Booster хуваарилалт** — админ/booster захиалга авах самбар, явцын статус (in_progress %, дууссан match).
- **Live явц** — захиалгын хуудсанд match-ийн прогресс, booster-тэй чат.
- **Урамшуулал** — олон match дээр хямдрал (bulk discount), promo код.

## 📈 Өсөлт / орлого
- **Referral** систем (урих → бонус).
- **Loyalty / coin** — арилжаа бүрд оноо.
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

> Дараагийн хамгийн өндөр ач холбогдолтой: (1) бустингийн escrow + booster явц, (2) listing
> хайлт/мэдэгдэл, (3) email мэдэгдэл + rate-limit. Аль нэгийг хэлвэл хийж эхэлнэ.
