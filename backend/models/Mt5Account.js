import mongoose from 'mongoose'

// One connected MT5 account. Many users can be tagged to the same account
// (User.mt5AccountId), but a user can only ever point at one.
const mt5AccountSchema = new mongoose.Schema(
  {
    label: { type: String, default: '' },
    metaApiAccountId: { type: String, required: true, unique: true },

    // Fetched from MetaApi on connect — display only.
    login: { type: String, default: '' },
    server: { type: String, default: '' },

    // Broker symbol naming. Most brokers are just our symbol + a suffix
    // ('EURUSD.m'); symbolOverrides covers the ones that rename outright
    // ('XAUUSD' -> 'GOLD'). Populate both from the Fetch Symbols action.
    symbolSuffix: { type: String, default: '' },
    symbolOverrides: { type: Map, of: String, default: {} },

    isActive: { type: Boolean, default: true },
    lastError: { type: String, default: '' },
    lastCheckedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export default mongoose.model('Mt5Account', mt5AccountSchema)
