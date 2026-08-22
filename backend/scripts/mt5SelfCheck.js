// Self-check for the pure MT5 mapping logic — the two things that silently get
// every order rejected by the broker if they drift: the symbol name and the lot
// size. No DB, no network, no MetaApi token needed.
//
//   node scripts/mt5SelfCheck.js
import assert from 'node:assert/strict'
import mt5Service from '../services/mt5Service.js'

const { mapSymbol, normalizeVolume } = mt5Service

// mapSymbol — plain
assert.equal(mt5Service.mapSymbol('EURUSD', {}), 'EURUSD')
assert.equal(mt5Service.mapSymbol('EURUSD', { symbolSuffix: '' }), 'EURUSD')

// mapSymbol — suffix
assert.equal(mt5Service.mapSymbol('EURUSD', { symbolSuffix: '.m' }), 'EURUSD.m')
assert.equal(mt5Service.mapSymbol('XAUUSD', { symbolSuffix: '.raw' }), 'XAUUSD.raw')

// mapSymbol — override beats suffix, for both a hydrated Map and the plain
// object a .lean() query hands back
const asMap = { symbolSuffix: '.m', symbolOverrides: new Map([['XAUUSD', 'GOLD']]) }
const asLean = { symbolSuffix: '.m', symbolOverrides: { XAUUSD: 'GOLD' } }
assert.equal(mt5Service.mapSymbol('XAUUSD', asMap), 'GOLD')
assert.equal(mt5Service.mapSymbol('XAUUSD', asLean), 'GOLD')
// a symbol with no override still gets the suffix
assert.equal(mt5Service.mapSymbol('EURUSD', asMap), 'EURUSD.m')
assert.equal(mt5Service.mapSymbol('EURUSD', asLean), 'EURUSD.m')

// normalizeVolume — MT5 rejects anything finer than a 0.01 lot step
assert.equal(mt5Service.normalizeVolume(0.1), 0.1)
assert.equal(mt5Service.normalizeVolume(1), 1)
assert.equal(mt5Service.normalizeVolume(0.156), 0.16)
assert.equal(mt5Service.normalizeVolume(0.144), 0.14)
// below the minimum lot, floor to it rather than sending a 0-volume order
assert.equal(mt5Service.normalizeVolume(0.001), 0.01)
assert.equal(mt5Service.normalizeVolume(0), 0.01)

console.log('mt5SelfCheck: all assertions passed')
process.exit(0)
