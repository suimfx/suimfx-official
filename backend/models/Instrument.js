import mongoose from 'mongoose'

const instrumentSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  segment: {
    type: String,
    enum: ['Forex', 'Crypto', 'Commodities', 'Indices'],
    required: true
  },
  baseCurrency: {
    type: String,
    required: true
  },
  quoteCurrency: {
    type: String,
    required: true
  },
  contractSize: {
    type: Number,
    default: 100000
  },
  pipSize: {
    type: Number,
    default: 0.0001
  },
  pipValue: {
    type: Number,
    default: 10
  },
  minLotSize: {
    type: Number,
    default: 0.01
  },
  maxLotSize: {
    type: Number,
    default: 100
  },
  lotStep: {
    type: Number,
    default: 0.01
  },
  tradingViewSymbol: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Optional: synced from Corecen LP bulk upsert
  assetClass: { type: String, default: null },
  bookType: { type: String, default: null },
  markupBps: { type: Number, default: 0 },
  commissionPerLot: { type: Number, default: null },
  marginPercent: { type: Number, default: null },
  precision: { type: Number, default: null },
  source: { type: String, default: null }
}, { timestamps: true })

export default mongoose.model('Instrument', instrumentSchema)
