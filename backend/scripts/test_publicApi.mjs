// Self-check for the partner trade feed mapping. Run: node scripts/test_publicApi.mjs
import assert from 'assert'
import { formatTrade } from '../routes/publicApi.js'

const base = { tradeId: 'T123', symbol: 'EURUSD', quantity: 0.01, contractSize: 100000 }

const closed = formatTrade({
  ...base, side: 'BUY', status: 'CLOSED', openPrice: 1.0, closePrice: 1.05,
  realizedPnl: 50, floatingPnl: 999,
  openedAt: '2026-08-17T10:30:00Z', closedAt: '2026-08-17T12:45:00Z'
}, 'ACC1001')

assert.deepStrictEqual(closed, {
  trade_id: 'T123', username: 'ACC1001', symbol: 'EURUSD', position: 'Buy',
  open_amount: 1000, close_amount: 1050, pnl: 50,
  open_datetime: '2026-08-17T10:30:00.000Z',
  close_datetime: '2026-08-17T12:45:00.000Z', status: 'Closed'
})

const open = formatTrade({
  ...base, side: 'SELL', status: 'OPEN', openPrice: 1.0, closePrice: null,
  realizedPnl: null, floatingPnl: -12.345, openedAt: '2026-08-17T10:30:00Z', closedAt: null
}, 'ACC1001')

assert.strictEqual(open.position, 'Sell')
assert.strictEqual(open.status, 'Open')
assert.strictEqual(open.close_amount, null, 'open trade must not invent a close amount')
assert.strictEqual(open.close_datetime, null)
assert.strictEqual(open.pnl, -12.35, 'open trade reports floating pnl, rounded')

console.log('publicApi mapping: OK')
