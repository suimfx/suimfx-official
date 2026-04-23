import dotenv from 'dotenv'

dotenv.config()

import express from 'express'
import lpPriceService from '../services/lpPriceService.js'

const router = express.Router()



// Popular instruments per category (shown by default - 15 max)

const POPULAR_INSTRUMENTS = {

  Forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'EURAUD', 'AUDCAD', 'AUDJPY', 'CADJPY'],

  Metals: ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD', 'XAUEUR', 'XAUAUD', 'XAUGBP', 'XAUCHF', 'XAUJPY', 'XAGEUR'],

  Energy: ['USOIL', 'UKOIL', 'NGAS', 'BRENT', 'WTI', 'GASOLINE', 'HEATING'],

  Crypto: ['BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD', 'DOTUSD', 'MATICUSD', 'LTCUSD', 'AVAXUSD', 'LINKUSD', 'SHIBUSD', 'UNIUSD', 'ATOMUSD'],

  Stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'UNH', 'HD']

}



function categorizeSymbol (symbol) {
  return lpPriceService.categorizeSymbol(symbol)
}

// Default instruments fallback

function getDefaultInstruments() {

  return [

    { symbol: 'EURUSD', name: 'EUR/USD', category: 'Forex', digits: 5 },

    { symbol: 'GBPUSD', name: 'GBP/USD', category: 'Forex', digits: 5 },

    { symbol: 'USDJPY', name: 'USD/JPY', category: 'Forex', digits: 3 },

    { symbol: 'USDCHF', name: 'USD/CHF', category: 'Forex', digits: 5 },

    { symbol: 'AUDUSD', name: 'AUD/USD', category: 'Forex', digits: 5 },

    { symbol: 'NZDUSD', name: 'NZD/USD', category: 'Forex', digits: 5 },

    { symbol: 'USDCAD', name: 'USD/CAD', category: 'Forex', digits: 5 },

    { symbol: 'EURGBP', name: 'EUR/GBP', category: 'Forex', digits: 5 },

    { symbol: 'EURJPY', name: 'EUR/JPY', category: 'Forex', digits: 3 },

    { symbol: 'GBPJPY', name: 'GBP/JPY', category: 'Forex', digits: 3 },

    { symbol: 'XAUUSD', name: 'Gold', category: 'Metals', digits: 2 },

    { symbol: 'XAGUSD', name: 'Silver', category: 'Metals', digits: 3 },

    { symbol: 'BTCUSD', name: 'Bitcoin', category: 'Crypto', digits: 2 },

    { symbol: 'ETHUSD', name: 'Ethereum', category: 'Crypto', digits: 2 },

  ]

}



// GET /api/prices/instruments - Get all available instruments (only those with live prices)

router.get('/instruments', async (req, res) => {

  try {

    console.log('[Corecen LP] Returning instruments from price cache')

    const lpPrices = lpPriceService.getPriceCache()
    const symbolsWithPrices = [...lpPrices.keys()].filter((sym) => {
      const p = lpPrices.get(sym)
      return p && p.bid != null && p.ask != null && Number(p.bid) > 0 && Number(p.ask) > 0
    })

    const instruments = symbolsWithPrices.map((symbol) => {
      const category = categorizeSymbol(symbol)
      const isPopular = POPULAR_INSTRUMENTS[category]?.includes(symbol) || false
      return {
        symbol,
        name: getInstrumentName(symbol),
        category,
        digits: getDigits(symbol),
        contractSize: getContractSize(symbol),
        minVolume: 0.01,
        maxVolume: 100,
        volumeStep: 0.01,
        popular: isPopular
      }
    })

    console.log('[Corecen LP]', instruments.length, 'instruments with live bid/ask')

    res.json({ success: true, instruments, source: 'CORECEN_LP' })

  } catch (error) {

    console.error('[Prices] Error fetching instruments:', error)

    res.json({ success: true, instruments: getDefaultInstruments() })

  }

})



// Helper to get instrument display name

function getInstrumentName(symbol) {

  const names = {

    // Forex Majors & Crosses

    'EURUSD': 'EUR/USD', 'GBPUSD': 'GBP/USD', 'USDJPY': 'USD/JPY', 'USDCHF': 'USD/CHF',

    'AUDUSD': 'AUD/USD', 'NZDUSD': 'NZD/USD', 'USDCAD': 'USD/CAD', 'EURGBP': 'EUR/GBP',

    'EURJPY': 'EUR/JPY', 'GBPJPY': 'GBP/JPY', 'EURCHF': 'EUR/CHF', 'EURAUD': 'EUR/AUD',

    'EURCAD': 'EUR/CAD', 'GBPAUD': 'GBP/AUD', 'GBPCAD': 'GBP/CAD', 'AUDCAD': 'AUD/CAD',

    'AUDJPY': 'AUD/JPY', 'CADJPY': 'CAD/JPY', 'CHFJPY': 'CHF/JPY', 'NZDJPY': 'NZD/JPY',

    'AUDNZD': 'AUD/NZD', 'CADCHF': 'CAD/CHF', 'GBPCHF': 'GBP/CHF', 'GBPNZD': 'GBP/NZD',

    'EURNZD': 'EUR/NZD', 'NZDCAD': 'NZD/CAD', 'NZDCHF': 'NZD/CHF', 'AUDCHF': 'AUD/CHF',

    // Exotics

    'USDSGD': 'USD/SGD', 'EURSGD': 'EUR/SGD', 'GBPSGD': 'GBP/SGD', 'USDZAR': 'USD/ZAR',

    'USDTRY': 'USD/TRY', 'EURTRY': 'EUR/TRY', 'USDMXN': 'USD/MXN', 'USDPLN': 'USD/PLN',

    'USDSEK': 'USD/SEK', 'USDNOK': 'USD/NOK', 'USDDKK': 'USD/DKK', 'USDCNH': 'USD/CNH',

    // Metals

    'XAUUSD': 'Gold', 'XAGUSD': 'Silver', 'XPTUSD': 'Platinum', 'XPDUSD': 'Palladium',

    // Commodities

    'USOIL': 'US Oil', 'UKOIL': 'UK Oil', 'NGAS': 'Natural Gas', 'COPPER': 'Copper',

    // Crypto

    'BTCUSD': 'Bitcoin', 'ETHUSD': 'Ethereum', 'BNBUSD': 'BNB', 'SOLUSD': 'Solana',

    'XRPUSD': 'XRP', 'ADAUSD': 'Cardano', 'DOGEUSD': 'Dogecoin', 'TRXUSD': 'TRON',

    'LINKUSD': 'Chainlink', 'MATICUSD': 'Polygon', 'DOTUSD': 'Polkadot',

    'SHIBUSD': 'Shiba Inu', 'LTCUSD': 'Litecoin', 'BCHUSD': 'Bitcoin Cash', 'AVAXUSD': 'Avalanche',

    'XLMUSD': 'Stellar', 'UNIUSD': 'Uniswap', 'ATOMUSD': 'Cosmos', 'ETCUSD': 'Ethereum Classic',

    'FILUSD': 'Filecoin', 'ICPUSD': 'Internet Computer', 'VETUSD': 'VeChain',

    'NEARUSD': 'NEAR Protocol', 'GRTUSD': 'The Graph', 'AAVEUSD': 'Aave', 'MKRUSD': 'Maker',

    'ALGOUSD': 'Algorand', 'FTMUSD': 'Fantom', 'SANDUSD': 'The Sandbox', 'MANAUSD': 'Decentraland',

    'AXSUSD': 'Axie Infinity', 'THETAUSD': 'Theta Network', 'XMRUSD': 'Monero', 'FLOWUSD': 'Flow',

    'SNXUSD': 'Synthetix', 'EOSUSD': 'EOS', 'CHZUSD': 'Chiliz', 'ENJUSD': 'Enjin Coin',

    'PEPEUSD': 'Pepe', 'ARBUSD': 'Arbitrum', 'OPUSD': 'Optimism', 'SUIUSD': 'Sui',

    'APTUSD': 'Aptos', 'INJUSD': 'Injective', 'TONUSD': 'Toncoin', 'HBARUSD': 'Hedera',

    // Commodities

    'GASOLINE': 'Gasoline', 'CATTLE': 'Live Cattle', 'COCOA': 'Cocoa', 'COFFEE': 'Coffee', 'CORN': 'Corn', 'COTTON': 'Cotton', 'ALUMINUM': 'Aluminum',

    // Indices

    'AEX': 'AEX Index', 'AUS200': 'Australia 200', 'CAC40': 'CAC 40', 'CAN60': 'Canada 60',

    'CN50': 'China 50', 'DAX': 'DAX German', 'DXY': 'US Dollar Index', 'EU50': 'Euro Stoxx 50',

    'EURX': 'Euro Index', 'GERMID50': 'MDAX 50',

    // Stocks

    'AAPL': 'Apple Inc', 'MSFT': 'Microsoft', 'GOOGL': 'Alphabet', 'AA': 'Alcoa Corp',

    'AAL': 'American Airlines', 'AAP': 'Advance Auto Parts', 'ABBV': 'AbbVie Inc',

    'ADBE': 'Adobe Inc', 'AIG': 'American Intl Group', 'AMD': 'AMD'

  }

  return names[symbol] || symbol

}



// Helper to get digits for symbol

function getDigits(symbol) {

  if (symbol.includes('JPY')) return 3

  if (symbol === 'XAUUSD') return 2

  if (symbol === 'XAGUSD') return 3

  const category = categorizeSymbol(symbol)

  if (category === 'Crypto') return 2

  if (category === 'Stocks') return 2

  return 5

}



// Helper to get contract size

function getContractSize(symbol) {

  const category = categorizeSymbol(symbol)

  if (category === 'Crypto') return 1

  if (category === 'Metals') return 100

  if (category === 'Energy') return 1000

  return 100000 // Forex default

}



// ───────────────────────────────────────────────────────────────
// GET /api/prices/history — TradingView UDF bars from LP candle data
// MUST be defined before /:symbol so Express doesn't treat
// 'history' as a :symbol param.
// ───────────────────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const { symbol, resolution, from, to, countback } = req.query
    if (!symbol || !resolution) {
      return res.json({ s: 'error', errmsg: 'symbol and resolution required' })
    }

    const Candle = (await import('../models/Candle.js')).default
    const { getCurrentBar } = await import('../services/candleAggregator.js')

    const RESOLUTION_MAP = {
      '1': 60, '3': 180, '5': 300, '15': 900, '30': 1800,
      '60': 3600, '120': 7200, '240': 14400, '360': 21600, '720': 43200,
      'D': 86400, '1D': 86400, 'W': 604800, '1W': 604800, 'M': 2592000, '1M': 2592000,
    }

    const sym = String(symbol).toUpperCase()
    const targetSec = RESOLUTION_MAP[String(resolution)] || 60
    const fromSec = parseInt(from, 10) || Math.floor(Date.now() / 1000) - targetSec * 300
    const toSec = parseInt(to, 10) || Math.floor(Date.now() / 1000)
    const limit = Math.min(5000, parseInt(countback, 10) || 500)

    const minutesInRange = Math.ceil((toSec - fromSec) / 60) + 2
    const docs = await Candle.find({
      symbol: sym, timeframe: '1m',
      time: { $gte: fromSec, $lte: toSec },
    }).sort({ time: 1 }).limit(Math.max(minutesInRange, limit * (targetSec / 60))).lean()

    let bars1m = docs.map(d => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close }))

    const current = getCurrentBar(sym)
    if (current && current.time >= fromSec && current.time <= toSec) {
      if (bars1m.length && bars1m[bars1m.length - 1].time === current.time) {
        bars1m[bars1m.length - 1] = { ...current }
      } else {
        bars1m.push({ ...current })
      }
    }

    if (bars1m.length > 0) {
      let aggregated
      if (targetSec <= 60) {
        aggregated = bars1m
      } else {
        aggregated = []
        let bucket = null
        for (const b of bars1m) {
          const bucketTime = Math.floor(b.time / targetSec) * targetSec
          if (!bucket || bucket.time !== bucketTime) {
            if (bucket) aggregated.push(bucket)
            bucket = { time: bucketTime, open: b.open, high: b.high, low: b.low, close: b.close }
          } else {
            if (b.high > bucket.high) bucket.high = b.high
            if (b.low < bucket.low) bucket.low = b.low
            bucket.close = b.close
          }
        }
        if (bucket) aggregated.push(bucket)
      }
      const trimmed = aggregated.length > limit ? aggregated.slice(-limit) : aggregated
      const t = [], o = [], h = [], l = [], c = []
      for (const b of trimmed) { t.push(b.time); o.push(b.open); h.push(b.high); l.push(b.low); c.push(b.close) }
      return res.json({ s: 'ok', t, o, h, l, c })
    }

    return res.json({ s: 'no_data', nextTime: fromSec - targetSec })
  } catch (err) {
    console.error('[prices/history] error:', err)
    return res.json({ s: 'error', errmsg: err.message || 'unknown error' })
  }
})

// GET /api/prices/:symbol - Get single symbol price

router.get('/:symbol', async (req, res) => {

  try {

    const { symbol } = req.params

    let priceResolved = lpPriceService.getPrice(symbol)
    if (!priceResolved) {
      priceResolved = await lpPriceService.fetchPriceREST(symbol)
    }

    if (priceResolved && priceResolved.bid != null && priceResolved.ask != null) {
      res.json({
        success: true,
        price: { bid: priceResolved.bid, ask: priceResolved.ask },
        source: 'CORECEN_LP'
      })
    } else {
      res.status(404).json({
        success: false,
        message: 'Price not available from LP. Ensure Corecen is pushing ticks to POST /api/lp/prices/batch.'
      })
    }

  } catch (error) {

    console.error('[Prices] Error fetching price:', error)

    res.status(500).json({ success: false, message: error.message })

  }

})



// POST /api/prices/batch - Get multiple symbol prices

router.post('/batch', async (req, res) => {

  try {

    const { symbols } = req.body

    if (!symbols || !Array.isArray(symbols)) {

      return res.status(400).json({ success: false, message: 'symbols array required' })

    }

    

    const prices = {}
    const cache = lpPriceService.getPriceCache()

    for (const symbol of symbols) {
      const cached = cache.get(symbol)
      if (cached && cached.bid != null && cached.ask != null) {
        prices[symbol] = { bid: cached.bid, ask: cached.ask }
      }
    }

    res.json({ success: true, prices, source: 'CORECEN_LP' })

  } catch (error) {

    console.error('[Prices] Error fetching batch prices:', error)

    res.status(500).json({ success: false, message: error.message })

  }

})



export default router

