/**
 * Infoway Market-Data Feed (direct WebSocket client)
 *
 * This is the Node port of XMLiquidity's app/lp/infoway_ws.py. It connects this
 * platform DIRECTLY to Infoway (wss://data.infoway.io) using our own
 * INFOWAY_API_KEY and streams best bid/ask into the local price pipeline — the
 * same pipeline that used to depend on prices being pushed from "Corecen".
 *
 * The LP (XMLiquidity) is only used for A-Book trade execution; it does NOT
 * push a market-data feed to brokers. So each broker platform sources its own
 * data here, exactly the way TrustEdge's market-data service does.
 *
 * Wire protocol (Infoway, validated against the XM/Trustedge subscriber):
 *   Endpoint   : wss://data.infoway.io/ws?business={common|crypto}&apikey={KEY}
 *   Subscribe  : {"code":10003,"trace":"<ms>","data":{"codes":"EURUSD,XAUUSD,..."}}
 *   Heartbeat  : {"code":10010,"trace":"<ms>"}   (every 25s; server kills idle sockets)
 *   Depth push : {"code":10005,"data":{"s":"EURUSD","b":[["1.09011","..."]],
 *                                       "a":[["1.09015","..."]],"t":1716000000123}}
 *   Acks 10001/10004 and heartbeat-ack 10010 are ignored.
 *
 * Crypto and non-crypto must use SEPARATE connections (different `business`),
 * so we run one socket per business, each with its own reconnect/backoff.
 *
 * To turn the feed on: set INFOWAY_API_KEY in .env. If unset, the feed stays
 * disabled (no crash) and the platform behaves exactly as before.
 */

import WebSocket from 'ws'
import Instrument from '../models/Instrument.js'

const WS_BASE = process.env.INFOWAY_WS_URL || 'wss://data.infoway.io/ws'
const HEARTBEAT_MS = 25_000
const INITIAL_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 30_000
// Infoway answers the WS handshake with HTTP 429 when too many connections have
// been opened for the API key recently — which is exactly what a restart looks
// like, since the old process's sockets are still counted until they expire
// server-side. Its window is longer than MAX_BACKOFF_MS, so retrying at the
// normal ceiling re-trips the limit on every attempt and the socket never comes
// back (observed: the crypto feed stuck at 429 for 10+ minutes while retrying
// every 30s). Rate limits get their own, much longer cooldown.
// Flat, not escalating. An escalating version was tried on the theory that each
// attempt consumes an allowance; production disproved it. Escalation walked both
// sockets out to a 16 minute wait and the feed stayed dark for half an hour,
// while a flat 120s had recovered in ~35 seconds on the deploy before it. The
// 429 clears on its own once the previous process's connections are gone, which
// is what the shutdown handler in server.js now takes care of directly.
const RATE_LIMIT_BACKOFF_MS = 120_000

// Crypto bases (without the USD/USDT quote). Used to (a) route a symbol to the
// `crypto` business socket and (b) map our USD form to Infoway's USDT form.
const CRYPTO_BASES = new Set([
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'MATIC', 'LTC',
  'AVAX', 'LINK', 'SHIB', 'UNI', 'ATOM', 'TRX', 'XLM', 'ETC', 'FIL', 'BCH',
  'NEAR', 'APT', 'ARB', 'OP', 'SUI', 'INJ', 'TON', 'ICP', 'AAVE', 'ALGO',
])

// Sensible fallback universe so charts/quotes work even before the Instrument
// collection is seeded. Crypto symbols use our internal USD form (BTCUSD); the
// feed converts them to Infoway's USDT form on the wire.
const DEFAULT_SYMBOLS = [
  // Forex majors / minors
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'AUDJPY', 'EURAUD', 'GBPCHF',
  // Metals / energy / indices
  'XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'US30', 'US100', 'US500', 'GER40',
  // Crypto
  'BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD',
  'LTCUSD', 'DOTUSD', 'AVAXUSD', 'LINKUSD', 'MATICUSD',
]

function baseOf(sym) {
  const s = String(sym).toUpperCase()
  if (s.endsWith('USDT')) return s.slice(0, -4)
  if (s.endsWith('USD')) return s.slice(0, -3)
  return s
}

function isCrypto(sym) {
  return CRYPTO_BASES.has(baseOf(sym))
}

/** Internal symbol → Infoway form (BTCUSD → BTCUSDT). */
function toInfoway(sym) {
  const s = String(sym).toUpperCase().trim()
  if (isCrypto(s) && s.endsWith('USD') && !s.endsWith('USDT')) return s + 'T'
  return s
}

/** Infoway form → internal symbol (BTCUSDT → BTCUSD). */
function fromInfoway(sym) {
  const s = String(sym).toUpperCase().trim()
  if (s.endsWith('USDT') && s !== 'USDT') {
    const usdForm = s.slice(0, -1) // drop trailing 'T' → ...USD
    if (isCrypto(usdForm)) return usdForm
  }
  return s
}

// ─── One socket per business (common | crypto) ──────────────────────────────

class BusinessFeed {
  constructor(business, symbols, apiKey, onTicks) {
    this.business = business
    this.symbols = symbols
    this.apiKey = apiKey
    this.onTicks = onTicks
    this.backoff = INITIAL_BACKOFF_MS
    this._stopped = false
    this._ws = null
    this._hb = null
    this._rateLimited = false
  }

  start() {
    this._stopped = false
    this._connect()
  }

  stop() {
    this._stopped = true
    if (this._hb) clearInterval(this._hb)
    if (this._ws) {
      try { this._ws.close() } catch (_) { /* ignore */ }
    }
  }

  _connect() {
    const url = `${WS_BASE}?business=${this.business}&apikey=${this.apiKey}`
    let ws
    try {
      ws = new WebSocket(url)
    } catch (err) {
      console.error(`[Infoway/${this.business}] connect threw: ${err.message}`)
      return this._scheduleReconnect()
    }
    this._ws = ws

    ws.on('open', () => {
      console.log(`[Infoway/${this.business}] connected`)
      this.backoff = INITIAL_BACKOFF_MS
      this._subscribe()
      this._startHeartbeat()
    })
    ws.on('message', (data) => this._onMessage(data))
    ws.on('close', () => {
      if (this._hb) clearInterval(this._hb)
      if (!this._stopped) {
        console.warn(`[Infoway/${this.business}] connection closed — reconnecting`)
        this._scheduleReconnect()
      }
    })
    ws.on('error', (err) => {
      // 'error' is always followed by 'close'; just record + log here.
      if (/\b429\b/.test(err.message)) this._rateLimited = true
      console.warn(`[Infoway/${this.business}] socket error: ${err.message}`)
    })
  }

  _scheduleReconnect() {
    if (this._stopped) return
    const wait = this._rateLimited ? RATE_LIMIT_BACKOFF_MS : this.backoff
    if (this._rateLimited) {
      console.warn(`[Infoway/${this.business}] rate limited — backing off ${wait / 1000}s`)
    }
    this._rateLimited = false
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS)
    setTimeout(() => { if (!this._stopped) this._connect() }, wait)
  }

  _subscribe() {
    const codes = this.symbols.map(toInfoway).join(',')
    if (!codes) return
    // 10003 = depth channel. Infoway leaves the trade channel (10000) silent on
    // the standard plan — depth is the reliable source of best bid/ask.
    this._send({ code: 10003, trace: String(Date.now()), data: { codes } })
    console.log(`[Infoway/${this.business}] subscribed depth for ${this.symbols.length} symbols`)
  }

  _startHeartbeat() {
    if (this._hb) clearInterval(this._hb)
    this._hb = setInterval(() => {
      this._send({ code: 10010, trace: String(Date.now()) })
    }, HEARTBEAT_MS)
  }

  _send(obj) {
    try {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        this._ws.send(JSON.stringify(obj))
      }
    } catch (_) { /* ignore */ }
  }

  _onMessage(raw) {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch (_) {
      return
    }
    const code = msg.code
    if (code === 10005) {
      const items = this._items(msg.data)
      const ticks = []
      for (const it of items) {
        const t = this._depthTick(it)
        if (t) ticks.push(t)
      }
      if (ticks.length) this.onTicks(ticks)
    } else if (code === 10000) {
      // Some plans push trade ticks too — accept as a fallback.
      const items = this._items(msg.data)
      const ticks = []
      for (const it of items) {
        const t = this._tradeTick(it)
        if (t) ticks.push(t)
      }
      if (ticks.length) this.onTicks(ticks)
    } else if (code === 10001 || code === 10004 || code === 10010) {
      // subscribe / heartbeat acks (msg: "ok") — success, ignore silently.
    } else if (msg && msg.msg && String(msg.msg).toLowerCase() !== 'ok') {
      console.warn(`[Infoway/${this.business}] server message:`, msg)
    }
  }

  _items(data) {
    if (!data) return []
    return Array.isArray(data) ? data : [data]
  }

  _depthTick(it) {
    const symRaw = it.s
    if (!symRaw) return null
    const b = it.b || []
    const a = it.a || []
    const bl = b[0]
    const al = a[0]
    if (!bl || !al) return null
    const bid = parseFloat(bl[0])
    const ask = parseFloat(al[0])
    if (!(bid > 0) || !(ask > 0) || ask < bid) return null
    const t = (typeof it.t === 'number' && it.t > 0) ? it.t : Date.now()
    return { symbol: fromInfoway(symRaw), bid, ask, timestamp: t, source: 'INFOWAY' }
  }

  _tradeTick(it) {
    const symRaw = it.s
    if (!symRaw) return null
    const p = parseFloat(it.p)
    if (!(p > 0)) return null
    let bid = parseFloat(it.bp != null ? it.bp : it.b)
    let ask = parseFloat(it.ap != null ? it.ap : it.a)
    if (!(bid > 0) || !(ask > 0) || ask < bid) {
      const half = this.business === 'crypto' ? 0.25 : 0.00001
      bid = p - half
      ask = p + half
    }
    return { symbol: fromInfoway(symRaw), bid, ask, timestamp: Date.now(), source: 'INFOWAY' }
  }
}

async function loadSymbols() {
  try {
    const docs = await Instrument.find({}).select('symbol isActive').lean()
    const syms = docs
      .filter((d) => d.isActive !== false)
      .map((d) => d.symbol)
      .filter(Boolean)
    if (syms.length) return [...new Set(syms)]
  } catch (e) {
    console.warn(`[Infoway] symbol load from DB failed, using defaults: ${e.message}`)
  }
  return DEFAULT_SYMBOLS
}

// Coalesce window: Infoway streams many ticks/sec per symbol. Broadcasting on
// every single tick (full price-cache serialize + socket emit) overwhelms the
// server and makes quotes lag. Instead we keep only the LATEST tick per symbol
// and flush them as ONE batch this often (≈4 updates/sec — smooth for quotes,
// light on the wire). Mirrors how the old Corecen push batched at ~100ms.
const FLUSH_MS = 250

let _feeds = []
let _flushTimer = null

/**
 * Start the Infoway feed. `onTicks(ticks)` receives an array of
 * { symbol, bid, ask, timestamp, source } and should push them into the local
 * price cache / candle aggregators / socket.io broadcast.
 *
 * No-op (returns null) when INFOWAY_API_KEY is not set.
 */
export async function startInfowayFeed({ onTicks }) {
  const apiKey = (process.env.INFOWAY_API_KEY || '').trim()
  if (!apiKey) {
    console.warn('[Infoway] INFOWAY_API_KEY not set — market-data feed DISABLED')
    return null
  }
  if (typeof onTicks !== 'function') {
    console.warn('[Infoway] no onTicks sink provided — feed disabled')
    return null
  }

  const symbols = await loadSymbols()
  const cryptoSyms = symbols.filter(isCrypto)
  const commonSyms = symbols.filter((s) => !isCrypto(s))

  // Buffer keyed by symbol → keeps only the latest price per symbol per window,
  // so a symbol that ticks 50× in 250ms is broadcast once with its newest price.
  const buffer = new Map()
  const bufferTicks = (ticks) => { for (const t of ticks) buffer.set(t.symbol, t) }
  const flush = () => {
    if (!buffer.size) return
    const batch = [...buffer.values()]
    buffer.clear()
    try { onTicks(batch) } catch (e) { console.warn('[Infoway] flush sink error:', e.message) }
  }
  if (_flushTimer) clearInterval(_flushTimer)
  _flushTimer = setInterval(flush, FLUSH_MS)

  _feeds = []
  if (commonSyms.length) _feeds.push(new BusinessFeed('common', commonSyms, apiKey, bufferTicks))
  if (cryptoSyms.length) _feeds.push(new BusinessFeed('crypto', cryptoSyms, apiKey, bufferTicks))
  _feeds.forEach((f) => f.start())

  console.log(`[Infoway] feed started → ${commonSyms.length} common + ${cryptoSyms.length} crypto symbols (batched ${FLUSH_MS}ms, ${WS_BASE})`)
  return { stop: stopInfowayFeed }
}

export function stopInfowayFeed() {
  if (_flushTimer) { clearInterval(_flushTimer); _flushTimer = null }
  _feeds.forEach((f) => f.stop())
  _feeds = []
}

export default { startInfowayFeed, stopInfowayFeed }
