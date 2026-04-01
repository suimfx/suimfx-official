/**
 * Classify symbols for UI (digits, contract size) — no external market API.
 * Corecen/LP is the price source; this is display metadata only.
 */

const FOREX = new Set([
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 'EURGBP', 'EURJPY', 'GBPJPY',
  'EURCHF', 'EURAUD', 'EURCAD', 'GBPAUD', 'GBPCAD', 'AUDCAD', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY',
  'AUDNZD', 'CADCHF', 'GBPCHF', 'GBPNZD', 'EURNZD', 'NZDCAD', 'NZDCHF', 'AUDCHF', 'USDSGD', 'EURSGD',
  'GBPSGD', 'USDZAR', 'EURTRY', 'USDTRY', 'USDMXN', 'USDPLN', 'USDSEK', 'USDNOK', 'USDDKK', 'USDCNH',
  'EURMXN', 'EURPLN', 'EURSEK', 'EURNOK', 'GBPSEK', 'GBPNOK', 'USDHKD', 'EURHKD', 'GBPHKD', 'USDILS'
])

const METAL_PREFIXES = ['XAU', 'XAG', 'XPT', 'XPD', 'XA']
const ENERGY = new Set([
  'USOIL', 'UKOIL', 'NGAS', 'BRENT', 'WTI', 'GASOLINE', 'HEATING', 'NATGAS', 'COPPER', 'GASOLIN'
])

/** Typical crypto: 3–5 char base + USD (not a known 6-char forex pair). */
const CRYPTO_SUFFIX = /^[A-Z0-9]{2,5}USD$/

export function categorizeSymbol (symbol) {
  if (!symbol || typeof symbol !== 'string') return 'Forex'
  const s = symbol.toUpperCase().replace(/\.US$/i, '')

  if (FOREX.has(s)) return 'Forex'
  if (METAL_PREFIXES.some((p) => s.startsWith(p))) return 'Metals'
  if (ENERGY.has(s)) return 'Energy'

  // 6 uppercase letters, no digits → treat as forex cross (e.g. EURGBP)
  if (/^[A-Z]{6}$/.test(s) && !/\d/.test(s)) return 'Forex'

  if (CRYPTO_SUFFIX.test(s) && !FOREX.has(s)) return 'Crypto'

  // Short tickers often stocks (Corecen may send AAPL, MSFT, …)
  if (/^[A-Z]{1,5}$/.test(s)) return 'Stocks'

  return 'Forex'
}
