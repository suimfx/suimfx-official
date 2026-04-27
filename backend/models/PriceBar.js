import mongoose from 'mongoose'

// One document per (symbol, resolution='1', bucketOpenMs).
// Only the 1-minute base resolution is stored; higher resolutions (5m, 15m, 1h, 1D...)
// are aggregated on read in routes/prices.js:GET /bars.
//
// Bars come from two sources that both write into this collection:
//   1. barAggregator flushes each 1m bucket built from live Corecen LP ticks
//   2. one-shot Binance backfill on first sight of a crypto symbol
// Both paths upsert by { symbol, resolution, t } so they never duplicate.
const priceBarSchema = new mongoose.Schema({
  symbol: { type: String, required: true, uppercase: true, trim: true },
  resolution: { type: String, required: true, default: '1' },
  // Bucket open time in ms since epoch, floor-aligned to the resolution boundary (UTC).
  t: { type: Number, required: true },
  o: { type: Number, required: true },
  h: { type: Number, required: true },
  l: { type: Number, required: true },
  c: { type: Number, required: true },
  // Tick count within the bar — LP doesn't provide real traded volume, so this
  // is an activity proxy. Keep this in mind if you ever wire it to indicators
  // that assume real volume semantics.
  v: { type: Number, default: 0 },
  // Free-form origin tag so we can tell LP-built bars from Binance-backfilled bars.
  src: { type: String, default: 'lp' },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false })

// Primary lookup path: find all bars for (symbol, resolution) in a time range.
priceBarSchema.index({ symbol: 1, resolution: 1, t: 1 }, { unique: true })

// TTL: expire rows 90 days after their last update. Set on `updatedAt` so that
// actively-maintained bars (i.e. the currently-forming one getting debounced
// upserts) don't age out while they're still the live bar.
priceBarSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 })

export default mongoose.model('PriceBar', priceBarSchema)
