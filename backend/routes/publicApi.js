/**
 * Public Partner API — read-only trade feed for external integrators.
 *
 * Auth: X-API-Key: <key>   or   Authorization: Bearer <key>
 * Keys live in PUBLIC_API_KEYS (comma-separated) so a partner can be revoked
 * without a code change.
 *
 * Only real-money TradingAccount trades are exposed. Prop/challenge accounts
 * are simulated capital and are deliberately excluded from the public feed.
 */

import express from 'express'
import crypto from 'crypto'
import Trade from '../models/Trade.js'
import TradingAccount from '../models/TradingAccount.js'
import tradeEngine from '../services/tradeEngine.js'
import lpPriceService from '../services/lpPriceService.js'

const router = express.Router()

const MAX_DAYS = 90
const DEFAULT_DAYS = 30
const MAX_LIMIT = 500

function loadKeys () {
  return (process.env.PUBLIC_API_KEYS || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)
}

// Constant-time compare over digests so unequal key lengths don't throw and
// response time doesn't leak how much of the key matched.
function keyMatches (presented, known) {
  const a = crypto.createHash('sha256').update(presented).digest()
  const b = crypto.createHash('sha256').update(known).digest()
  return crypto.timingSafeEqual(a, b)
}

function requireApiKey (req, res, next) {
  const keys = loadKeys()
  if (!keys.length) {
    return res.status(503).json({ success: false, message: 'Public API not configured' })
  }

  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  const presented = (req.headers['x-api-key'] || bearer || '').trim()
  if (!presented || !keys.some(k => keyMatches(presented, k))) {
    return res.status(401).json({ success: false, message: 'Invalid or missing API key' })
  }
  next()
}

/**
 * Notional value of the position at a given price, in account currency.
 * Returns null when the price isn't known yet (an open trade has no close).
 */
function amountAt (price, trade) {
  if (price == null) return null
  return Number((price * trade.quantity * (trade.contractSize || 1)).toFixed(2))
}

export function formatTrade (trade, username) {
  const closed = trade.status === 'CLOSED'
  return {
    trade_id: trade.tradeId,
    username,
    symbol: trade.symbol,
    position: trade.side === 'BUY' ? 'Buy' : 'Sell',
    open_amount: amountAt(trade.openPrice, trade),
    close_amount: amountAt(closed ? trade.closePrice : null, trade),
    pnl: Number(((closed ? trade.realizedPnl : trade.floatingPnl) || 0).toFixed(2)),
    open_datetime: trade.openedAt ? new Date(trade.openedAt).toISOString() : null,
    close_datetime: closed && trade.closedAt ? new Date(trade.closedAt).toISOString() : null,
    status: closed ? 'Closed' : 'Open'
  }
}

/**
 * GET /api/v1/trades
 * Query: status=open|closed|all (default all), days=1..90 (default 30),
 *        from/to (ISO, overrides days), limit=1..500 (default 100), offset
 */
router.get('/trades', requireApiKey, async (req, res) => {
  try {
    const { status = 'all', days, from, to, limit, offset } = req.query

    const query = { accountType: 'TradingAccount' }

    const wanted = String(status).toLowerCase()
    if (wanted === 'open') query.status = 'OPEN'
    else if (wanted === 'closed') query.status = 'CLOSED'
    else query.status = { $in: ['OPEN', 'CLOSED'] }

    // Window is on openedAt so a still-running position stays visible for its
    // whole life, and a closed one drops out a month after it was opened.
    const since = new Date(from || Date.now() - clampDays(days) * 86400000)
    if (isNaN(since.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid "from" date' })
    }
    query.openedAt = { $gte: since }
    if (to) {
      const until = new Date(to)
      if (isNaN(until.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid "to" date' })
      }
      query.openedAt.$lte = until
    }

    const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), MAX_LIMIT)
    const off = Math.max(parseInt(offset, 10) || 0, 0)

    const trades = await Trade.find(query).sort({ openedAt: -1 }).skip(off).limit(lim).lean()
    const total = await Trade.countDocuments(query)

    // Trade.floatingPnl is only ever 0 in the DB — open P&L is derived from the
    // live price cache and never persisted. Fill it in here so partners get a
    // real moving number instead of a column of zeros.
    for (const t of trades) {
      if (t.status !== 'OPEN') continue
      const price = lpPriceService.getPrice(t.symbol)
      if (price) t.floatingPnl = tradeEngine.calculateFloatingPnl(t, price.bid, price.ask)
    }

    // One lookup for the page's accounts — the account id is the public
    // identity, so emails and real names never leave the platform.
    const accounts = await TradingAccount
      .find({ _id: { $in: [...new Set(trades.map(t => String(t.tradingAccountId)))] } })
      .select('accountId')
      .lean()
    const nameById = new Map(accounts.map(a => [String(a._id), a.accountId]))

    res.json({
      success: true,
      data: trades.map(t => formatTrade(t, nameById.get(String(t.tradingAccountId)) || 'unknown')),
      total,
      limit: lim,
      offset: off
    })
  } catch (error) {
    console.error('[PublicAPI] /trades failed:', error)
    res.status(500).json({ success: false, message: 'Internal error' })
  }
})

function clampDays (raw) {
  const n = parseInt(raw, 10)
  if (!n || n < 1) return DEFAULT_DAYS
  return Math.min(n, MAX_DAYS)
}

export default router
