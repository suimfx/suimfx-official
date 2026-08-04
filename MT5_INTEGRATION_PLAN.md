# MT5 Trade Connect (MetaApi) — Implementation Plan

> Status: **built, not yet verified against a live MT5 account**. This document is the agreed design for routing A-Book trades to real MT5 accounts via MetaApi. Read `CLAUDE.md` first for the surrounding architecture (multi-tenancy, A/B book, trade engine hooks).
>
> **Shipped:** `models/MtSettings.js`, `models/Mt5Account.js`, `services/mt5Service.js`, `services/aBookRouter.js`, `routes/mt5.js` (mounted at `/api/mt5`), the `User` / `Trade` fields, all four `tradeEngine` hooks, `scripts/mt5SelfCheck.js`, and `AdminMT5Trade.jsx` at `/admin/mt5` (Super Admin only).
>
> **Not verified:** nothing has connected to a real MetaApi account yet. `mt5SelfCheck.js` covers only the pure symbol/lot mapping; the whole `deploy → RPC → createMarketBuyOrder` path is untested until a live token exists.
>
> **Deliberately deferred** (add when a real need shows up, not before):
> - background push + the failed-sync retry sweep — the push is awaited exactly like the existing Corecen one, so a failure surfaces immediately instead of needing a queue and a status machine
> - the `snapshot` field and its 30s poll — `GET /accounts/:id/symbols` and `mt5Service.getPositions()` read live
> - stored `volumeMin` / `volumeStep` — `normalizeVolume()` assumes the universal 0.01 lot step
> - `/reconcile`, `/sync/failed`, bulk-tag

## Locked decisions

| Decision | Choice |
|---|---|
| Routing | **Per-user.** A user tagged to an MT5 account routes to MT5; every other A-Book user keeps going to Corecen via `lpService`. Both coexist. |
| Mapping | **Many users → one MT5 account**, but **one user → at most one MT5 account**. |
| Sync direction | **One-way push + read-only monitoring.** Platform stays the source of truth for price/PnL; a close on the platform closes the MT5 position. MT5 fills never overwrite the user's fill. |
| Credential scope | **Super Admin only, platform-wide.** One MetaApi token, many MT5 account IDs. |
| Symbol mapping | Discovered from MT5 at connect time (suffix auto-detect + manual override map). |
| Lot size | **1:1**, no multiplier. |
| Untag / remove with open positions | **Blocked.** Admin must close positions first. |
| SL/TP modify | **Synced to MT5.** |

## Deliberate exception: Super Admin sees all A-Book users here

`utils/adminFilter.js` scopes `SUPER_ADMIN` to users with `assignedAdmin == null` — tenants are isolated from the operator. `routes/bookManagement.js` (`GET /users`) follows that rule.

**The MT5 section deliberately breaks it**: `GET /api/mt5/users` returns A-Book users across *all* tenants. The Super Admin carries the hedge risk for the whole platform, so they must see the full exposure. This is intentional — annotate it in code so it is not "fixed" later as a data-leak bug.

## 1. Data model

### `models/MtSettings.js` — global single document

Mirrors the existing `LpSettings` pattern (`key` field, unique, one row).

```
key            'metaapi_config'   (unique)
metaApiToken   String             // never returned in full by the API — mask to ••••4f2a
region         String             // 'new-york' | 'london' | 'singapore'
enabled        Boolean
```

### `models/Mt5Account.js` — one document per connected MT5 account

```
label             String     // 'Hedge Account 1'
metaApiAccountId  String     // unique
login, server     String     // fetched from MetaApi, display only
symbolSuffix      String     // '' | '.m' | '.raw'
symbolOverrides   Map        // { XAUUSD: 'GOLD' }
volumeMin         Number     // fetched from MT5, for rounding
volumeStep        Number
isActive          Boolean
status            'DISCONNECTED' | 'DEPLOYING' | 'CONNECTED' | 'ERROR'
lastError         String
lastSyncedAt      Date
snapshot          { balance, equity, margin, freeMargin, openPositions, updatedAt }
```

### `User` — three new fields

Deliberately mirrors the existing `bookType` / `bookChangedAt` / `bookChangedBy` trio.

```
mt5AccountId   ObjectId -> Mt5Account, default null   // INDEXED
mt5TaggedAt    Date
mt5TaggedBy    ObjectId -> Admin
```

A single field on `User` gives both cardinality rules for free: one value per user (1 user → 1 MT5), many users sharing a value (many users → 1 MT5). No link collection needed.

### `Trade` — two new fields, three existing ones finally used

```
mt5AccountId      ObjectId                      // NEW — which MT5 account it went to
aBookDestination  'CORECEN' | 'MT5' | null      // NEW

aBookOrderId      // EXISTS but never written — will hold the MT5 position id
aBookExecuted     // EXISTS but never written — true once MT5 confirms the fill
lpSyncStatus      // EXISTS but never written — PENDING|PUSHED|FAILED|CLOSED|CLOSE_FAILED
```

## 2. `services/mt5Service.js`

Same public shape as `lpService` so the trade-engine call sites stay symmetric.

```
isConfigured()
getConnection(metaApiAccountId)      // lazy pool: Map<accountId, RPCConnection>
pushTrade(trade, user, mt5Account)
closeTrade(trade)
updateTrade(trade)                   // SL/TP
getAccountSnapshot(accountId)
getSymbols(accountId)
testConnection(accountId)
mapSymbol(symbol, mt5Account)        // overrides -> suffix -> symbol
_isDemoTrade(trade)                  // hard guard, copied from lpService
```

**Connection pooling is mandatory.** `deploy() → waitDeployed() → waitSynchronized()` takes 30–60s on first use. Build the connection once per account and cache it in a Map; reconnect lazily after a process restart or error. Never do this per trade.

SDK surface (`metaapi.cloud-sdk`, previously vendored at v29.3.3 — see git commit `22c791f`):

```js
const MetaApi = require('metaapi.cloud-sdk').default
const conn = await account.getRPCConnection()
await conn.createMarketBuyOrder(symbol, volume, sl, tp, { clientId: trade.tradeId })
await conn.closePosition(positionId)
await conn.modifyPosition(positionId, sl, tp)
```

Passing `clientId: trade.tradeId` is required — it is how MT5 positions are matched back to platform trades during reconciliation.

## 3. `services/aBookRouter.js` — routing in one place

```js
async function routeOpen(trade, user) {
  if (user.mt5AccountId) return mt5Service.pushTrade(trade, user, account)
  if (lpService.isConfigured()) return lpService.pushTradeToCorecen(trade, user)
  return { success: false, message: 'no A-book destination' }
}
// routeClose / routeModify follow the same shape
```

All per-user routing lives here; `tradeEngine` only calls `aBookRouter`.

### Trade engine hooks — 4 sites

| Hook | Location | Change |
|---|---|---|
| Open | `tradeEngine.openTrade()` (~L390) | `lpService.pushTradeToCorecen` → `aBookRouter.routeOpen` |
| Close | `tradeEngine.closeTrade()` (~L548) | `lpService.closeTradeOnCorecen` → `aBookRouter.routeClose` |
| Pending fill | `tradeEngine.checkPendingOrders()` (~L873) | same as Open |
| **SL/TP modify** | `tradeEngine.modifyTrade()` (~L584) | **NEW hook — no LP call exists here today** |

Also required: `openTrade` loads the user with `.select('bookType firstName email')` (~L344). **Add `mt5AccountId`** or routing can never trigger.

> Note on the modify hook: `lpService.updateTradeOnCorecen()` exists but has **no callers anywhere** — SL/TP changes are currently never synced to any LP. `routeModify` will wire this up for MT5 only. Wiring Corecen too is a one-line addition, but it changes existing behaviour, so it is deliberately left out of this scope.

### Background push instead of blocking the user

Today `openTrade` **awaits** the LP push. Corecen is a fast REST call; a MetaApi RPC round-trip is 1–3s, which would delay every MT5 user's trade open by that much.

For MT5: create the local trade immediately, push in the background, and track state in `lpSyncStatus`. To keep that honest:

- a **retry sweep** every 30s re-pushes `lpSyncStatus: 'FAILED'` trades
- the admin UI surfaces a **Failed syncs** panel so a missing hedge is never silent

Trade-off: the user gets fast execution, the hedge lands milliseconds later.

## 4. Admin UI — `AdminMT5Trade.jsx` at `/admin/mt5`

- Route guard: `<ProtectedAdminRoute requireSuperAdmin>` (same as `SuperAdminManagement`)
- Sidebar: new entry in `AdminLayout.jsx` `allMenuItems` with a `superAdminOnly: true` flag, following the existing `adminOnly` flag pattern

Tabs:

1. **Settings** — MetaApi token (masked), region, enable toggle, Test Connection
2. **MT5 Accounts** — label, login, server, status badge, balance/equity, open positions, tagged-user count. Add / Edit / Remove. A **Fetch Symbols** button pulls the live symbol list, auto-detects the suffix (e.g. seeing `EURUSD.m` suggests `.m`), and lets the override map be edited.
3. **A-Book Users** — platform-wide A-Book user list with a per-row MT5 account dropdown (or "None"). Search, filter by tagged/untagged, bulk tag.
4. **Positions & Sync** — per-account live positions vs platform-side open trades, reconciliation mismatches, failed-push retry queue.

## 5. API — `routes/mt5.js` mounted at `/api/mt5`

Every route: `verifyAdminToken` + `requireSuperAdmin`.

```
GET  /settings                 PUT  /settings
GET  /accounts                 POST /accounts
PUT  /accounts/:id             DELETE /accounts/:id
POST /accounts/:id/test
GET  /accounts/:id/symbols     GET  /accounts/:id/positions
GET  /users                    // platform-wide A-Book users (see exception above)
PUT  /users/:userId/tag        PUT  /users/bulk-tag
GET  /sync/failed              POST /sync/:tradeId/retry
GET  /reconcile
```

### Untag / delete guard

`PUT /users/:userId/tag` (to null) and `DELETE /accounts/:id` must **refuse** while exposure exists. Check platform-side first (fast): open A-Book trades with that `mt5AccountId`. Also report the MT5-side position count in the error so the admin knows what to close. Block if either is non-zero.

## 6. Background jobs (`server.js`)

- **Snapshot poll, every 30s** — refresh each active account's balance/equity/positions into `Mt5Account.snapshot`. The monitoring tab reads the snapshot, never the live SDK.
- **Failed-sync retry, every 30s** — re-push `lpSyncStatus: 'FAILED'` trades.

Both must use the `sweepRunning` re-entrancy guard pattern already established in `server.js` (~L134). MetaApi calls are slow enough that overlapping sweeps are a real risk, not a theoretical one.

## 7. Known gotchas

1. **`.metaapi/` cache dir** — the SDK writes a history cache to disk. A leftover `.metaapi/*-MetaApi-deals.bin` from the old integration is **currently committed to git** and `.metaapi` is **not in `.gitignore`**. Fix both.
2. **Volume rounding** — respect the broker's `volumeMin` / `volumeStep` (usually 0.01). The platform allows finer lots than MT5 will accept; round and validate before pushing.
3. **Demo accounts** — `mt5Service` needs its own `_isDemoTrade()` guard mirroring `lpService`. Demo volume must never reach a live MT5 account.
4. **Copy trades** — follower trades go through `openTrade`, so an A-Book, MT5-tagged follower hedges automatically. Expected, but worth knowing.
5. **Prop / challenge trades** — verified: `propTradingEngine` never touches `lpService`, so challenge trades will not reach MT5. Assumed intentional.
6. **Token handling** — `LpSettings` stores secrets in plaintext. At minimum, mask `metaApiToken` in every API response; the full token must never reach the frontend.

## 8. Build order

| Phase | Scope |
|---|---|
| 1 | Install `metaapi.cloud-sdk`; `MtSettings` + `Mt5Account` models; `mt5Service` connect / test / symbols |
| 2 | Settings + Accounts tabs — **connect the 5 real MT5 accounts and verify symbols here** |
| 3 | `User.mt5AccountId`, A-Book Users tab, tagging + untag guard |
| 4 | `aBookRouter` + the 4 trade-engine hooks + background push/retry |
| 5 | Monitoring, reconciliation, failed-sync panel |

Phase 2 is the checkpoint: real accounts must connect and report their symbol list before any trade-routing code is written.

---

# Phase B — Reverse sync (MT5 → platform)

> Status: **planned, not started.** Not needed yet — write this only when the operator actually wants MT5-side events to close client trades.

Today sync is one-way. If a position is closed on the MT5 side — manually, by its
SL/TP, or by the broker's own stop-out — the platform trade stays `OPEN` and keeps
running on platform prices. The hedge is gone and nobody is told. This phase closes
that gap.

## Mechanism: poll, not streaming

MetaApi offers a streaming connection with `onPositionRemoved` / `onDealAdded`
listeners. Skip it. It needs a second long-lived connection per account on top of
the RPC one, plus ~25 listener stubs (see the old `metaApiService.js` in git
`22c791f` for how much boilerplate that is), and it buys latency we do not need —
a hedge does not care about 10 seconds.

Poll `mt5Service.getPositions()` on a sweep instead. It already exists, it reuses
the pooled RPC connection, and the whole thing is one function.

## The sweep

Add to `server.js` next to the existing interval sweeps, with the same
`sweepRunning` re-entrancy guard (MetaApi calls are slow — overlap is certain
without it). Every 10s, per active `Mt5Account`:

1. `const live = new Set((await mt5Service.getPositions(acc.metaApiAccountId)).map(p => p.id))`
2. Load platform trades: `{ status: 'OPEN', mt5AccountId: acc._id, aBookOrderId: { $ne: null } }`
3. Any trade whose `aBookOrderId` is **not** in `live` was closed on the MT5 side
4. Close it on the platform via `tradeEngine.closeTrade(trade._id, price, price, 'MT5')`

Matching is by `aBookOrderId` (the MetaApi position id we already store at open).
No `clientId` needed — it was removed because MetaApi rejected our format, and
nothing here wants it back.

## Three guards, all load-bearing

**1. Never treat an error as "everything closed."** If `getPositions()` throws,
times out, or the account is disconnected, `live` is empty — and step 3 would then
close *every* hedged trade on that account at once. Bail out of the whole account
on any error; do not fall through with a partial or empty set. This is the single
most dangerous failure mode in this phase.

**2. Grace period on freshly pushed trades.** A position opened a second ago may
not be in `getPositions()` yet, which reads as "closed on MT5" and would
immediately close a trade that just opened. Skip trades whose `lpPushedAt` is
newer than ~60s.

**3. No echo loop.** A platform-initiated close already calls `closePosition()`.
The next sweep sees the position gone and must not close the trade a second time.
The `status: 'OPEN'` filter covers the settled case; the in-flight case needs the
close path to mark the trade before it awaits MetaApi, or a short skip window on
`lpClosedAt`.

## Model changes

- `Trade.closedBy` enum: add `'MT5'` (currently `USER | SL | TP | STOP_OUT | ADMIN | null`)
- Nothing else. `aBookOrderId` and `mt5AccountId` already carry the link.

## Open decisions — ask before building

**a) What close price does the client get?**
- **(i) MT5's actual fill** — fetch the closing deal (`getDealsByPosition`) and pass
  that price to `closeTrade`. Book and hedge agree exactly, which is the entire
  point of A-book. Costs one extra call per closed position.
- **(ii) Current platform price** — simpler, consistent with "platform is the source
  of truth", but the client's P&L and the hedge's P&L drift apart on every
  MT5-side close. Recommend (i).

**b) Partial closes on MT5.** If someone closes 0.05 of a 0.10 lot position, the
position survives with a smaller volume. The platform has no partial-close concept
for a single trade. Options: ignore volume drift and only act on full disappearance
(lazy, recommended to start), or flag it in the reconciliation view for manual
handling.

**c) Positions on the hedge account that we did not open** (someone traded the MT5
account by hand). Recommend: never act on them, only surface them in the
reconciliation view — closing something the platform does not own is worse than
leaving it.

## Build order

| Step | Scope |
|---|---|
| 1 | `closedBy: 'MT5'`, the sweep with all three guards, close at current price |
| 2 | Switch to MT5's actual fill price if decision (a) lands on (i) |
| 3 | Surface drift (partial closes, unknown positions) in the reconciliation view |

Step 1 alone removes the silent-unhedged-position problem, which is the whole
reason to build this.
