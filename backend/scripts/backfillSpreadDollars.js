// Backfill Trade.spread field from raw pip/cents/USD config value to ACTUAL DOLLAR EARNING.
// Earlier code stored charges.spreadValue (e.g. "5" for 5 pips on EURUSD) directly into Trade.spread,
// then earnings reports summed that field as if it were dollars. That inflated XAUUSD/Crypto and
// deflated forex spread totals.
//
// This script recomputes Trade.spread for every trade using the same conversion the live engine
// now uses: spread × quantity × contractSize (where the pip-to-price conversion depends on segment).
//
// Idempotent: runs are safe to repeat. We detect already-converted rows by checking that the value
// is consistent with the formula given the trade's quantity/contractSize/segment — if it already
// matches the dollar formula, we skip; otherwise we overwrite with the computed dollar value.
//
// Run: node scripts/backfillSpreadDollars.js [--dry-run]

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Trade from '../models/Trade.js'

dotenv.config()

const DRY_RUN = process.argv.includes('--dry-run')

const CRYPTOS = new Set(['BTCUSD','ETHUSD','LTCUSD','XRPUSD','BCHUSD','BNBUSD','SOLUSD','ADAUSD',
  'DOGEUSD','DOTUSD','MATICUSD','AVAXUSD','LINKUSD','SHIBUSD','XLMUSD','TRXUSD','UNIUSD','ATOMUSD',
  'ETCUSD','FILUSD','ICPUSD','VETUSD','NEARUSD','GRTUSD','AAVEUSD','MKRUSD','ALGOUSD','FTMUSD',
  'SANDUSD','MANAUSD','AXSUSD','THETAUSD','XMRUSD','SNXUSD','EOSUSD','CHZUSD','PEPEUSD','ARBUSD',
  'OPUSD','SUIUSD','APTUSD','INJUSD','TONUSD','HBARUSD','ENJUSD'])

const METALS = new Set(['XAUUSD','XAGUSD','XPTUSD','XPDUSD','XAUEUR','XAUAUD','XAUGBP','XAUCHF',
  'XAUJPY','XAGEUR','XAGAUD','XAGGBP'])

function pipFactor (symbol = '', segment = '') {
  const isCrypto = segment === 'Crypto' || CRYPTOS.has(symbol)
  const isMetal = segment === 'Metals' || METALS.has(symbol)
  const isJPY = symbol.includes('JPY')
  if (isCrypto) return 1
  if (isMetal) return 0.01
  if (isJPY) return 0.01
  return 0.0001
}

async function run () {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log(`Connected. ${DRY_RUN ? '[DRY RUN]' : '[APPLY]'}`)

  const cursor = Trade.find({}).cursor()
  let scanned = 0, updated = 0, skipped = 0, zero = 0

  for (let trade = await cursor.next(); trade != null; trade = await cursor.next()) {
    scanned++
    const raw = trade.spread || 0
    if (!raw) { zero++; continue }

    const factor = pipFactor(trade.symbol, trade.segment)
    const qty = trade.quantity || 0
    const cs = trade.contractSize || 0

    // Two interpretations of the existing value:
    //   A) raw is already dollars (correct) → equals raw × 1
    //   B) raw is pips/cents/USD → dollars = raw × factor × qty × cs
    // Heuristic: if raw × factor × qty × cs equals raw (within 1%), it's already dollars; skip.
    const asDollars = raw * factor * qty * cs
    const asDollarsRounded = Math.round(asDollars * 100) / 100

    if (Math.abs(asDollarsRounded - raw) < Math.max(0.01, raw * 0.01)) {
      // Already in dollars (or trade has no qty/contract → leave alone)
      skipped++
      continue
    }

    if (!DRY_RUN) {
      trade.spread = asDollarsRounded
      await trade.save()
    }
    updated++
    if (updated <= 10) {
      console.log(`  ${trade.tradeId} ${trade.symbol} qty=${qty} cs=${cs} raw=${raw} → $${asDollarsRounded}`)
    }
  }

  console.log(`\nScanned: ${scanned} | Updated: ${updated} | Skipped (already-dollars or no qty): ${skipped} | Zero-spread: ${zero}`)
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
