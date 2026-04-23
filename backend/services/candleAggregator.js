import Candle from '../models/Candle.js'

const TIMEFRAME = '1m'
const BUCKET_SECONDS = 60

const currentBars = new Map()

const bucketOf = (tsSec) => Math.floor(tsSec / BUCKET_SECONDS) * BUCKET_SECONDS

const persistBar = async (symbol, bar) => {
  try {
    await Candle.updateOne(
      { symbol, timeframe: TIMEFRAME, time: bar.time },
      { $set: { open: bar.open, high: bar.high, low: bar.low, close: bar.close } },
      { upsert: true }
    )
  } catch (err) {
    if (err.code === 11000) return
    console.error('[candleAggregator] persist error:', symbol, bar.time, err.message)
  }
}

export const processTick = (symbol, price, timestampMs = Date.now()) => {
  if (!symbol || !Number.isFinite(price)) return
  const sym = String(symbol).toUpperCase()
  const tsSec = Math.floor(timestampMs / 1000)
  const bucket = bucketOf(tsSec)

  const existing = currentBars.get(sym)

  if (!existing) {
    currentBars.set(sym, { time: bucket, open: price, high: price, low: price, close: price })
    return
  }

  if (bucket === existing.time) {
    if (price > existing.high) existing.high = price
    if (price < existing.low)  existing.low  = price
    existing.close = price
    return
  }

  const finished = existing
  currentBars.set(sym, { time: bucket, open: price, high: price, low: price, close: price })
  persistBar(sym, finished)
}

export const processBidAsk = (symbol, bid, ask, timestampMs = Date.now()) => {
  const b = Number(bid)
  const a = Number(ask)
  let price
  if (Number.isFinite(b) && b > 0) price = b
  else if (Number.isFinite(a) && a > 0) price = a
  else return
  processTick(symbol, price, timestampMs)
}

export const getCurrentBar = (symbol) => {
  if (!symbol) return null
  return currentBars.get(String(symbol).toUpperCase()) || null
}

let flushTimer = null
export const startPeriodicFlush = (intervalMs = 5000) => {
  if (flushTimer) return
  flushTimer = setInterval(() => {
    currentBars.forEach((bar, symbol) => {
      persistBar(symbol, { ...bar })
    })
  }, intervalMs)
  console.log(`[candleAggregator] periodic flush started (every ${intervalMs}ms)`)
}

export const stopPeriodicFlush = () => {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
}

export default { processTick, processBidAsk, getCurrentBar, startPeriodicFlush, stopPeriodicFlush }
