# MLBB Маркетплейс — Хэрэгжүүлэх дараалал (Build Plan)

> Энэ баримт нь [MLBB_Marketplace_Architecture.md](MLBB_Marketplace_Architecture.md)-ийн **дагалдах хэрэгжүүлэлтийн төлөвлөгөө**. Архитектурыг 7 чиглэлээр шинжилж (техник, төлбөр, DB, escrow, итгэлцэл/RLS, хууль, scope), веб эх сурвалжаар баримтуудыг баталгаажуулж, нэг дэс дараалсан зам болгон нэгтгэв.
>
> **Гол зарчим:** хамгийн их үр өгөөж + хамгийн бага эрсдэлийг түрүүлж тавих. Эхлээд **кодгүй эрэлт батлах**, дараа нь итгэлцлийн цөмийг (escrow + checklist + маргаан + review) **нэг дор**, QPay автоматжуулалтыг **хамгийн сүүлд**.
>
> Ганц хөгжүүлэгч хагас цагаар: нийт **~14–20 долоо хоног** (Phase 0–3).

---

## 0. Архитектурын шинжилгээ — гол дүгнэлт

Архитектур **ерөнхийдөө зөв** — Supabase + Vercel + PWA + гар escrow нь ганц хүнд бодитой сонголт. Гэхдээ шинжилгээгээр **засах ёстой 6 ноцтой цэг** гарсан:

| # | Олдсон зүйл | Бодит байдал / Засвар |
|---|---|---|
| 1 | **"Бараг тэг зардал" — буруу** | Vercel Hobby plan **арилжааг ил захиргаагаар хориглодог** (verified, vercel.com/docs). Supabase free tier 7 хоног идэвхгүй бол **зогсдог**, автомат **backup байхгүй**. → Бодит арилжаа эхлэхэд Vercel Pro (~$20) + Supabase Pro (~$25). |
| 2 | **`@mnpay/qpay` багц найдваргүй** | Багц **үнэхээр байгаа** (v0.1.9) ч маш бага ашиглалттай (~97 татан авалт/сар), sandbox дэмждэггүй, pre-1.0. → QPay-г **REST API руу шууд** нимгэн wrapper-аар холбоно. QPay developer API (OAuth2, `/v2/invoice`, callback, `/v2/payment/check`) нь баталгаажсан, бодит. |
| 3 | **transfer_checklist Moonton-ыг "unbind" хийж болно гэж АНДУУРСАН** | Moonton **master/анхдагч и-мэйл binding хэзээ ч салгагдахгүй**. Зарагч топ-ап Order ID-аар support-д хандаж аккаунтаа **эргүүлэн авах** боломжтой. FB/Google/TikTok бүгд тасарсан ч энэ нээлттэй. → checklist-д анхны и-мэйлийн **бүрэн эзэмшил** + recovery утас + secondary verification и-мэйл + 2FA reset + топ-ап баримт + зарагчийн "эргүүлэн нэхэхгүй" гарын үсэг. Эрсдэлийг нөхцөлд **ил бичих**. Бүрэн арилгах боломжгүй — зөвхөн бууруулна. |
| 4 | **Escrow race condition тооцоогүй** | 48ц таймер vs маргаан зэрэг ажиллах, хоцорсон callback захиалгыг буруугаар "paid" болгох. → Бүх төлөв шилжилтийг **нэг транзакц дотор `SELECT … FOR UPDATE` compare-and-set**; idempotency-г **`qpay_payment_id` түвшинд** `payment_events`-ээр; таймерыг **pg_cron + pg_net 5 мин sweep**-ээр. |
| 5 | **Маргаан/review-г Phase 2 руу хойшлуулсан — алдаа** | Phase 1-д бодит мөнгө хөдөлнө. **Escrow маргаангүй бол утгагүй.** → маргааны урсгал + энгийн review Phase 1-д **заавал**. Админ UI-г л Phase 2-т үлдээж, эхэндээ Supabase Studio + бичигдсэн SOP-оор гараар шийднэ. |
| 6 | **Хууль: бусдын мөнгийг өөрийн данснаар дамжуулах** | Гар escrow эрсдэлийг **бууруулдаг ч устгадаггүй**. Автомат escrow/e-money нь Монголбанкны зөвшөөрөл хөндөж болзошгүй. → эхнээс **ХХК/хувиараа аж ахуй эрхлэгч + тусдаа арилжааны данс**; зөвхөн `fee` нь орлого, `amount` бол дамжин өнгөрөх мөнгө; автоматжуулахаас өмнө Монголбанк/хуульчаас албан тодруулга. |

**RLS-ийн нэг техникийн занга:** админ эрхийг `users` хүснэгтээс шалгавал **infinite recursion** гарна → `is_admin()`-г **JWT `app_metadata`-аас** (эсвэл `SECURITY DEFINER` функцээр) шалга. Бүх **FK дээр index заавал** (индексгүй бол RLS 100x удаашрана).

---

## 1. Үе шатчилсан зам

### Phase 0 — Эрэлт батлах (кодгүй) · ~2–4 долоо хоног
Кодод цаг зарцуулахаас өмнө эрэлт + шимтгэл төлөх хүслийг бодит арилжаагаар батлах.
- [ ] FB group/танилаар **5–10 бодит арилжаа** өөрөө зуучлагчаар хий. Мөнгийг **хувийн биш, тусдаа данс** руу хүлээж авч зарагчид гараар шилжүүл (гар escrow-г бие махбодоор сур).
- [ ] Шимтгэл (5–10%) төлөх хүсэл бодит эсэхийг **тоол**.
- [ ] Шилжүүлгийн **SOP** бич: и-мэйл эзэмшил → нууц үг → recovery утас → secondary verification и-мэйл → 2FA reset → FB/Google/TikTok binding → топ-ап Order ID баримт. **Moonton master binding салгагдахгүй эрсдэлийг тэмдэглэ.**
- [ ] 1–2 маргааныг гараар шийдэж **маргааны SOP** гарга.
- [ ] **ХХК/хувиараа аж ахуй эрхлэгч бүртгэл эхлүүл** (e-Mongolia), **тусдаа арилжааны данс** нээ.
- [ ] **QPay-тэй холбогдох эхний имэйл** (гэрээ хүлээх хугацаа урт тул эрт эхлүүл) — интеграц нь Phase 3.

### Phase 0.5 — Хуулийн суурь · ~1–2 долоо хоног (Phase 0-той зэрэгцэнэ, бодит арилжааны өмнө бэлэн байх)
- [ ] **Үйлчилгээний нөхцөл**: (а) зарагдаж буй зүйл Moonton-ы өмчлөл биш "дансны хандах эрх/мэдээлэл"; (б) ToS зөрчиж бан болох disclaimer; (в) платформ **зуучлагч, тал биш**; (г) checklist-ээр хариуцлага хуваарилах; (д) нас **18+**.
- [ ] **Нууцлалын бодлого** + **Буцаалт/Маргааны журам** (нийтэд ил — Хэрэглэгчийн эрх хамгаалах хуулийн шаардлага).
- [ ] **KYC шатлал**: бага дүнд OTP, тодорхой босгоос дээш иргэний үнэмлэх (тоон босгыг FMA/хуульчаар дараа батална).
- [ ] **Бүртгэлийн зарчим**: `orders.amount` (дамжин өнгөрөх) ↔ `orders.fee` (орлого) ялгах.
- [ ] Боломжтой бол нөхцөл/disclaimer-ийг **хуульчаар нэг хянуул**.

### Phase 1 — Итгэлцлийн цөмтэй MVP · ~4–6 долоо хоног *(шахуу — 1a/1b болгож хувааж болно)*
> FB group-ээс ялгарах **цөм**. Escrow-ийн бүх аюулгүй механизмыг (RLS + checklist + маргаан + review) **нэг дор**. Төлбөр энд хараахан **ГАРААР** тэмдэглэгдэнэ (QPay биш).

**Дэд бүтэц**
- [ ] **1.1** Next.js (App Router) **JavaScript-аар** (`create-next-app --js`) + Tailwind + PWA (manifest `standalone`, apple-touch-icon, iOS "Home screen-д нэмэх" заавар). Vercel-д deploy.
- [ ] **1.2** Supabase project (эхэндээ free, туршилт). Өргөтгөл: `pgcrypto`, `pg_trgm`, `moddatetime`, `pgsodium/Vault`. Enum: `order_status('created','paid','transferring','inspecting','completed','disputed','cancelled','expired','refunded')`, `listing_status`, `dispute_status`, `payout_status`.

**Schema (дутуу боловч ЧУХАЛ хүснэгтийг ЭХНЭЭС нэм)**
- [ ] **1.3** Migration хамаарлын дарааллаар: `users → listings → listing_images`, `orders → transfer_checklist, messages, reviews, disputes`. **Нэмэлт чухал:** `payouts`, `credentials_handoff` (шифрлэсэн, **TTL + completed дараа null болгох trigger**), `payment_events` (idempotency), `notifications`, `audit_log`, `favorites`.
  - Бүгдэд `id uuid PK DEFAULT gen_random_uuid()`, `created_at/updated_at NOT NULL DEFAULT now()`, **`deleted_at` (soft-delete)**, мөнгө `bigint NOT NULL CHECK(>=0)`.
  - **`orders.payout_status` баганыг ЭНД (Phase 1-д) нэм** — review trigger (1.14) үүнд түшинэ.
- [ ] **1.4** Constraint + index: `orders.qpay_invoice_id` partial UNIQUE (WHERE NOT NULL); `payment_events.qpay_payment_id` UNIQUE; `reviews` UNIQUE(order_id); `payouts.order_id` UNIQUE; `reviews.stars CHECK 1..5`; **listing давхар зарах хамгаалалт** (идэвхтэй order-той listing-д partial unique index / status trigger — `sold→active` хориглох). Index: `listings(status, created_at DESC)`, `(server)`, `(rank)`, `(price)`, `pg_trgm GIN` on title/description, **БҮХ FK дээр B-tree**.
- [ ] **1.5** `SECURITY DEFINER` туслахууд: `current_user_id()`, `is_admin()` (**JWT `app_metadata`-аас** — recursion-аас сэргийлнэ), `is_order_party(order_id)`.
- [ ] **1.6** **RLS бүх хүснэгтэд**: `users` (өөрийгөө л засах; `is_verified/rating_avg/trades_count/role`-г trigger-ээр хамгаалах); `listings` (эзэн CRUD, бусад active унших); `orders/messages/checklist/disputes` (зөвхөн оролцогч); `credentials_handoff` (зөвхөн buyer); `payouts/audit_log` (service_role/admin). `auth.uid()`-г `(select auth.uid())`-ээр боо, `TO authenticated`.
- [ ] **1.7** Auth: Google OAuth + утасны OTP *(шийдвэр: Supabase дотоод OTP уу, MN SMS gateway уу — сонгож тэмдэглэ; SMS gateway бол `otp_codes` хүснэгт + provider зардал нэмэгдэнэ)*. Storage 2 bucket: `listing-images` (public read, эзэн л upload, MIME/хэмжээ хязгаар) + **private credentials bucket** (зөвхөн order талууд). Client дээр зураг WebP-д шах.

**Бүтээгдэхүүн**
- [ ] **1.8** Listings CRUD — **хамгийн бага талбар**: title, price, server, rank, description, зураг. *(win_rate/heroes_count/skins_count-г ХОЙШЛУУЛ.)* Grid + дэлгэрэнгүй.
- [ ] **1.9** Хайлт/шүүлт: ранк/сервер/үнэ муж + эрэмбэ (эхэндээ Postgres `ilike` + range).
- [ ] **1.10** Захиалга + **escrow state machine**: бүх шилжилтийг **нэг транзакц дотор `SELECT … FOR UPDATE` compare-and-set** хийдэг ганц цэгийн `transition(order_id, target, actor)` функц. **Зөвшөөрөгдсөн шилжилтийн матриц + guard** хатуу. Phase 1-д төлбөр **гараар** "paid".
- [ ] **1.11** **transfer_checklist UI (шинэчилсэн)**: и-мэйлийн бүрэн эзэмшил, нууц үг, recovery утас, `secondary_verification_email_transferred`, `two_fa_reset_done`, `pin_changed_by_buyer`, FB/Google/TikTok binding, `original_topup_receipts_handed_over`, `seller_signed_release`. **Moonton эрсдэлийг UI-д ил.** `inspection_ends`-ийг **`transferring→inspecting` шилжилтэд, худалдан авагч аккаунтад амжилттай нэвтэрсэн агшинд** `now()+48h` болго (зарагч мэдээлэл өгөх нь зөвхөн `transferring`, таймер асаахгүй).
- [ ] **1.12** Чат: `messages`, эхэндээ polling эсвэл Realtime + `visibilitychange` дээр REST refetch/heartbeat (iOS WebSocket тасралт нөхөх). Чухал мэдэгдэл **SMS/и-мэйлээр** (push биш үндсэн суваг).
- [ ] **1.13** **Энгийн маргаан (заавал)**: "маргаан нээх" товч `disputes`-д (зөвхөн `transferring/inspecting` үед). Phase 1-д Supabase Studio-аас `refunded/released` болгож **гараар** + Phase 0 SOP.
- [ ] **1.14** **Энгийн review (заавал)**: `completed` дараа худалдан авагч 1–5 од + сэтгэгдэл; trigger-ээр `rating_avg`, `trades_count` (зөвхөн `completed` + `payout_status='paid_out'` дээр).
- [ ] **1.15** **48ц inspection timeout — Phase 1-д ядаж энгийн хувилбар** (критик илрүүлсэн цоорхой): pg_cron sweep эсвэл гар SOP-оор `inspecting AND inspection_ends<now()` захиалгыг шийд. Эс бөгөөс захиалга `inspecting`-д **гацна**.
- [ ] **1.16** **Backup-ыг ЭНД холбо** (критик илрүүлсэн #1 алдаа): **анхны бодит мөнгөн арилжааны агшинд** Supabase Pro эсвэл `pg_dump` өдрийн cron backup. Backup-гүй мөнгөн өгөгдөл хүлээн зөвшөөрөгдөхгүй.
- [ ] **1.17** `supabase db reset`-ээр migration шалга, RLS-ийг **рол бүрээр** (anon/buyer/seller/admin) тест, **security advisor/linter** ажиллуул.

### Phase 2 — Үйлдвэрлэлд бэлэн болгох · ~2–3 долоо хоног
- [ ] **2.1** Зориулалтын **админ панель** (Studio-г орлуулна): маргаан жагсаалт, нэг товчоор refund/release (FOR UPDATE), `admin_note`, payout бүртгэх, `is_verified` олгох UI.
- [ ] **2.2** **Vercel Pro (~$20) + Supabase Pro (~$25)** — арилжааны хориг + backup эрсдэлийг арилгах *(Phase 1.16-д backup аль хэдийн эхэлсэн бол энд бүрэн болго)*.
- [ ] **2.3** Нууц түлхүүр зөвхөн server/Edge талд (`service_role`-г client-д **хэзээ ч бүү гарга**). Админд **MFA (TOTP)**.
- [ ] **2.4** `audit_log`-г бүх мэдрэмжтэй админ үйлдэлд AFTER trigger-ээр (dispute, is_verified, payout). Зөвхөн service_role бичих.
- [ ] **2.5** Escrow state machine-ийг **DB trigger-ээр** баталгаажуул: зөвшөөрөгдөөгүй шилжилт хориг; terminal төлвөөс цааш үгүй; `payouts` INSERT зөвхөн `completed`/dispute `released` үед.
- [ ] **2.6** Гар payout урсгал: `completed` = "олгох эрхтэй", `payout_status='pending'`. Админ зарагчид `payout_amount(=amount-fee)` шилжүүлсний дараа л `paid_out` + `payout_ref` + `payout_at` (2 өөр баримт).
- [ ] **2.7** `notifications`-аар төлөв/чат/payout-д SMS + in-app мэдэгдэл.

### Phase 3 — QPay интеграц · ~2–3 долоо хоног (+ гэрээ хүлээх хугацаа)
> Гар банк шилжүүлгийг QPay-ээр автоматжуулна. **Мөнгө олголт хэвээр гар хяналттай** (хуулийн эрсдэлээс).
- [ ] **3.1** QPay merchant гэрээ/данс *(эхлүүлэлтийг Phase 0-д аль хэдийн хийсэн)*. `client_id/secret/invoice_code`-ыг **sandbox БА production**-д тусад нь. `info@qpay.mn`-ээс **бичгээр**: одоогийн хураамж (~300,000₮ нэг удаа + ~1% — *баталгаажаагүй, тодруул*), API нэмэлт төлбөр, тооцоо нийлэх давтамж, **callback signature/HMAC дэмждэг эсэх**.
- [ ] **3.2** Edge Function нууц орчны хувьсагч: `QPAY_CLIENT_ID/SECRET/INVOICE_CODE`, `QPAY_BASE_URL` (dev=`merchant-sandbox.qpay.mn`, prod=`merchant.qpay.mn`/`api.qpay.mn`).
- [ ] **3.3** QPay-г **REST API руу шууд fetch**-ээр нимгэн wrapper. Token: `POST /v2/auth/token` (Basic) → `access_token` кэшлэх, дуусахад `/v2/auth/refresh`.
- [ ] **3.4** `create-invoice`: `POST /v2/invoice` (`invoice_code`, `sender_invoice_no=order.id`, `invoice_receiver_code`, `amount`, `callback_url=…?order=<id>&token=<random_secret>`). Хариунаас `qr_text/qr_image/qpay_shorturl/urls(deeplink)` → frontend. Десктоп QR, утсан дээр deeplink.
- [ ] **3.5** `qpay-callback`: эхлээд URL token шалга → callback утгад **итгэлгүйгээр** `POST /v2/payment/check` (object_type=INVOICE) сервер-сервер баталгаажуулалт → `paid_amount == orders.amount` бол л "paid".
- [ ] **3.6** Idempotency **payment_id түвшинд**: `payment_events`-д `qpay_payment_id`-ээр `INSERT … ON CONFLICT DO NOTHING`. Зөвхөн шинэ event дээр `transition(order,'paid')`. Бүгд FOR UPDATE дотор.
- [ ] **3.7** **48ц таймер бүрэн**: Supabase Cron (pg_cron + pg_net) 5 мин sweep — `inspecting AND inspection_ends<now()`-г FOR UPDATE-ээр: checklist бүрэн → `completed` + `release_eligible_at` + админд мэдэгдэх; бүрэн биш → `disputed`.
- [ ] **3.8** **Reconciliation**: callback ирэхгүй бол cron-оос `/v2/payment/check` polling. Цуцлах/хугацаа дуусгахаас **өмнө** `payment/check`-ээр PAID эсэхийг шалга (PAID бол цуцлахгүй). Бүх дуудлага лог.
- [ ] **3.9** Sandbox-д бүтэн урсгал тест (invoice→QR→callback→check→давхар callback idempotency), дараа production-д **100₮**-өөр баталгаажуул.

### Phase 4 — Өргөтгөл (эрэлт батлагдсаны дараа) · хугацаа нээлттэй
- [ ] **4.1 ХУУЛИЙН ГОЛ ЦЭГ:** хэмжээ/давтамж өсвөл Монголбанкны зохицуулалт хамаарах эсэх, лицензтэй PSP/escrow түншийг **албан ёсоор тодруул** — автомат escrow-д шилжихээс **өмнө**.
- [ ] **4.2** Хасагдсан зарын талбар (win_rate, heroes_count, skins_count) + баялаг хайлт.
- [ ] **4.3** Push notification сайжруулах, Realtime бүрэн тогтворжуулах.
- [ ] **4.4** KYC босгыг FMA/хуульчийн тоогоор хатууруулах.
- [ ] **4.5** Зөвшөөрөл бүрдвэл **автомат мөнгө олголт** (payout логик аль хэдийн бэлэн, код бараг өөрчлөгдөхгүй).
- [ ] **4.6** Бусад тоглоом руу тэлэх (PUBG Mobile, Genshin …).

---

## 2. Хамгийн эхний 7 хоногт хийх зүйл

1. FB group/танилаараа **2–3 бодит арилжаа** өөрөө зуучилж, шимтгэл (5–10%) төлөх хүслийг шууд тоол.
2. Шилжүүлгийн **SOP анхны хувилбар** бич (Moonton эргүүлэн авах эрсдэлийг тэмдэглэ).
3. **ХХК/хувиараа аж ахуй эрхлэгч бүртгэл** e-Mongolia-аар эхлүүл, **тусдаа данс** нээ.
4. **QPay-тэй холбогд** — merchant болох процесс, хураамж, sandbox эрх, гэрээ хүлээх хугацааг асуу (эрт эхлүүл).
5. Git repo + **Next.js (JS) scaffold** + Vercel-д хоосон deploy (pipeline батал).
6. Supabase project + **эхний migration ноорог** (enum + үндсэн хүснэгт + FK index + RLS + зөв `is_admin()`).
7. **Үйлчилгээний нөхцлийн ноорог** (Moonton disclaimer, зуучлагч статус, 18+).

---

## 3. Технологийн баталгаажуулсан баримтууд

- **Vercel Hobby** арилжааг ил хориглодог; commercial = Pro ($20/user/сар). *(vercel.com/docs, 2026-02)*
- **Supabase Free:** 500MB DB, 1GB storage, 500k edge invocation, 200 concurrent realtime, 50k MAU, **7 хоног идэвхгүй бол pause, backup байхгүй**. *(supabase.com/pricing)*
- **iOS PWA push** зөвхөн "Home screen-д нэмсэн" үед (iOS 16.4+), автомат install prompt байхгүй; Safari WebSocket background-д тасардаг → heartbeat/refetch.
- **Supabase Edge (Deno)** нь JavaScript-ийг бүрэн дэмжинэ → JS сонголт энд саадгүй.
- **QPay v2 API** баталгаажсан: `POST /v2/auth/token` (OAuth2 Basic), `/v2/invoice`, `/v2/payment/check`, callback_url. Invoice хариунд `qr_text/qr_image/qpay_shorturl/urls`.
- **`@mnpay/qpay`** v0.1.9 байгаа ч production-д найдваргүй → REST шууд.
- **Баталгаажаагүй (тодруулах):** QPay-ийн яг хураамж (300k/1%), callback signature, Монголбанкны лицензийн тоон босго, AML босго, 2026 татварын яг тоо.
