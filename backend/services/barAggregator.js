import PriceBar from '../models/PriceBar.js'

// ─────────────────────────────────────────────────────────────────────────────
// Bar Aggregator
//
// Converts raw Corecen LP ticks (bid/ask) into 1-minute OHLC bars and persists
// them to MongoDB. Hooked into lpPriceService.updatePrices() — every tick feeds
// this module, which:
//
//   1. Buckets the tick into a 1-minute window (UTC minute boundary, aligned
//      to the tick's own timestamp — NOT server wall clock, NOT client clock).
//   2. Maintains an in-memory "current bar" per symbol in `liveBars`.
//   3. On bucket roll-over, flushes the previous bar to Mongo and starts a new
//      one from the first tick of the new bucket.
//   4. Within the same bucket, debounces Mongo upserts to ~2s so the in-flight
//      bar is still visible to any client that refreshes mid-bucket.
//
// Also exposes backfillFromBinance(symbol) which does a one-shot fetch of the
// last 7 days of 1m bars from Binance for a crypto symbol so chart users don't
// stare at an empty chart for the first week after deploy.
// ─────────────────────────────────────────────────────────────────────────────

const BUCKET_MS = 60 * 1000 // 1-minute base bucket
const UPSERT_DEBOUNCE_MS = 2000
const BACKFILL_STALE_THRESHOLD_MS = 5 * 60 * 1000 // skip backfill if recent bar exists
const BACKFILL_DAYS = 7
const BACKFILL_INTERVAL = '1m'
const BACKFILL_LIMIT = 1000 // Binance API per-call max; we loop until we have 7 days

// liveBars[symbol] = { t, o, h, l, c, v, dirty, lastUpsertAt }
const liveBars = new Map()
// Per-symbol timer handles so debounced upserts don't pile up.
const upsertTimers = new Map()
// Backfill state — per-symbol promise to dedupe concurrent calls.
const backfillInFlight = new Map()
// Which symbols we've already backfilled this process lifetime.
const backfilledSymbols = new Set()

// Crypto symbol → Binance ticker map. Kept in sync with the frontend datafeed.
const BINANCE_SYMBOL_MAP = {
  BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', BNBUSD: 'BNBUSDT', SOLUSD: 'SOLUSDT',
  XRPUSD: 'XRPUSDT', ADAUSD: 'ADAUSDT', DOGEUSD: 'DOGEUSDT', TRXUSD: 'TRXUSDT',
  LINKUSD: 'LINKUSDT', MATICUSD: 'MATICUSDT', DOTUSD: 'DOTUSDT', SHIBUSD: 'SHIBUSDT',
  LTCUSD: 'LTCUSDT', BCHUSD: 'BCHUSDT', AVAXUSD: 'AVAXUSDT', XLMUSD: 'XLMUSDT',
  UNIUSD: 'UNIUSDT', ATOMUSD: 'ATOMUSDT', ETCUSD: 'ETCUSDT', FILUSD: 'FILUSDT',
  ICPUSD: 'ICPUSDT', VETUSD: 'VETUSDT', NEARUSD: 'NEARUSDT', GRTUSD: 'GRTUSDT',
  AAVEUSD: 'AAVEUSDT', MKRUSD: 'MKRUSDT', ALGOUSD: 'ALGOUSDT', FTMUSD: 'FTMUSDT',
  SANDUSD: 'SANDUSDT', MANAUSD: 'MANAUSDT', AXSUSD: 'AXSUSDT', THETAUSD: 'THETAUSDT',
  FLOWUSD: 'FLOWUSDT', SNXUSD: 'SNXUSDT', EOSUSD: 'EOSUSDT', CHZUSD: 'CHZUSDT',
  ENJUSD: 'ENJUSDT', PEPEUSD: 'PEPEUSDT', ARBUSD: 'ARBUSDT', OPUSD: 'OPUSDT',
  SUIUSD: 'SUIUSDT', APTUSD: 'APTUSDT', INJUSD: 'INJUSDT', TONUSD: 'TONUSDT'
}

function toBinanceSymbol(symbol) {
  const s = String(symbol || '').toUpperCase()
  if (BINANCE_SYMBOL_MAP[s]) return BINANCE_SYMBOL_MAP[s]
  // Heuristic fallback: if it ends in USD and looks like crypto (not a forex pair),
  // swap USD→USDT. Conservative list of forex 3-letter codes avoids false positives.
  if (s.length >= 6 && s.endsWith('USD')) {
    const base = s.slice(0, -3)
    const forexBases = new Set(['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'PLN', 'ZAR', 'MXN', 'TRY', 'CNH', 'XAU', 'XAG', 'XPT', 'XPD'])
    if (!forexBases.has(base)) return `${base}USDT`
  }
  return null
}

function bucketOf(tsMs) {
  return Math.floor(tsMs / BUCKET_MS) * BUCKET_MS
}

async function upsertBar(symbol, bar) {
  try {
    await PriceBar.updateOne(
      { symbol, resolution: '1', t: bar.t },
      {
        $set: {
          o: bar.o, h: bar.h, l: bar.l, c: bar.c, v: bar.v,
          src: 'lp',
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )
    bar.dirty = false
    bar.lastUpsertAt = Date.now()
  } catch (err) {
    console.error(`[barAggregator] upsert failed for ${symbol}@${bar.t}:`, err.message)
  }
}

function scheduleDebouncedUpsert(symbol, bar) {
  if (upsertTimers.has(symbol)) return
  const timer = setTimeout(async () => {
    upsertTimers.delete(symbol)
    // Re-read the live bar because the bucket may have rolled over while we waited.
    const current = liveBars.get(symbol)
    if (current && current.t === bar.t && current.dirty) {
      await upsertBar(symbol, current)
    }
  }, UPSERT_DEBOUNCE_MS)
  // Don't keep the event loop alive just for a debounce timer.
  if (typeof timer.unref === 'function') timer.unref()
  upsertTimers.set(symbol, timer)
}

/**
 * Ingest one tick into the per-symbol live bar.
 * Called from lpPriceService.updatePrices() for every incoming LP tick.
 */
export function ingestTick(symbol, bid, ask, tickTsMs) {
  if (!symbol) return
  // Coerce in case upstream JSON delivered numerics as strings.
  const bidN = Number(bid)
  const askN = Number(ask)
  if (!Number.isFinite(bidN) || !Number.isFinite(askN)) return
  if (bidN <= 0 || askN <= 0) return

  const mid = (bidN + askN) / 2
  if (!Number.isFinite(mid) || mid <= 0) return

  // Use the tick's own timestamp for bucketing so bars align to when the price
  // was actually observed on the LP, not when the server processed it.
  const ts = Number.isFinite(tickTsMs) ? tickTsMs : Date.now()
  const bucket = bucketOf(ts)

  const current = liveBars.get(symbol)

  if (!current) {
    liveBars.set(symbol, {
      t: bucket, o: mid, h: mid, l: mid, c: mid, v: 1,
      dirty: true, lastUpsertAt: 0
    })
    scheduleDebouncedUpsert(symbol, liveBars.get(symbol))
    // First time we see this symbol in this process — try to backfill its
    // history from Binance (crypto only; no-op for forex/metals/indices).
    // Fire-and-forget: the backfill dedupes and idempotently upserts.
    if (isCryptoBackfillable(symbol)) {
      backfillFromBinance(symbol).catch(() => {})
    }
    return
  }

  if (bucket > current.t) {
    // Bucket rolled over. Force-flush the completed bar immediately, then start fresh.
    // We also cancel any pending debounce timer for the stale bar so it doesn't
    // double-write the old bucket on top of the new one.
    const pending = upsertTimers.get(symbol)
    if (pending) {
      clearTimeout(pending)
      upsertTimers.delete(symbol)
    }
    // Fire-and-forget; the new bar is already live so we don't block on this.
    upsertBar(symbol, current).catch(() => {})

    const fresh = { t: bucket, o: mid, h: mid, l: mid, c: mid, v: 1, dirty: true, lastUpsertAt: 0 }
    liveBars.set(symbol, fresh)
    scheduleDebouncedUpsert(symbol, fresh)
    return
  }

  if (bucket < current.t) {
    // Out-of-order tick for a bucket that's already been superseded. Drop it.
    // This can happen if the LP buffers ticks and flushes after the bucket rolled.
    return
  }

  // Same bucket → update the running bar.
  if (mid > current.h) current.h = mid
  if (mid < current.l) current.l = mid
  current.c = mid
  current.v += 1
  current.dirty = true
  scheduleDebouncedUpsert(symbol, current)
}

/**
 * One-shot Binance backfill for a single crypto symbol. Skips if:
 *   - Symbol has no Binance equivalent (forex/metals/etc)
 *   - Symbol was already backfilled this process lifetime
 *   - Most recent stored 1m bar is fresher than 5 minutes (already have data)
 *
 * Idempotent at the row level: uses the same upsert key as live ticks, so if a
 * live bar already exists for a minute that Binance also returns, the existing
 * row wins (we only `$setOnInsert` the OHLCV from Binance).
 */
export async function backfillFromBinance(symbol) {
  const s = String(symbol || '').toUpperCase()
  if (backfilledSymbols.has(s)) return { skipped: 'already-backfilled' }

  const binSym = toBinanceSymbol(s)
  if (!binSym) return { skipped: 'no-binance-mapping' }

  if (backfillInFlight.has(s)) return backfillInFlight.get(s)

  const p = (async () => {
    try {
      // Skip if we already have recent history (e.g. backend just restarted).
      const newest = await PriceBar.findOne({ symbol: s, resolution: '1' })
        .sort({ t: -1 })
        .select('t')
        .lean()
      if (newest && Date.now() - newest.t < BACKFILL_STALE_THRESHOLD_MS) {
        backfilledSymbols.add(s)
        return { skipped: 'fresh-bars-exist' }
      }

      const endMs = Date.now()
      const startMs = endMs - BACKFILL_DAYS * 24 * 60 * 60 * 1000

      let cursor = startMs
      let totalInserted = 0
      let loopGuard = 0
      while (cursor < endMs && loopGuard < 20) {
        loopGuard++
        const url = `https://api.binance.com/api/v3/klines?symbol=${binSym}&interval=${BACKFILL_INTERVAL}&startTime=${cursor}&endTime=${endMs}&limit=${BACKFILL_LIMIT}`
        const resp = await fetch(url)
        if (!resp.ok) {
          console.warn(`[barAggregator] Binance backfill for ${s} returned ${resp.status}`)
          break
        }
        const klines = await resp.json()
        if (!Array.isArray(klines) || klines.length === 0) break

        const ops = klines.map(k => ({
          updateOne: {
            filter: { symbol: s, resolution: '1', t: k[0] },
            update: {
              $setOnInsert: {
                symbol: s, resolution: '1', t: k[0],
                o: parseFloat(k[1]),
                h: parseFloat(k[2]),
                l: parseFloat(k[3]),
                c: parseFloat(k[4]),
                v: parseFloat(k[5]),
                src: 'binance-backfill'
              },
              $set: { updatedAt: new Date() }
            },
            upsert: true
          }
        }))

        if (ops.length > 0) {
          const res = await PriceBar.bulkWrite(ops, { ordered: false })
          totalInserted += res.upsertedCount || 0
        }

        const last = klines[klines.length - 1]
        const nextCursor = last[0] + BUCKET_MS
        if (nextCursor <= cursor) break // safety
        cursor = nextCursor
        if (klines.length < BACKFILL_LIMIT) break
      }

      backfilledSymbols.add(s)
      console.log(`[barAggregator] Binance backfill complete: ${s} → +${totalInserted} new 1m bars`)
      return { inserted: totalInserted }
    } catch (err) {
      console.error(`[barAggregator] Binance backfill error for ${s}:`, err.message)
      return { error: err.message }
    } finally {
      backfillInFlight.delete(s)
    }
  })()

  backfillInFlight.set(s, p)
  return p
}

/**
 * Current in-memory live bar for a symbol, or null. Used by routes/prices.js
 * to stitch the currently-forming bar on to the historical response without
 * waiting for the next debounced upsert to hit Mongo.
 */
export function getLiveBar(symbol) {
  const s = String(symbol || '').toUpperCase()
  const bar = liveBars.get(s)
  if (!bar) return null
  return { t: bar.t, o: bar.o, h: bar.h, l: bar.l, c: bar.c, v: bar.v }
}

export function isCryptoBackfillable(symbol) {
  return toBinanceSymbol(symbol) !== null
}
