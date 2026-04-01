/**
 * LP Integration Routes — Corecen → SuimFX
 * Instruments sync and optional real-time price push.
 */

import express from 'express'
import crypto from 'crypto'
import Instrument from '../models/Instrument.js'
import lpPriceService from '../services/lpPriceService.js'

const router = express.Router()

const LP_API_KEY = process.env.LP_API_KEY || 'suimfx_lp_api_key'
const LP_API_SECRET = process.env.LP_API_SECRET || 'suimfx_lp_api_secret'

/**
 * HMAC Authentication Middleware
 * Validates requests from Corecen LP
 */
function validateLpRequest (req, res, next) {
  try {
    const apiKey = req.headers['x-api-key']
    const timestamp = req.headers['x-timestamp']
    const signature = req.headers['x-signature']

    console.log('[LP Auth] Received API Key:', apiKey?.substring(0, 20) + '...')
    console.log('[LP Auth] Expected API Key:', LP_API_KEY?.substring(0, 20) + '...')
    console.log('[LP Auth] Keys match:', apiKey === LP_API_KEY)

    if (!apiKey || !timestamp || !signature) {
      return res.status(401).json({ success: false, message: 'Missing authentication headers' })
    }

    if (apiKey !== LP_API_KEY) {
      console.log('[LP Auth] API Key mismatch!')
      console.log('[LP Auth] Received full:', apiKey)
      console.log('[LP Auth] Expected full:', LP_API_KEY)
      return res.status(401).json({ success: false, message: 'Invalid API key' })
    }

    const now = Date.now()
    const requestTime = parseInt(timestamp, 10)
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return res.status(401).json({ success: false, message: 'Request expired' })
    }

    const body = req.body ? JSON.stringify(req.body) : ''
    const method = req.method.toUpperCase()
    const path = req.originalUrl
    const message = `${method}${path}${timestamp}${body}`
    const expectedSignature = crypto.createHmac('sha256', LP_API_SECRET).update(message).digest('hex')

    if (signature !== expectedSignature) {
      return res.status(401).json({ success: false, message: 'Invalid signature' })
    }

    next()
  } catch (error) {
    console.error('LP auth error:', error)
    res.status(500).json({ success: false, message: 'Authentication error' })
  }
}

/**
 * POST /api/lp/instruments/bulk
 * Receive bulk instruments from Corecen
 */
router.post('/instruments/bulk', validateLpRequest, async (req, res) => {
  try {
    const { brokerId, instruments } = req.body

    if (!instruments || !Array.isArray(instruments)) {
      return res.status(400).json({ success: false, message: 'instruments array required' })
    }

    const results = []
    const bulkOps = []

    for (const inst of instruments) {
      let segment = 'Forex'
      if (inst.assetClass === 'CRYPTO') segment = 'Crypto'
      else if (inst.assetClass === 'COMMODITY') segment = 'Commodities'
      else if (inst.assetClass === 'INDEX') segment = 'Indices'

      bulkOps.push({
        updateOne: {
          filter: { symbol: inst.symbol },
          update: {
            $set: {
              symbol: inst.symbol,
              name: inst.name || inst.symbol,
              segment,
              baseCurrency: inst.baseCurrency || inst.symbol.substring(0, 3),
              quoteCurrency: inst.quoteCurrency || 'USD',
              contractSize: inst.contractSize || 100000,
              pipSize: inst.pipSize || 0.0001,
              pipValue: inst.pipValue || 10,
              minLotSize: inst.minLotSize || 0.01,
              maxLotSize: inst.maxLotSize || 100,
              lotStep: inst.lotStep || 0.01,
              tradingViewSymbol: inst.tradingViewSymbol || `FX:${inst.symbol}`,
              isActive: inst.enabled !== false,
              assetClass: inst.assetClass || 'CFD',
              bookType: inst.bookType || 'B_BOOK',
              markupBps: inst.markupBps || 0,
              commissionPerLot: inst.commissionPerLot || 7,
              marginPercent: inst.marginPercent || 1,
              precision: inst.precision || 5,
              source: 'CORECEN_LP',
              updatedAt: new Date()
            }
          },
          upsert: true
        }
      })

      results.push({ symbol: inst.symbol, status: 'UPDATED' })
    }

    if (bulkOps.length > 0) {
      await Instrument.bulkWrite(bulkOps, { ordered: false })
    }

    console.log(`[LP] Received ${instruments.length} instruments from Corecen`)

    res.json({
      success: true,
      results,
      message: `Processed ${instruments.length} instruments`
    })
  } catch (error) {
    console.error('LP instruments bulk error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/instruments', validateLpRequest, async (req, res) => {
  try {
    const { brokerId, symbol, ...instrumentData } = req.body

    if (!symbol) {
      return res.status(400).json({ success: false, message: 'symbol required' })
    }

    let segment = 'Forex'
    if (instrumentData.assetClass === 'CRYPTO') segment = 'Crypto'
    else if (instrumentData.assetClass === 'COMMODITY') segment = 'Commodities'
    else if (instrumentData.assetClass === 'INDEX') segment = 'Indices'

    await Instrument.findOneAndUpdate(
      { symbol },
      {
        $set: {
          symbol,
          segment,
          ...instrumentData,
          source: 'CORECEN_LP',
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    )

    console.log(`[LP] Received instrument ${symbol} from Corecen`)

    res.json({ success: true, symbol, status: 'UPDATED' })
  } catch (error) {
    console.error('LP instrument error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/prices/batch', validateLpRequest, (req, res) => {
  try {
    const { ticks } = req.body

    if (!ticks || !Array.isArray(ticks)) {
      return res.status(400).json({ success: false, message: 'ticks array required' })
    }

    lpPriceService.updatePrices(ticks)

    res.json({ success: true, received: ticks.length })
  } catch (error) {
    console.error('LP prices batch error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/prices', validateLpRequest, (req, res) => {
  try {
    const { symbol, bid, ask, spread, timestamp } = req.body

    if (!symbol || bid === undefined || ask === undefined) {
      return res.status(400).json({ success: false, message: 'symbol, bid, ask required' })
    }

    lpPriceService.updatePrices([{ symbol, bid, ask, spread, timestamp }])

    if (global.io) {
      global.io.to('prices').emit('priceStream', {
        prices: Object.fromEntries(lpPriceCache),
        updated: { [symbol]: { bid, ask, time: now } },
        timestamp: now
      })
    }

    res.json({ success: true, symbol })
  } catch (error) {
    console.error('LP price error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/prices', (req, res) => {
  const cache = lpPriceService.getPriceCache()
  const prices = Object.fromEntries(cache)
  res.json({ success: true, prices, count: cache.size })
})

router.get('/prices/:symbol', (req, res) => {
  const { symbol } = req.params
  const price = lpPriceService.getPrice(symbol)

  if (price) {
    res.json({ success: true, price })
  } else {
    res.status(404).json({ success: false, message: 'Price not available' })
  }
})

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    priceCount: lpPriceService.getPriceCache().size,
    source: 'CORECEN_LP',
    timestamp: Date.now()
  })
})

export const getLpPrice = (symbol) => lpPriceService.getPrice(symbol)
export const getAllLpPrices = () => lpPriceService.getPriceCache()

export default router
