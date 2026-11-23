// Self-check for reverse hedging. Run: node scripts/test_hedgeOrder.mjs
//
// A reversed hedge must flip the side AND swap stop with target. Flipping the
// side alone leaves a sell carrying a stop below its entry, which MT5 rejects.
import assert from 'assert'
import { hedgeOrder } from '../services/mt5Service.js'

const buy = { side: 'BUY', sl: 95, tp: 110 }
const sell = { side: 'SELL', sl: 110, tp: 95 }
const plain = { reverseHedge: false }
const mirrored = { reverseHedge: true }

// Normal hedging copies the client exactly.
assert.deepStrictEqual(hedgeOrder(buy, plain), { reverse: false, clientSide: 'BUY', side: 'BUY', sl: 95, tp: 110 })
assert.deepStrictEqual(hedgeOrder(sell, plain), { reverse: false, clientSide: 'SELL', side: 'SELL', sl: 110, tp: 95 })

// Reversed: side flips and the levels swap, so the stop still sits on the
// losing side of the entry and the target on the winning side.
const rb = hedgeOrder(buy, mirrored)
assert.strictEqual(rb.side, 'SELL')
assert.strictEqual(rb.sl, 110, 'a sell stops out above its entry')
assert.strictEqual(rb.tp, 95, 'and takes profit below it')

const rs = hedgeOrder(sell, mirrored)
assert.strictEqual(rs.side, 'BUY')
assert.strictEqual(rs.sl, 95, 'a buy stops out below its entry')
assert.strictEqual(rs.tp, 110)

// Where the client set no levels, none are invented.
const bare = hedgeOrder({ side: 'BUY' }, mirrored)
assert.strictEqual(bare.side, 'SELL')
assert.strictEqual(bare.sl, undefined)
assert.strictEqual(bare.tp, undefined)

// Only one level set: it moves to the other slot, the empty one stays empty.
const slOnly = hedgeOrder({ side: 'BUY', sl: 95 }, mirrored)
assert.strictEqual(slOnly.tp, 95)
assert.strictEqual(slOnly.sl, undefined)

// Legacy field names are read the same way.
assert.strictEqual(hedgeOrder({ side: 'BUY', stopLoss: 95, takeProfit: 110 }, mirrored).sl, 110)

// A missing user, or one who never had the flag, hedges normally.
assert.strictEqual(hedgeOrder(buy, null).side, 'BUY')
assert.strictEqual(hedgeOrder(buy, {}).side, 'BUY')

// Zero is not a level — it must not become a stop at price 0.
assert.strictEqual(hedgeOrder({ side: 'BUY', sl: 0, tp: 0 }, mirrored).sl, undefined)

console.log('reverse hedge: OK')
process.exit(0)
