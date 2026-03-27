/**
 * LP Price Service — receives real-time prices pushed from Corecen LP
 * Drop-in replacement for infowayService.
 * Prices are populated externally via updatePrices() called by lpIntegration route.
 */

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
    const price = {
      bid: tick.bid,
      ask: tick.ask,
      spread: tick.spread != null ? tick.spread : parseFloat((tick.ask - tick.bid).toFixed(5)),
      mid: (tick.bid + tick.ask) / 2,
      timestamp: tick.timestamp || now,
      source: 'CORECEN_LP',
    }
    priceCache.set(tick.symbol, price)

    if (onPriceUpdateCallback) {
      onPriceUpdateCallback(tick.symbol, price)
    }
  }
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

// Compatibility shims (prices.js imports these from infowayService)
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
  SYMBOL_MAP,
  ALL_SYMBOLS,
}
