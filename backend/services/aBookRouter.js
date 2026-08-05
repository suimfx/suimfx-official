import lpService from './lpService.js'
import mt5Service from './mt5Service.js'
import Mt5Account from '../models/Mt5Account.js'

// Where an A-Book trade goes. A user tagged to an active MT5 account routes to
// MT5; everyone else keeps going to Corecen exactly as before. All the per-user
// routing lives here so tradeEngine's hooks stay one-liners.

const activeAccount = async (mt5AccountId) => {
  if (!mt5AccountId) return null
  const acc = await Mt5Account.findById(mt5AccountId).lean()
  return acc?.isActive ? acc : null
}

export async function routeOpen(trade, user) {
  const acc = await activeAccount(user?.mt5AccountId)
  if (acc) {
    const r = await mt5Service.pushTrade(trade, user, acc)
    return { ...r, destination: 'MT5', mt5AccountId: acc._id, positionId: r.positionId }
  }
  if (lpService.isConfigured()) {
    const r = await lpService.pushTradeToCorecen(trade, user)
    return { ...r, destination: 'CORECEN' }
  }
  return { success: false, message: 'No A-Book destination configured' }
}

export async function routeClose(trade) {
  // Read the destination off the trade, not the user — the user may have been
  // re-tagged since this position was opened.
  const acc = await activeAccount(trade.mt5AccountId)
  if (acc) return { ...(await mt5Service.closeTrade(trade, acc)), destination: 'MT5' }
  if (lpService.isConfigured()) {
    return { ...(await lpService.closeTradeOnCorecen(trade)), destination: 'CORECEN' }
  }
  return { success: false, message: 'No A-Book destination configured' }
}

/**
 * Write the outcome of a routeOpen() onto the trade and save it. Three callers
 * need exactly this — openTrade, the pending-order fill, and the manual retry —
 * so it lives here rather than being copied into each of them.
 *
 * aBookError holds the venue's rejection text ("Unknown symbol", "not enough
 * money"). Without it a failed hedge is only visible in the server logs, which
 * is no use to the admin who has to fix it.
 */
export async function recordOpenResult(trade, hedge) {
  if (hedge.success) {
    trade.lpPushed = true
    trade.lpPushedAt = new Date()
    trade.lpSyncStatus = 'PUSHED'
    trade.aBookDestination = hedge.destination
    trade.aBookError = ''
    if (hedge.destination === 'MT5') {
      trade.mt5AccountId = hedge.mt5AccountId
      trade.aBookOrderId = hedge.positionId || null
      trade.aBookExecuted = true
    }
  } else {
    trade.lpSyncStatus = 'FAILED'
    trade.aBookError = hedge.error || hedge.message || 'Push failed'
  }
  await trade.save()
  return hedge
}

export async function routeModify(trade) {
  const acc = await activeAccount(trade.mt5AccountId)
  if (!acc) return { success: false, message: 'Not an MT5 trade' }
  return { ...(await mt5Service.updateTrade(trade, acc)), destination: 'MT5' }
}

export default { routeOpen, routeClose, routeModify, recordOpenResult }
