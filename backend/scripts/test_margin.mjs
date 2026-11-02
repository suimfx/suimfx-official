// Self-check for margin. Run: node scripts/test_margin.mjs
//
// Margin is charged on a position's BASE currency, the way MT5 and Exness do
// it. Multiplying by the quote price only coincides with that when the quote
// currency is the account currency.
import assert from 'assert'
import tradeEngine from '../services/tradeEngine.js'
import lpPriceService from '../services/lpPriceService.js'

const m = (...a) => tradeEngine.calculateMargin(...a)

// Quote is USD: the trade price IS the base price. Matches Exness exactly.
assert.strictEqual(m(0.01, 4173, '1:100', 100, 'XAUUSD'), 41.73)
assert.strictEqual(m(0.01, 4173, '1:500', 100, 'XAUUSD'), 8.35, 'five times the leverage, a fifth of the margin')
assert.strictEqual(m(0.01, 1.08, 100, 100000, 'EURUSD'), 10.8)
assert.strictEqual(m(0.01, 81348, 100, 1, 'BTCUSD'), 8.13)

// Base is USD: the quote rate must not inflate it. One lot of USDCAD locks
// $100,000 whatever CAD is doing.
assert.strictEqual(m(0.01, 1.37, 100, 100000, 'USDCAD'), 10)
assert.strictEqual(m(0.01, 150.2, 100, 100000, 'USDJPY'), 10, 'the old formula charged 1502 here')

// Cross: priced off the base leg against USD, not off the quote price.
lpPriceService.getPriceCache().set('EURUSD', { bid: 1.08, ask: 1.08 })
assert.strictEqual(m(0.01, 165.2, 100, 100000, 'EURJPY'), 10.8)

// Cross with no feed for the base leg: a fiat base falls back to 1 rather than
// to the quote price, which would have demanded 1905 for a 0.01 lot.
lpPriceService.getPriceCache().delete('GBPUSD')
assert.strictEqual(m(0.01, 190.5, 100, 100000, 'GBPJPY'), 10)

// A metal base is nowhere near 1, so it keeps the conservative fallback.
lpPriceService.getPriceCache().delete('XAUUSD')
assert.strictEqual(m(0.01, 3800, 100, 100, 'XAUEUR'), 38)

// No symbol passed (older callers): unchanged behaviour.
assert.strictEqual(m(0.01, 1.08, 100, 100000), 10.8)

console.log('margin: OK')
process.exit(0)
