/**
 * Admin-controlled spread service.
 *
 * The live feed (Infoway) delivers RAW bid/ask with the LP's own tight spread.
 * The broker admin must be able to set THEIR OWN spread (markup) per symbol /
 * segment / globally — the same values they already configure on the
 * "Forex Charges" page (Charges collection). This service reads that config and
 * applies it to the raw feed so the displayed quotes (and therefore the trade
 * fills, since the frontend trades at the displayed price) reflect the admin's
 * spread instead of the LP's.
 *
 * Resolution priority per symbol:  INSTRUMENT  >  SEGMENT  >  GLOBAL
 * (USER / ACCOUNT_TYPE levels are intentionally NOT used here — the live feed
 *  is broadcast to everyone, so only broker-wide "house" spread applies.)
 *
 * applySpread(symbol, rawBid, rawAsk):
 *   - no admin spread configured  → returns raw bid/ask unchanged
 *   - spread configured           → mid = (bid+ask)/2; bid = mid - d/2, ask = mid + d/2
 *     where d = the admin spread converted to price units (pips/cents/usd/%).
 */

import Charges from '../models/Charges.js'
import Instrument from '../models/Instrument.js'

const REFRESH_MS = 30_000

const CRYPTO = new Set([
  'BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD', 'BCHUSD', 'BNBUSD', 'SOLUSD', 'ADAUSD',
  'DOGEUSD', 'DOTUSD', 'MATICUSD', 'AVAXUSD', 'LINKUSD', 'ICPUSD', 'TRXUSD',
  'ATOMUSD', 'XLMUSD', 'ETCUSD', 'FILUSD', 'NEARUSD', 'APTUSD', 'ARBUSD',
  'OPUSD', 'SUIUSD', 'INJUSD', 'TONUSD',
])
const METALS = new Set(['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'])
const INDICES = new Set(['US30', 'US500', 'US100', 'GER40', 'UK100', 'JP225', 'AUS200', 'FRA40', 'EU50', 'HK50'])
const ENERGY = new Set(['USOIL', 'UKOIL', 'NGAS', 'BRENT', 'WTI'])

// Categorise a symbol into the segment names the admin uses on the Charges page.
function categorize(symbol) {
  if (CRYPTO.has(symbol)) return 'Crypto'
  if (METALS.has(symbol)) return 'Metals'
  if (INDICES.has(symbol)) return 'Indices'
  if (ENERGY.has(symbol)) return 'Energy'
  return 'Forex'
}

let _cfg = { global: null, segment: {}, instrument: {} }
let _symbolSegment = {}
let _lastLoad = 0
let _loading = null

async function load() {
  try {
    const charges = await Charges.find({
      isActive: true,
      level: { $in: ['GLOBAL', 'SEGMENT', 'INSTRUMENT'] },
    }).lean()

    const next = { global: null, segment: {}, instrument: {} }
    for (const c of charges) {
      // Keep an explicit zero (spreadOverride) — dropping it here would make the
      // resolver fall through to the SEGMENT/GLOBAL entry the admin just cleared.
      if (!(c.spreadValue > 0) && !c.spreadOverride) continue
      const entry = { spreadValue: c.spreadValue, spreadType: c.spreadType || 'FIXED' }
      if (c.level === 'INSTRUMENT' && c.instrumentSymbol) next.instrument[c.instrumentSymbol] = entry
      else if (c.level === 'SEGMENT' && c.segment) next.segment[c.segment] = entry
      else if (c.level === 'GLOBAL') next.global = entry
    }
    _cfg = next

    const insts = await Instrument.find({}).select('symbol segment').lean()
    const segMap = {}
    for (const i of insts) if (i.symbol) segMap[i.symbol] = i.segment
    _symbolSegment = segMap

    _lastLoad = Date.now()
  } catch (e) {
    console.warn('[Spread] config load failed:', e.message)
  }
}

function ensureFresh() {
  if (!_loading && Date.now() - _lastLoad > REFRESH_MS) {
    _loading = load().finally(() => { _loading = null })
  }
}

// Initial load (Mongoose buffers until the connection is ready).
load()

function resolveSpread(symbol) {
  const inst = _cfg.instrument[symbol]
  if (inst) return inst
  // Match a SEGMENT-level charge against either the symbol's own DB segment or
  // our category (handles 'Metals' vs 'Commodities' naming differences).
  const dbSeg = _symbolSegment[symbol]
  const cat = categorize(symbol)
  if (dbSeg && _cfg.segment[dbSeg]) return _cfg.segment[dbSeg]
  if (_cfg.segment[cat]) return _cfg.segment[cat]
  if (_cfg.global) return _cfg.global
  return null
}

// Convert an admin spread value to a price delta (full spread, both sides).
function priceDelta(symbol, spreadValue, spreadType, rawBid, rawAsk) {
  if (!(spreadValue > 0)) return 0
  if (spreadType === 'PERCENTAGE') return Math.max(0, rawAsk - rawBid) * (spreadValue / 100)
  if (CRYPTO.has(symbol)) return spreadValue          // USD directly
  if (METALS.has(symbol)) return spreadValue * 0.01   // cents → dollars
  if (symbol.includes('JPY')) return spreadValue * 0.01
  return spreadValue * 0.0001                         // standard forex pips
}

function roundPrice(symbol, v) {
  if (symbol.includes('JPY')) return Math.round(v * 1000) / 1000
  if (CRYPTO.has(symbol) || METALS.has(symbol) || v >= 100) return Math.round(v * 100) / 100
  return Math.round(v * 100000) / 100000
}

/**
 * Apply the admin's configured spread to a raw {bid, ask}. Returns the marked-up
 * pair, or the raw pair unchanged when no spread is configured for the symbol.
 */
export function applySpread(symbol, bid, ask) {
  ensureFresh()
  if (!(bid > 0) || !(ask > 0)) return { bid, ask }
  const s = resolveSpread(symbol)
  if (!s) return { bid, ask }
  const delta = priceDelta(symbol, s.spreadValue, s.spreadType, bid, ask)
  if (!(delta > 0)) return { bid, ask }
  const mid = (bid + ask) / 2
  const half = delta / 2
  return { bid: roundPrice(symbol, mid - half), ask: roundPrice(symbol, mid + half) }
}

export function refreshSpreadConfig() { return load() }

export default { applySpread, refreshSpreadConfig }
