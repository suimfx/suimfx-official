// Self-check for the copy-trade push to follower screens.
// Run: node scripts/copyTradeSelfCheck.js   (no database needed)
import assert from 'assert'
import mongoose from 'mongoose'
import tradeEngine from '../services/tradeEngine.js'

const sent = []
global.io = { to: room => ({ emit: (event, payload) => sent.push({ room, event, payload }) }) }

const trade = {
  _id: 't1', tradeId: 'T1', symbol: 'XAUUSD', side: 'BUY', status: 'OPEN',
  quantity: 0.01, openPrice: 4458.68, isCopyTrade: true
}
const oid = new mongoose.Types.ObjectId()

// closeTrade populates tradingAccountId — the room must use the id, not "[object Object]"
tradeEngine.notifyAccount({ _id: oid, balance: 100 }, 'closed', trade)
assert.strictEqual(sent[0].room, `account:${oid.toHexString()}`)
assert.strictEqual(sent[0].event, 'tradesChanged')
assert.strictEqual(sent[0].payload.tradingAccountId, oid.toHexString())
assert.strictEqual(sent[0].payload.event, 'closed')

// Copy engine and pending sweep pass a raw ObjectId; the route passes a string
tradeEngine.notifyAccount(oid, 'opened', trade)
assert.strictEqual(sent[1].room, `account:${oid.toHexString()}`)
tradeEngine.notifyAccount('acc2', 'opened', trade)
assert.strictEqual(sent[2].room, 'account:acc2')

assert.strictEqual(sent[2].payload.trade.isCopyTrade, true, 'followers need isCopyTrade to show the copy popup')
assert.strictEqual(sent[2].payload.trade.openPrice, 4458.68)

tradeEngine.notifyAccount(null, 'opened', trade)
assert.strictEqual(sent.length, 3, 'no account id means no emit')

delete global.io
assert.doesNotThrow(() => tradeEngine.notifyAccount('acc3', 'opened', trade), 'must not throw before Socket.IO is up')

console.log('copy-trade push: OK')
process.exit(0)
