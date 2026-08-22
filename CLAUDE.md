# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A white-label forex/CFD trading platform. One codebase serves many broker "tenants": each Admin gets their own brand, domain, users, spreads, account types, email settings, and IB program. The platform operator (Super Admin) runs the infrastructure and takes commission.

Two apps, no monorepo tooling — `cd` into each and run npm separately.

- `backend/` — Express + Mongoose + Socket.IO, ESM (`"type": "module"`, always use `import`)
- `frontend/` — React 18 + Vite + Tailwind + react-router v6, plain JS (`.jsx`, no TypeScript)

## Commands

```bash
# Backend (from backend/)
npm install
npm run dev          # nodemon server.js
npm start            # node server.js
node scripts/createAdmin.js   # seed the first SUPER_ADMIN (edit credentials at top of file)

# Frontend (from frontend/)
npm install
npm run dev          # vite dev server on :5173
npm run build        # vite build -> frontend/dist (backend SSR reads this file, see below)
npm run preview
```

There is **no test suite and no test runner** anywhere in the repo — don't claim tests pass, and don't invent a `npm test`. `frontend`'s `lint` script calls `eslint .`, but eslint is not a dependency and there is no eslint config, so it fails; ignore it.

Local dev gotcha: the backend defaults to `PORT || 5000` while the frontend defaults to `http://localhost:5001`. Set `PORT=5001` in `backend/.env` or set `VITE_API_URL` in `frontend/.env`.

Backend env vars (all read via `process.env`, loaded by `dotenv` at the very top of `server.js` before any other import): `MONGODB_URI`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN`, `FRONTEND_URL`, `INFOWAY_API_KEY`, `INFOWAY_WS_URL`, `LP_API_URL`, `LP_API_KEY`, `LP_API_SECRET`, `CORECEN_WS_URL`, `CUSTOM_DOMAIN_TARGET_IP`, `CUSTOM_DOMAIN_CNAME_TARGET`, `DOMAIN_CHECK_RESOLVERS`. Frontend: `VITE_API_URL` only.

Production is PM2 + Nginx on a VPS — see `DEPLOYMENT.md`. Nginx must proxy HTML page requests to the backend (not serve `dist/index.html` directly) or per-tenant branding breaks; see the SSR section below.

## Multi-tenancy — read this before touching any query

`Admin` is the tenant. `Admin.role` is `SUPER_ADMIN` (platform operator) or `ADMIN` (white-label broker). Everything else hangs off that.

**Two distinct scoping patterns. Pick the right one:**

1. **User-owned data** (trades, accounts, transactions, KYC, tickets…) is scoped through `User.assignedAdmin`. Resolve via `backend/utils/adminFilter.js` (`getAdminUserIds`, `applyAdminFilter`, `canAccessUser`). Critically, **`SUPER_ADMIN` does not see everything** — it sees only users with `assignedAdmin == null` (platform-direct users). Tenants are fully isolated from each other *and* from the operator.
2. **Per-tenant config collections** (`AccountType`, `Charges`, `EmailSettings`, `PaymentMethod`, `IBPlanNew`, `IBSettings`, `Challenge`, `PropSettings`, `ManualCryptoWallet`, `AdminWallet`, `AdminLog`, `AdminDomainConnection`) carry an `adminId` field. The convention is *own row, else global fallback*: query `{ $or: [{ adminId: req.admin._id }, { adminId: null }] }`, or use a model static like `EmailSettings.getForAdmin(adminId)`. `adminId: null` rows are the platform defaults.

There is exactly **one deliberate exception** to pattern 1: `GET /api/mt5/users` returns A-Book users across *all* tenants, because the Super Admin carries the platform's hedge risk and must see the whole exposure. It is commented as such in `routes/mt5.js` — don't "fix" it back to the usual scoping.

Because of pattern 2, **never put a plain `unique` index on a name-ish field in a per-tenant config model** — one tenant naming something "Standard" would block every other tenant. Use compound `{ field, adminId }` indexes. `server.js` calls `syncIndexes()` on several models at boot specifically to drop legacy global-unique indexes; those blocks are load-bearing, not leftovers.

### Three routing keys, one tenant

`Admin.urlSlug`, `Admin.referralCode`, and `Admin.customDomain` all resolve to the same admin through three different public endpoints under `/api/admin-mgmt`. `BRANDING_DOMAIN_SYSTEM.md` is the authoritative spec for this whole subsystem (endpoints, DNS/Nginx, pitfalls table) — consult it before changing branding, signup attribution, or domain handling.

Signup attribution: `POST /api/auth/signup` accepts `adminSlug` and/or `referralCode`; either resolves to `assignedAdmin` + `adminUrlSlug` on the new `User`.

### Request-time tenant detection

A middleware in `server.js` (runs before routes) maps `req.hostname` → `req.tenantAdmin` / `req.tenantDomain` via `AdminDomainConnection` then `Admin.customDomain`, skipping localhost and `*.suimfx.com`. It depends on `app.set('trust proxy', true)` — without that, everything silently falls back to platform branding behind Nginx.

### Server-rendered branding (link previews + PWA)

`services/htmlBrandingService.js` reads `frontend/dist/index.html`, rewrites `<title>`/OG/favicon per tenant, and serves it from the `app.get('*')` fallback; `/manifest.json` is rendered per tenant the same way. This exists so WhatsApp/Telegram crawlers and the PWA install prompt show the broker's brand instead of "Suimfx". Consequences: **the backend depends on a built `frontend/dist`**, and Nginx must route HTML requests to the backend. Debug with `GET /api-health/branding` (returns the exact resolved brand for a request, bypassing crawler caches).

### Cross-origin session handoff

`localStorage` is per-origin, so logging in on `suimfx.com` and redirecting to `broker.com` would lose the token. `frontend/src/utils/wlSessionHandoff.js` base64-packs `{token, user}` into a `#wl=` URL hash; `main.jsx` calls `consumeWlSessionHandoff()` **before** `ReactDOM.createRoot(...).render()`. Keep it before render — inside a React effect is too late. `BrandingContext` builds the hash and triggers the redirect.

## Auth model

Three actor types, two token families:

- **Users** — `routes/auth.js`, JWT `{ id }`, 13d expiry. Frontend keeps `token` + `user` in localStorage.
- **Admins & Employees** — one middleware, `middleware/rbac.js#verifyAdminToken`, discriminates on the JWT payload (`employeeId` vs `adminId`/`id`). It sets `req.user`, `req.admin` (for an Employee, this is the *parent* admin — `Employee.createdBy`), `req.userType` (`SUPER_ADMIN` | `ADMIN` | `EMPLOYEE`), plus `req.permissions` or `req.sidebarPermissions`. Frontend keeps `adminToken` + `adminUser`; use `utils/adminApi.js#adminFetch`.

Authorization has two layers, both in `rbac.js`: `requireSidebarPermission(key)` checks `Admin.sidebarPermissions[key]` (all default `false` for ADMIN — Super Admin must grant them), and `requireEmployeePermission(key)` checks granular `Employee.permissions`. For employees, sidebar keys are translated to employee permissions by `checkEmployeePermissionForSidebar`. When you add an admin feature you generally need: a `PERMISSIONS.SIDEBAR.*` constant, a field in `Admin.sidebarPermissions`, a mapping entry, and a `ProtectedAdminRoute requiredPermission=` on the frontend route in `App.jsx`.

Impersonation (`routes/impersonation.js`) mints a scoped token and the frontend stashes the real one under `originalAdminToken` / `originalAdminUser` / `isImpersonating`.

## Trading system

### Price pipeline

Infoway WebSocket (`services/infowayFeed.js`) → `lpPriceService.updatePrices(ticks)` → in-memory `priceCache` Map → fan-out to `candleAggregator` (persisted 1m OHLC for chart history), `barAggregator`, and the Socket.IO `prices` room. The frontend subscribes via `services/priceStream.js` (`subscribePrices` → `priceStream` / `priceUpdate` events). Corecen LP can also push ticks into the same entry point via `POST /api/lp/prices/batch` (HMAC-authenticated in `routes/lpIntegration.js`).

**The shared feed carries no spread.** `lpPriceService` collapses every tick to MID (`bid = ask = mid`). Spread is a per-tenant broker markup applied twice, downstream: on display via `services/spreadService.js#applySpread` (resolution order INSTRUMENT > SEGMENT > GLOBAL, from the `Charges` collection, cached 30s) and at execution in `tradeEngine.calculateExecutionPrice`. Don't reintroduce a spread into the feed — it would apply the same markup to every tenant.

`Charges` is a 5-level hierarchy (`USER > INSTRUMENT > ACCOUNT_TYPE > SEGMENT > GLOBAL`) merged field-by-field, with explicit `spreadOverride` / `commissionOverride` booleans so a tenant can set a real zero rather than falling through to a broader level.

### Engines

- `services/tradeEngine.js` — the core: open/close/modify, margin, commission, swap, P&L, stop-out, SL/TP, pending orders. Balance floors at 0; any unpayable loss accumulates in `TradingAccount.unrecoveredLoss` so audits still reconcile.
- `services/propTradingEngine.js` — prop-firm challenges on `ChallengeAccount`. `Trade.tradingAccountId` is a `refPath` pointing at either `TradingAccount` or `ChallengeAccount` (`Trade.accountType`), so any query over trades must consider both.
- `services/copyTradingEngine.js` — follower trades mirror the master's fill *and* close price. Trades carry `isCopyTrade` and the SL/TP sweep deliberately skips them; letting a follower trigger its own SL/TP would diverge its P&L from the master's.
- `services/ibEngineNew.js` — multi-level introducing-broker commissions.
- `services/lpService.js` — A-Book execution against Corecen.
- `services/mt5Service.js` — A-Book execution against real MT5 accounts via MetaApi.

**A-Book vs B-Book:** `User.bookType` (`'A'` = hedged out, `'B'` = internal, default `B`). Demo accounts are forced to B at creation and are never hedged, and both `lpService` and `mt5Service` re-check that independently.

**A-Book has two venues, chosen per user.** `tradeEngine` never calls a venue directly — it calls `services/aBookRouter.js`, which sends the trade to MT5 when the user has an active `User.mt5AccountId` and to Corecen otherwise. Four hooks route through it: `openTrade`, `closeTrade`, the pending-order fill in `checkPendingOrders`, and `modifyTrade` (SL/TP, MT5 only — `lpService.updateTradeOnCorecen()` still has no caller). A trade records where it went in `aBookDestination` / `mt5AccountId`, and close reads that off the *trade*, not the user, because the user may be re-tagged while a position is open.

MetaApi specifics: `metaapi.cloud-sdk`'s ESM entry is a browser bundle that throws under Node, so `mt5Service` loads the CJS build via `createRequire`. Connections are pooled per account as *promises* — a first connect pays a 30–60s `deploy()`/`waitDeployed()`, so caching the promise (not the resolved connection) keeps two simultaneous trades from both paying it. The SDK writes a local history cache to `backend/.metaapi/`, which is gitignored.

Admin UI: `routes/bookManagement.js` + `AdminBookManagement.jsx` for A/B assignment; `routes/mt5.js` + `AdminMT5Trade.jsx` (`/admin/mt5`, Super Admin only) for MetaApi settings, MT5 accounts, and user tagging. `node scripts/mt5SelfCheck.js` asserts the symbol-mapping and lot-rounding logic — the two things that silently get every order rejected.

### Background work (all in `server.js`)

`setInterval` sweeps over `priceCache`: stop-out every 5s, pending orders every 1s, SL/TP every 1s (regular + challenge trades). Each is wrapped in a `sweepRunning` re-entrancy guard because `setInterval` doesn't await — overlapping passes previously double-closed trades and raced balance writes. Keep that guard on anything you add here. The pending-order sweep is what makes limit/stop orders fire when no browser tab is open.

`node-cron` jobs: domain DNS recheck every 5min, copy-trade commission at 23:59 UTC, swap at 22:00 UTC.

## Frontend notes

- `App.jsx` holds every route in one flat table. Tenant-branded routes are the catch-all `/:slug/login`, `/:slug/signup`, `/:slug/employee-login` and must stay last.
- `BrandingContext` (in `App.jsx`) resolves brand → applies `document.title` + favicon → redirects to the custom domain when appropriate. `ThemeContext` (in `main.jsx`, wraps `App`) pulls admin theme colors from `/api/theme/active` into CSS variables and re-polls every 30s.
- Admin pages are `AdminXxx.jsx` under `pages/` using `AdminLayout`; mobile trading has its own shell (`MobileLayout`, `MobilePageWrapper`, `MobileTradingApp.jsx`).
- `frontend/public/charting_library/` is the vendored TradingView library (`TradingViewChart.jsx` + `services/suimfxDatafeed.js` implement the UDF datafeed against `/api/prices/history` and `/api/prices/bars`).

## Dead code — don't extend

The IB system was rewritten and the old stack is orphaned: `routes/ib.js` is not mounted by `server.js` and is the only importer of `services/ibEngine.js` and `models/IBPlan.js` / `IBCommission.js`. Use `routes/ibNew.js`, `services/ibEngineNew.js`, `models/IBPlanNew.js`, `models/IBCommissionNew.js`. Likewise `backend/fix_template3.js` and `fix_template5.js` are one-off repair scripts, not part of the app.

## Conventions

- API responses are `{ success: boolean, ... }` — routes return `{ success: false, message }` on error, and the frontend checks `data.success`.
- Route files own their business logic; `services/` holds the stateful engines. Models are thin, with occasional statics/methods (`generateAccountId`, `generateTradeId`, `calculatePnl`, `EmailSettings.getForAdmin`).
- Notification emails go through `services/emailService.js#sendTemplateEmail(slug, to, vars, adminId?)`. If `adminId` is omitted it is inferred from the recipient's `assignedAdmin`, so mail automatically sends from the right broker's SMTP with the right brand name. Don't hardcode "Suimfx" in email copy — use `{{platformName}}`.
- Comments in this codebase explain *why* a non-obvious guard exists (re-entrancy, MID-only feed, copy-trade SL/TP skip, negative-balance protection). Preserve them when editing nearby code.
