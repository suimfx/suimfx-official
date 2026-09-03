// Self-check for the partner trade feed mapping. Run: node scripts/test_publicApi.mjs
import assert from 'assert'
import { formatTrade, loadKeys } from '../routes/publicApi.js'

const base = {
  tradeId: 'T123', symbol: 'EURUSD', quantity: 0.01, contractSize: 100000,
  leverage: 100, marginUsed: 10
}

const closed = formatTrade({
  ...base, side: 'BUY', status: 'CLOSED', openPrice: 1.0, closePrice: 1.05,
  realizedPnl: 50, floatingPnl: 999,
  openedAt: '2026-08-17T10:30:00Z', closedAt: '2026-08-17T12:45:00Z'
}, 'ACC1001')

assert.deepStrictEqual(closed, {
  trade_id: 'T123', username: 'ACC1001', symbol: 'EURUSD', position: 'Buy',
  lot_size: 0.01, used_margin: 10,
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
assert.strictEqual(open.lot_size, 0.01, 'lot size is the raw volume, never rounded away')
assert.strictEqual(open.used_margin, 10, 'used margin is reported on open trades too')

// A trade stored before marginUsed existed must not break the feed.
assert.strictEqual(formatTrade({ ...base, marginUsed: undefined, side: 'BUY', status: 'OPEN' }, 'x').used_margin, 0)

// ── Key scoping ──────────────────────────────────────────────────────────────
assert.deepStrictEqual(
  loadKeys('all:suimfx_aaa, forexmt24:suimfx_bbb ,leofx:suimfx_ccc'),
  [
    { scope: 'all', key: 'suimfx_aaa' },
    { scope: 'forexmt24', key: 'suimfx_bbb' },
    { scope: 'leofx', key: 'suimfx_ccc' }
  ]
)

// A key issued before scoping existed keeps working, platform-wide.
assert.deepStrictEqual(loadKeys('suimfx_legacy'), [{ scope: 'all', key: 'suimfx_legacy' }])

// A slug is case-insensitive, but the key itself must never be lowercased.
assert.deepStrictEqual(loadKeys('FxCrestaa:suimfx_AbC'), [{ scope: 'fxcrestaa', key: 'suimfx_AbC' }])

assert.deepStrictEqual(loadKeys(''), [], 'no keys configured means no access, not open access')
assert.deepStrictEqual(loadKeys('leofx:'), [], 'a scope with an empty key must not authenticate')

console.log('publicApi mapping + key scoping: OK')
