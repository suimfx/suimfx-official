/**
 * LP Price Service — receives real-time prices pushed from Corecen LP.
 * Prices are populated externally via updatePrices() called by lpIntegration route.
 */

import { processBidAsk } from './candleAggregator.js'
import { ingestTick } from './barAggregator.js'
import LastPrice from '../models/LastPrice.js'

const priceCache = new Map()
let onPriceUpdateCallback = null
let onConnectionChangeCallback = null

// ─── Symbol categorization ────────────────────────────────────────────────────

const METALS_SET = new Set(['XAUUSD','XAGUSD','XPTUSD','XPDUSD','XAUEUR','XAUAUD','XAUGBP','XAUCHF','XAUJPY','XAGEUR','XAUGBP','XAUCHF'])
const ENERGY_SET = new Set(['USOIL','UKOIL','NGAS','BRENT','WTI','GASOLINE','HEATING'])
const CRYPTO_BASES = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','DOT','MATIC','LTC','AVAX','LINK','SHIB','UNI','ATOM','TRX','XLM','ETC','FIL','ICP','VET','NEAR','GRT','AAVE','MKR','ALGO','FTM','SAND','MANA','AXS','THETA','XMR','FLOW','SNX','EOS','CHZ','ENJ','PEPE','ARB','OP','SUI','APT','INJ','TON','HBAR','SUSHI','COMP','YFI','ZRX','BAT','ZEC','DASH','BCH','BSV']
const FOREX_CURRENCIES = new Set(['USD','EUR','GBP','JPY','AUD','CAD','CHF','NZD','SGD','HKD','NOK','SEK','DKK','PLN','ZAR','TRY','MXN','CNH','HUF','CZK','RUB','INR'])

function categorizeSymbol(symbol) {
  if (!symbol) return 'Other'
  if (METALS_SET.has(symbol)) return 'Metals'
  if (ENERGY_SET.has(symbol)) return 'Energy'
  // Crypto check
  for (const base of CRYPTO_BASES) {
    if (symbol.startsWith(base) && (symbol.endsWith('USD') || symbol.endsWith('USDT'))) return 'Crypto'
  }
  // Forex check
  if (symbol.length >= 6) {
    const base = symbol.substring(0, 3)
    const quote = symbol.substring(3, 6)
    if (FOREX_CURRENCIES.has(base) && FOREX_CURRENCIES.has(quote)) return 'Forex'
  }
  // Stocks: short uppercase ticker with no obvious currency pair structure
  if (/^[A-Z]{1,5}$/.test(symbol)) return 'Stocks'
  return 'Other'
}

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Called by lpIntegration route when Corecen pushes price ticks.
 * Updates the cache and fires the onPriceUpdate callback for each symbol.
 */
function updatePrices(ticks) {
  const now = Date.now()
  for (const tick of ticks) {
    // Normalize tick timestamp to milliseconds. Corecen may send seconds;
    // anything < 1e12 can't possibly be a recent ms timestamp, so treat it as
    // seconds and scale up. Missing/invalid → fall back to server clock.
    let ts = Number(tick.timestamp)
    if (!Number.isFinite(ts) || ts <= 0) ts = now
    else if (ts < 1e12) ts = ts * 1000

    // Treat the LP feed as MID only — zero out the LP's (Infoway's) own spread.
    // This platform is multi-tenant: each admin sets their OWN spread for their
    // OWN users, so the shared price feed must carry NO spread. The per-user
    // spread is applied at execution (tradeEngine via Forex Charges) and on the
    // client display (each user fetches their admin's spreads).
    const mid = (Number(tick.bid) + Number(tick.ask)) / 2

    const price = {
      bid: mid,
      ask: mid,
      spread: 0,
      mid,
      timestamp: ts,
      source: 'INFOWAY',
    }
    priceCache.set(tick.symbol, price)

    // Feed the OHLC aggregator so 1m candles persist for chart history
    processBidAsk(tick.symbol, mid, mid, price.timestamp)
    ingestTick(tick.symbol, mid, mid, ts)

    if (onPriceUpdateCallback) {
      onPriceUpdateCallback(tick.symbol, price)
    }
  }
}

// Seed the in-memory cache from the last persisted prices so instruments/quotes
// still show (as last known) after a restart or while the feed is down. Must run
// after Mongoose has connected.
async function restorePrices() {
  try {
    const docs = await LastPrice.find({}).lean()
    for (const d of docs) {
      if (!(d.bid > 0) && !(d.ask > 0)) continue
      const mid = d.mid ?? d.bid ?? d.ask
      priceCache.set(d.symbol, {
        bid: mid, ask: mid, spread: 0, mid,
        timestamp: d.timestamp || 0,
        source: d.source || 'LAST_KNOWN',
        stale: true,
      })
    }
    console.log(`[LP Price Service] Restored ${priceCache.size} last-known prices from DB`)
  } catch (e) {
    console.warn('[LP Price Service] restore failed:', e.message)
  }
}

// Persist the whole cache so the next restart / outage has last-known prices.
async function persistPrices() {
  if (priceCache.size === 0) return
  const ops = []
  priceCache.forEach((p, symbol) => {
    if (!(p.mid > 0)) return
    ops.push({
      updateOne: {
        filter: { symbol },
        update: { $set: { symbol, bid: p.bid, ask: p.ask, mid: p.mid, timestamp: p.timestamp, source: p.source } },
        upsert: true,
      },
    })
  })
  if (ops.length === 0) return
  try {
    await LastPrice.bulkWrite(ops, { ordered: false })
  } catch (e) {
    console.warn('[LP Price Service] persist failed:', e.message)
  }
}

let _persistTimer = null
function startPersistence(intervalMs = 15000) {
  if (_persistTimer) return
  _persistTimer = setInterval(() => { persistPrices() }, intervalMs)
  console.log(`[LP Price Service] last-price persistence every ${intervalMs}ms`)
}

function connect() {
  console.log('[LP Price Service] Ready — waiting for Corecen price pushes on POST /api/lp/prices/batch')
  if (onConnectionChangeCallback) onConnectionChangeCallback(true)
}

function disconnect() {
  if (onConnectionChangeCallback) onConnectionChangeCallback(false)
}

function getPrice(symbol) {
  return priceCache.get(symbol) || null
}

function getAllPrices() {
  return Object.fromEntries(priceCache)
}

function getPriceCache() {
  return priceCache
}

/** No REST fallback — prices come from Corecen push only. Returns cached value or null. */
async function fetchPriceREST(symbol) {
  return priceCache.get(symbol) || null
}

/** No REST fallback — returns cached values for requested symbols. */
async function fetchBatchPricesREST(symbols) {
  const result = {}
  for (const s of symbols) {
    const p = priceCache.get(s)
    if (p) result[s] = p
  }
  return result
}

function setOnPriceUpdate(callback) {
  onPriceUpdateCallback = callback
}

function setOnConnectionChange(callback) {
  onConnectionChangeCallback = callback
}

function isWebSocketConnected() {
  return priceCache.size > 0
}

function getConnectionStatus() {
  return {
    connected: priceCache.size > 0,
    source: 'CORECEN_LP',
    priceCount: priceCache.size,
  }
}

// Compatibility shims
const SYMBOL_MAP = {}
const ALL_SYMBOLS = []

export {
  connect,
  disconnect,
  getPrice,
  getAllPrices,
  getPriceCache,
  fetchPriceREST,
  fetchBatchPricesREST,
  setOnPriceUpdate,
  setOnConnectionChange,
  isWebSocketConnected,
  getConnectionStatus,
  categorizeSymbol,
  updatePrices,
  restorePrices,
  persistPrices,
  startPersistence,
  SYMBOL_MAP,
  ALL_SYMBOLS,
}

export default {
  connect,
  disconnect,
  getPrice,
  getAllPrices,
  getPriceCache,
  fetchPriceREST,
  fetchBatchPricesREST,
  setOnPriceUpdate,
  setOnConnectionChange,
  isWebSocketConnected,
  getConnectionStatus,
  categorizeSymbol,
  updatePrices,
  restorePrices,
  persistPrices,
  startPersistence,
  SYMBOL_MAP,
  ALL_SYMBOLS,
}
