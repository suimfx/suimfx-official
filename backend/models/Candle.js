import mongoose from 'mongoose'

const candleSchema = new mongoose.Schema(
  {
    symbol:    { type: String, required: true, uppercase: true, index: true },
    timeframe: { type: String, required: true, default: '1m' },
    time:      { type: Number, required: true },
    open:      { type: Number, required: true },
    high:      { type: Number, required: true },
    low:       { type: Number, required: true },
    close:     { type: Number, required: true },
  },
  { timestamps: true }
)

candleSchema.index({ symbol: 1, timeframe: 1, time: 1 }, { unique: true })

const Candle = mongoose.model('Candle', candleSchema)

export default Candle
