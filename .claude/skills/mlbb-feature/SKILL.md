---
name: mlbb-feature
description: Use when adding or changing a feature in THIS MLBB marketplace (Next.js 16 App Router + Neon Postgres + Auth.js v5 + Vercel Blob + QPay). Encodes the dark-cinematic design tokens, the server-layer authorization pattern that replaces RLS, the MN/EN i18n parity rule, money handling, page-transition system, hero-art/copyright policy, and the build/verify checklist. Apply it before writing data access, UI, or schema so changes stay consistent and safe.
---

# Adding a feature to the MLBB marketplace

Stack: Next.js 16 (App Router, **JavaScript**, Turbopack), React 19, Tailwind v4, Neon Postgres
(`lib/db.js`), Auth.js v5 (`auth.js`), Vercel Blob (`lib/blob.js`), QPay (`lib/qpay.js` +
`app/api/qpay/*` + `app/api/cron`). DB schema: `db/schema.sql` (apply with
`psql "$DATABASE_URL" -f db/schema.sql` — idempotent).

## 1. Authorization (CRITICAL — there is NO RLS)
The app connects to Neon as the DB owner, so the database enforces nothing. **Every** access path
must authorize in app code:
- Server actions live in `lib/actions.js` (`"use server"`). Each starts with
  `const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };` then checks ownership/role
  before mutating. NEVER trust a client-supplied actor id, price, or total — recompute money
  server-side (see `createBoostOrder` recomputing from `lib/boost.js`).
- SECURITY-style Postgres functions (`order_transition`, `set_checklist_item`, `admin_*`, …) take
  an `actor_id` param and re-check party/`is_admin(actor)` internally.
- Reads are in `lib/queries.js`; per-order reads include an intrinsic party gate (see `partyGate()`),
  not just page-level checks.
- Admin checks use the **DB** role (`is_admin(actor)` / `profile.role` from `getUserById`), not the JWT.
- Pages: `const { user, profile } = await getCurrentUser(); if (!user || !profile) redirect("/login?next=…")`.

## 2. Dark cinematic design tokens
- Page bg comes from `globals.css` body gradient (do NOT add a solid bg). Panels/cards:
  `border border-white/10 bg-white/[0.03]` (hover `hover:border-[#6D5DF6]/40`).
- Text: headings `text-slate-50`, body `text-slate-300/400`, subtle `text-slate-500`, dim icon `text-slate-600`.
- Accents: gold `#F5C451`, violet `#6D5DF6`, azure `#38BDF8`. Primary button:
  `bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] text-white hover:brightness-110`. Big numbers/titles
  use the gold→azure clip gradient; hero headline uses `.text-mythic`. Headings are UPPERCASE tracking-wide.
- Inputs: `bg-white/5 border-white/10 focus:border-[#6D5DF6] focus:ring-1 focus:ring-[#6D5DF6] placeholder:text-slate-500`.
- `StatusBadge` tones are dark (`bg-…/15 text-…-300 ring-…/30`). Icons: `components/icons.js` — **no emoji**.
- `bg-white/NN` and `border-white/NN` (translucent) are CORRECT dark classes; never reintroduce
  solid `bg-white`, `bg-slate-50/100`, `text-slate-900/700/600`, `text-blue-600`, etc.

## 3. i18n (MN + EN, must stay 1:1)
All user text goes through `t("ns.key")` from `lib/i18n/{server,client}`. Add every new key to BOTH
`mn` and `en` in `lib/i18n/dictionaries.js`. Verify parity:
```bash
node --input-type=module -e 'import {dictionaries} from "./lib/i18n/dictionaries.js";const f=(o,p="")=>Object.entries(o).flatMap(([k,v])=>v&&typeof v=="object"&&!Array.isArray(v)?f(v,p+k+"."):[p+k]);const mn=new Set(f(dictionaries.mn)),en=new Set(f(dictionaries.en));console.log(mn.size,en.size,[...mn].filter(k=>!en.has(k)),[...en].filter(k=>!mn.has(k)))'
```

## 4. Money, transitions, hero art
- Money is MNT **integers** (bigint). Display with `formatMNT(amount, locale)`; queries `Number()` bigints.
- Page transitions: `app/template.js` remounts per nav → `.page-enter` + `TransitionFX` (warrior streak).
  Always honor `prefers-reduced-motion` (handled in `globals.css`) and add no-JS fallbacks for reveal content.
- Hero/character art: **original stylized SVG** (`components/Warrior.js`) OR user-licensed images dropped in
  `public/heroes/` + listed in `lib/heroes.js`. Do NOT fetch/embed copyrighted Moonton art.

## 5. Verify before finishing
- `npm run build` is green.
- i18n parity is 1:1; grep shows no leftover light classes / emoji.
- If `db/schema.sql` changed: `psql "$DATABASE_URL" -f db/schema.sql` (idempotent) to apply to Neon.
- Dev smoke the touched routes (`/`, the new page) for HTTP 200 and no console errors.
- New env vars → add to `.env.local.example` and note they must be set on Vercel.
- Commit message ends with the project's Co-Authored-By footer.
