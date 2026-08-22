import mongoose from 'mongoose'

// Last known bid/ask per symbol, persisted so the price cache survives a restart
// and a feed outage (Infoway 429 / market closed). On startup these seed the
// in-memory cache, so instruments and quotes still show — as the LAST KNOWN price
// — instead of the list going blank when no live tick is flowing.
const lastPriceSchema = new mongoose.Schema({
  symbol: { type: String, unique: true, required: true },
  bid: Number,
  ask: Number,
  mid: Number,
  timestamp: Number, // ms of the last real tick
  source: String,
}, { timestamps: true })

export default mongoose.model('LastPrice', lastPriceSchema)
