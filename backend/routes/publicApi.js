/**
 * Public Partner API — read-only trade feed for external integrators.
 *
 * Auth: X-API-Key: <key>   or   Authorization: Bearer <key>
 *
 * Keys live in PUBLIC_API_KEYS as comma-separated `scope:key` pairs, so a
 * partner can be added or revoked without a code change:
 *
 *   PUBLIC_API_KEYS=all:suimfx_aaa,forexmt24:suimfx_bbb,leofx:suimfx_ccc
 *
 * The scope is an Admin.urlSlug — that key then sees only that broker's own
 * trades, which is what lets three brokers each get their own feed. The scope
 * `all` sees every tenant. A bare key with no `scope:` prefix means `all`.
 *
 * The feed is A-Book only, and "A-Book" means the account holder's CURRENT
 * book type — the one an admin sets in Book Management — not the tag stamped
 * on a trade when it opened. Stamping is what a hedge router needs; a broker
 * reading this feed expects the clients they have on A-Book today, with their
 * history. Moving a client onto A-Book therefore brings their earlier trades
 * into the feed, and moving them off takes those trades back out.
 *
 * B-Book (internal) clients never appear. Demo money never appears either, but
 * that no longer follows from the book tag, so demo accounts are excluded by
 * name below. Prop/challenge accounts are simulated capital and are excluded
 * too.
 */

import express from 'express'
import crypto from 'crypto'
import Trade from '../models/Trade.js'
import TradingAccount from '../models/TradingAccount.js'
import Admin from '../models/Admin.js'
import User from '../models/User.js'
import tradeEngine from '../services/tradeEngine.js'
import lpPriceService from '../services/lpPriceService.js'
import { getAdminUserIds } from '../utils/adminFilter.js'

const router = express.Router()

// A live feed must never be revalidated. Express puts an ETag on every JSON
// response, so two polls whose P&L rounds to the same figure come back as a
// 304 with an empty body — which polling clients read as "no data", and the
// board they drive then freezes. Dropping the conditional headers keeps every
// poll a full 200, and no-store stops clients revalidating in the first place.
router.use((req, res, next) => {
  delete req.headers['if-none-match']
  delete req.headers['if-modified-since']
  res.set('Cache-Control', 'no-store')
  next()
})

const MAX_DAYS = 90
const DEFAULT_DAYS = 30
const MAX_LIMIT = 500

/** Parsed as [{ scope, key }]. A bare entry with no `scope:` prefix is `all`. */
export function loadKeys (raw = process.env.PUBLIC_API_KEYS || '') {
  return raw
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const sep = entry.lastIndexOf(':')
      if (sep === -1) return { scope: 'all', key: entry }
      return { scope: entry.slice(0, sep).trim().toLowerCase(), key: entry.slice(sep + 1).trim() }
    })
    .filter(e => e.key)
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
  const matched = presented && keys.find(k => keyMatches(presented, k.key))
  if (!matched) {
    return res.status(401).json({ success: false, message: 'Invalid or missing API key' })
  }
  req.apiScope = matched.scope
  next()
}

/**
 * The account holders this key may see who are on A-Book right now. `all`
 * spans every tenant; any other scope is an Admin.urlSlug and narrows to that
 * broker's own users.
 *
 * ponytail: loads the whole user-id list per request. Fine at a few thousand
 * users per broker; if a tenant outgrows that, denormalise assignedAdmin onto
 * Trade and filter on it directly.
 */
async function aBookUserIds (scope) {
  if (scope === 'all') {
    const users = await User.find({ bookType: 'A' }).select('_id').lean()
    return users.map(u => u._id)
  }

  const admin = await Admin.findOne({ urlSlug: scope }).select('_id role')
  if (!admin) return []

  const scoped = await getAdminUserIds(admin)
  if (!scoped?.length) return []

  const users = await User.find({ _id: { $in: scoped }, bookType: 'A' }).select('_id').lean()
  return users.map(u => u._id)
}

/**
 * Demo accounts belonging to these users. Selecting trades by the owner's book
 * type means the old `bookType: 'A'` condition no longer keeps demo money out
 * (demo is forced to B-Book at creation), so it has to be excluded explicitly.
 */
async function demoAccountIds (userIds) {
  if (!userIds.length) return []
  const accounts = await TradingAccount.find({ userId: { $in: userIds }, isDemo: true }).select('_id').lean()
  return accounts.map(a => a._id)
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
    lot_size: trade.quantity,
    used_margin: Number((trade.marginUsed || 0).toFixed(2)),
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

    // Trades of the clients who are on A-Book right now, including the ones
    // they opened before an admin moved them there.
    const userIds = await aBookUserIds(req.apiScope)
    const query = { accountType: 'TradingAccount', userId: { $in: userIds } }

    const demoIds = await demoAccountIds(userIds)
    if (demoIds.length) query.tradingAccountId = { $nin: demoIds }

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
