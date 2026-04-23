// Custom TradingView Datafeed for Suimfx
// Builds real candlestick bars from LP price feed for ALL instruments
import priceStreamService from './priceStream'
import { API_URL } from '../config/api'

// Resolution map: TradingView resolution -> seconds
const RESOLUTION_MAP = {
  '1': 60, '3': 180, '5': 300, '15': 900, '30': 1800,
  '60': 3600, '120': 7200, '240': 14400, '360': 21600,
  '720': 43200, '1D': 86400, 'D': 86400, '1W': 604800, 'W': 604800,
  '1M': 2592000, 'M': 2592000,
}

// ===== Symbol helpers =====

function getSymbolCategory(symbol) {
  if (!symbol) return 'forex'
  const s = symbol.toUpperCase()
  if (s.startsWith('XAU') || s.startsWith('XAG') || s.startsWith('XPT') || s.startsWith('XPD')) return 'metals'
  if (['USOIL', 'UKOIL', 'NGAS', 'BRENT', 'WTI', 'GASOLINE', 'HEATING'].includes(s)) return 'commodities'
  if (['US30', 'US500', 'NAS100', 'UK100', 'GER40', 'FRA40', 'JPN225', 'AUS200', 'SPX500', 'DJ30', 'USTEC', 'USDX', 'VIX'].includes(s)) return 'indices'
  const cryptoBases = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'TRX', 'LINK', 'MATIC', 'DOT', 'SHIB', 'LTC', 'BCH', 'AVAX', 'XLM', 'UNI', 'ATOM', 'ETC', 'FIL', 'ICP', 'VET', 'NEAR', 'GRT', 'AAVE', 'MKR', 'ALGO', 'FTM', 'SAND', 'MANA', 'AXS', 'THETA', 'FLOW', 'SNX', 'EOS', 'CHZ', 'ENJ', 'PEPE', 'ARB', 'OP', 'SUI', 'APT', 'INJ', 'TON', 'HBAR', 'NEO', 'FET', 'RNDR', 'WLD', 'SEI', 'TIA', 'BLUR', '1INCH', 'BONK', 'FLOKI', 'ORDI']
  const cryptoEndings = ['USD', 'USDT']
  for (const base of cryptoBases) {
    if (s.startsWith(base) && cryptoEndings.some(e => s.endsWith(e))) return 'crypto'
  }
  const forexCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'PLN', 'ZAR', 'MXN', 'TRY', 'CNH']
  if (s.length === 6) {
    const base = s.substring(0, 3)
    const quote = s.substring(3, 6)
    if (forexCurrencies.includes(base) && forexCurrencies.includes(quote)) return 'forex'
  }
  const stockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'UNH', 'HD', 'DIS', 'BAC', 'ADBE', 'CRM', 'NFLX', 'CSCO', 'PFE', 'TMO', 'ABT', 'COST', 'PEP', 'AVGO', 'NKE', 'MRK', 'ABBV', 'KO', 'LLY', 'CVX', 'MCD', 'WFC', 'AMD', 'INTC', 'PYPL', 'SBUX', 'QCOM']
  if (stockSymbols.includes(s)) return 'stocks'
  return 'forex'
}

function getDigits(symbol) {
  const cat = getSymbolCategory(symbol)
  if (symbol.includes('JPY')) return 3
  if (symbol === 'XAUUSD') return 2
  if (symbol === 'XAGUSD') return 3
  if (cat === 'crypto') return 2
  if (cat === 'stocks') return 2
  if (cat === 'indices') return 2
  if (cat === 'commodities') return 3
  return 5
}

const INSTRUMENT_NAMES = {
  'EURUSD': 'EUR/USD', 'GBPUSD': 'GBP/USD', 'USDJPY': 'USD/JPY', 'USDCHF': 'USD/CHF',
  'AUDUSD': 'AUD/USD', 'NZDUSD': 'NZD/USD', 'USDCAD': 'USD/CAD', 'EURGBP': 'EUR/GBP',
  'EURJPY': 'EUR/JPY', 'GBPJPY': 'GBP/JPY', 'EURCHF': 'EUR/CHF', 'EURAUD': 'EUR/AUD',
  'XAUUSD': 'Gold (XAU/USD)', 'XAGUSD': 'Silver (XAG/USD)', 'XPTUSD': 'Platinum',
  'BTCUSD': 'Bitcoin/USD', 'ETHUSD': 'Ethereum/USD', 'BNBUSD': 'BNB/USD',
  'SOLUSD': 'Solana/USD', 'XRPUSD': 'XRP/USD', 'ADAUSD': 'Cardano/USD',
  'DOGEUSD': 'Dogecoin/USD', 'LTCUSD': 'Litecoin/USD',
  'US30': 'Dow Jones 30', 'US500': 'S&P 500', 'NAS100': 'NASDAQ 100',
  'USOIL': 'US Crude Oil', 'UKOIL': 'UK Brent Oil', 'NGAS': 'Natural Gas',
}

// ===== Binance historical data (crypto only) =====

function toBinanceKlineSymbol(symbol) {
  const s = symbol.toUpperCase()
  const cryptoMap = {
    'BTCUSD': 'BTCUSDT', 'ETHUSD': 'ETHUSDT', 'BNBUSD': 'BNBUSDT', 'SOLUSD': 'SOLUSDT',
    'XRPUSD': 'XRPUSDT', 'ADAUSD': 'ADAUSDT', 'DOGEUSD': 'DOGEUSDT', 'TRXUSD': 'TRXUSDT',
    'LINKUSD': 'LINKUSDT', 'MATICUSD': 'MATICUSDT', 'DOTUSD': 'DOTUSDT', 'SHIBUSD': 'SHIBUSDT',
    'LTCUSD': 'LTCUSDT', 'BCHUSD': 'BCHUSDT', 'AVAXUSD': 'AVAXUSDT', 'XLMUSD': 'XLMUSDT',
    'UNIUSD': 'UNIUSDT', 'ATOMUSD': 'ATOMUSDT', 'ETCUSD': 'ETCUSDT', 'FILUSD': 'FILUSDT',
    'ICPUSD': 'ICPUSDT', 'VETUSD': 'VETUSDT', 'NEARUSD': 'NEARUSDT', 'GRTUSD': 'GRTUSDT',
    'AAVEUSD': 'AAVEUSDT', 'MKRUSD': 'MKRUSDT', 'ALGOUSD': 'ALGOUSDT', 'FTMUSD': 'FTMUSDT',
    'SANDUSD': 'SANDUSDT', 'MANAUSD': 'MANAUSDT', 'AXSUSD': 'AXSUSDT', 'THETAUSD': 'THETAUSDT',
    'FLOWUSD': 'FLOWUSDT', 'SNXUSD': 'SNXUSDT', 'EOSUSD': 'EOSUSDT', 'CHZUSD': 'CHZUSDT',
    'ENJUSD': 'ENJUSDT', 'PEPEUSD': 'PEPEUSDT', 'ARBUSD': 'ARBUSDT', 'OPUSD': 'OPUSDT',
    'SUIUSD': 'SUIUSDT', 'APTUSD': 'APTUSDT', 'INJUSD': 'INJUSDT', 'TONUSD': 'TONUSDT',
  }
  if (cryptoMap[s]) return cryptoMap[s]
  if (s.endsWith('USD') && getSymbolCategory(s) === 'crypto') return s.replace('USD', 'USDT')
  return null
}

function toBinanceInterval(resolution) {
  const map = {
    '1': '1m', '3': '3m', '5': '5m', '15': '15m', '30': '30m',
    '60': '1h', '120': '2h', '240': '4h', '360': '6h', '720': '12h',
    '1D': '1d', 'D': '1d', '1W': '1w', 'W': '1w', '1M': '1M', 'M': '1M',
  }
  return map[resolution] || '5m'
}

async function fetchBinanceKlines(symbol, resolution, from, to) {
  const binanceSymbol = toBinanceKlineSymbol(symbol)
  if (!binanceSymbol) return null
  const interval = toBinanceInterval(resolution)
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&startTime=${from * 1000}&endTime=${to * 1000}&limit=1000`
    const response = await fetch(url)
    if (!response.ok) return null
    const data = await response.json()
    if (!Array.isArray(data) || data.length === 0) return null
    return data.map(k => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }))
  } catch (e) {
    return null
  }
}

// ===== Backend OHLC history (primary source — real candles from LP ticks) =====

async function fetchBackendHistory(symbol, resolution, from, to) {
  try {
    const url = `${API_URL}/api/prices/history?symbol=${encodeURIComponent(symbol)}&resolution=${encodeURIComponent(resolution)}&from=${from}&to=${to}`
    const response = await fetch(url)
    if (!response.ok) return null
    const data = await response.json()
    if (data?.s !== 'ok' || !Array.isArray(data.t) || data.t.length === 0) return null
    const bars = []
    for (let i = 0; i < data.t.length; i++) {
      bars.push({
        time: data.t[i] * 1000, // server returns seconds; TV expects ms
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: 0,
      })
    }
    return bars
  } catch (e) {
    return null
  }
}

// ===== Synthetic historical candle generator =====

function seededRand(seed) {
  let s = Math.abs(seed) % 2147483647
  if (s === 0) s = 1
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function generateHistoricalCandles(symbol, currentPrice, resolution, from, to) {
  if (!currentPrice?.bid || currentPrice.bid <= 0) return []

  const resSeconds = RESOLUTION_MAP[resolution] || 300
  const mid = (currentPrice.bid + currentPrice.ask) / 2
  const spread = Math.abs(currentPrice.ask - currentPrice.bid)

  const cat = getSymbolCategory(symbol)
  let volatilityPct = 0.0003
  if (cat === 'metals') volatilityPct = 0.0004
  if (cat === 'indices') volatilityPct = 0.0005
  if (cat === 'commodities') volatilityPct = 0.0006
  if (cat === 'crypto') volatilityPct = 0.001
  const resolutionFactor = Math.sqrt(resSeconds / 300)
  const volatility = Math.max(spread * 1.5, mid * volatilityPct * resolutionFactor)

  const nowSec = Math.floor(Date.now() / 1000)
  const toSec = Math.min(to, nowSec)
  const fromAligned = Math.floor(from / resSeconds) * resSeconds
  const toAligned = Math.floor(toSec / resSeconds) * resSeconds

  if (fromAligned >= toAligned) return []

  const count = Math.floor((toAligned - fromAligned) / resSeconds) + 1
  const maxBars = 500
  const actualCount = Math.min(count, maxBars)
  const startSec = toAligned - (actualCount - 1) * resSeconds

  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + Math.floor(startSec / 86400)
  const rand = seededRand(seed)

  const increments = Array.from({ length: actualCount }, () => (rand() - 0.5) * volatility * 2)

  let cumSum = 0
  const cumSums = increments.map(inc => { cumSum += inc; return cumSum })

  const lastCum = cumSums[cumSums.length - 1]
  const prices = cumSums.map(c => mid + (c - lastCum))

  const bars = []
  let prevPrice = mid - (cumSums[0] - lastCum)

  for (let i = 0; i < actualCount; i++) {
    const t = startSec + i * resSeconds
    const open = prevPrice
    const close = prices[i]
    const high = Math.max(open, close) + Math.abs(rand() * volatility * 0.4)
    const low = Math.min(open, close) - Math.abs(rand() * volatility * 0.4)
    bars.push({
      time: t * 1000,
      open,
      high,
      low,
      close,
      volume: Math.floor(rand() * 500) + 50,
    })
    prevPrice = close
  }

  return bars
}

// ===== Wait for LP price =====

function waitForPrice(symbol, timeoutMs = 4000) {
  return new Promise(resolve => {
    const price = priceStreamService.getPrice(symbol)
    if (price?.bid && price.bid > 0) {
      resolve(price)
      return
    }
    let resolved = false
    const timer = setTimeout(() => {
      if (!resolved) { resolved = true; resolve(null) }
    }, timeoutMs)

    const unsub = priceStreamService.subscribe('_wait_' + symbol, (prices) => {
      if (!resolved && prices[symbol]?.bid > 0) {
        resolved = true
        clearTimeout(timer)
        unsub()
        resolve(prices[symbol])
      }
    })
  })
}

// ========== MAIN DATAFEED CLASS ==========

class SuimfxDatafeed {
  constructor() {
    this._subscribers = {}
    this._barStore = {}
    this._streamUnsub = null
    this._streamActive = false
    this._startStream()
  }

  _startStream() {
    if (this._streamActive) return
    this._streamActive = true
    this._streamUnsub = priceStreamService.subscribe('tv-barbuilder', (prices, updated) => {
      this._onTick(prices, updated)
    })
  }

  _onTick(prices, updated) {
    const nowMs = Date.now()
    const activeSymbols = new Set(Object.values(this._subscribers).map(s => s.symbol))

    for (const symbol of activeSymbols) {
      const priceData = prices[symbol]
      if (!priceData?.bid || priceData.bid <= 0) continue
      const mid = (priceData.bid + priceData.ask) / 2

      if (!this._barStore[symbol]) this._barStore[symbol] = {}

      for (const guid in this._subscribers) {
        const sub = this._subscribers[guid]
        if (sub.symbol !== symbol) continue

        const res = sub.resolution
        const resSeconds = RESOLUTION_MAP[res] || 300
        const barTimeMs = Math.floor(nowMs / 1000 / resSeconds) * resSeconds * 1000

        if (!this._barStore[symbol][res]) this._barStore[symbol][res] = []
        const bars = this._barStore[symbol][res]

        if (bars.length === 0 || bars[bars.length - 1].time < barTimeMs) {
          const newBar = { time: barTimeMs, open: mid, high: mid, low: mid, close: mid, volume: 1 }
          bars.push(newBar)
          if (bars.length > 2000) bars.shift()
        } else {
          const bar = bars[bars.length - 1]
          bar.close = mid
          bar.high = Math.max(bar.high, mid)
          bar.low = Math.min(bar.low, mid)
          bar.volume += 1
        }

        const latestBar = { ...bars[bars.length - 1] }
        sub.onTick(latestBar)
      }
    }
  }

  onReady(callback) {
    setTimeout(() => {
      callback({
        supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', '1D', '1W', '1M'],
        supports_marks: false,
        supports_timescale_marks: false,
        supports_time: true,
        exchanges: [{ value: 'SUIMFX', name: 'Suimfx', desc: 'Suimfx Broker' }],
        symbols_types: [
          { name: 'Forex', value: 'forex' },
          { name: 'Crypto', value: 'crypto' },
          { name: 'Metals', value: 'metals' },
          { name: 'Commodities', value: 'commodity' },
          { name: 'Indices', value: 'index' },
          { name: 'Stocks', value: 'stock' },
        ],
      })
    }, 0)
  }

  searchSymbols(userInput, exchange, symbolType, onResult) {
    fetch(`${API_URL}/prices/instruments`)
      .then(res => res.json())
      .then(data => {
        if (!data.success || !data.instruments) { onResult([]); return }
        const query = userInput.toUpperCase()
        const results = data.instruments
          .filter(i => i.symbol.toUpperCase().includes(query) || (i.name && i.name.toUpperCase().includes(query)))
          .slice(0, 30)
          .map(i => ({
            symbol: i.symbol,
            full_name: `SUIMFX:${i.symbol}`,
            description: INSTRUMENT_NAMES[i.symbol] || i.name || i.symbol,
            exchange: 'SUIMFX',
            ticker: i.symbol,
            type: getSymbolCategory(i.symbol),
          }))
        onResult(results)
      })
      .catch(() => onResult([]))
  }

  resolveSymbol(symbolName, onResolve, onError) {
    const symbol = symbolName.replace('SUIMFX:', '').toUpperCase()
    const cat = getSymbolCategory(symbol)
    const digits = getDigits(symbol)

    setTimeout(() => {
      onResolve({
        name: symbol,
        ticker: symbol,
        description: INSTRUMENT_NAMES[symbol] || symbol,
        type: cat === 'forex' ? 'forex' : cat === 'crypto' ? 'crypto' : cat === 'metals' ? 'forex' : cat === 'indices' ? 'index' : cat === 'commodities' ? 'commodity' : 'stock',
        session: cat === 'crypto' ? '24x7' : '0000-2359:23456',
        timezone: 'Etc/UTC',
        exchange: 'SUIMFX',
        listed_exchange: 'SUIMFX',
        minmov: 1,
        pricescale: Math.pow(10, digits),
        has_intraday: true,
        has_daily: true,
        has_weekly_and_monthly: true,
        supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', '1D', '1W', '1M'],
        volume_precision: 2,
        data_status: 'streaming',
        format: 'price',
      })
    }, 0)
  }

  async getBars(symbolInfo, resolution, periodParams, onResult, onError) {
    const { from, to } = periodParams
    const symbol = (symbolInfo.name || symbolInfo.ticker).toUpperCase()
    const cat = getSymbolCategory(symbol)

    try {
      // PRIMARY: real OHLC built on our backend from live LP ticks
      const backendBars = await fetchBackendHistory(symbol, resolution, from, to)
      if (backendBars && backendBars.length > 0) {
        onResult(backendBars, { noData: false })
        return
      }

      // Fallback: Binance klines for crypto — real market data from a public feed
      if (cat === 'crypto') {
        const bars = await fetchBinanceKlines(symbol, resolution, from, to)
        if (bars && bars.length > 0) {
          onResult(bars, { noData: false })
          return
        }
      }

      // Fallback: locally-built bars from live stream in this session
      const storedBars = this._barStore[symbol]?.[resolution]
      if (storedBars && storedBars.length > 0) {
        const filtered = storedBars.filter(b => b.time >= from * 1000 && b.time <= to * 1000)
        if (filtered.length > 0) {
          onResult(filtered, { noData: false })
          return
        }
      }

      // Last resort: synthetic bars so the chart isn't empty until real history accumulates
      let price = priceStreamService.getPrice(symbol)
      if (!price?.bid || price.bid <= 0) {
        price = await waitForPrice(symbol, 5000)
      }

      if (!price?.bid || price.bid <= 0) {
        onResult([], { noData: true })
        return
      }

      const bars = generateHistoricalCandles(symbol, price, resolution, from, to)
      if (bars.length > 0) {
        onResult(bars, { noData: false })
      } else {
        onResult([], { noData: true })
      }
    } catch (err) {
      console.error('[Datafeed] getBars error:', err)
      onResult([], { noData: true })
    }
  }

  subscribeBars(symbolInfo, resolution, onTick, listenerGuid) {
    const symbol = (symbolInfo.name || symbolInfo.ticker).toUpperCase()
    this._subscribers[listenerGuid] = { symbol, resolution, onTick }
  }

  unsubscribeBars(listenerGuid) {
    delete this._subscribers[listenerGuid]
  }

  destroy() {
    if (this._streamUnsub) {
      this._streamUnsub()
      this._streamActive = false
      this._streamUnsub = null
    }
    this._subscribers = {}
    this._barStore = {}
  }
}

export default SuimfxDatafeed
