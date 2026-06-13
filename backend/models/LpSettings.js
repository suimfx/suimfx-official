import mongoose from 'mongoose'

// Single-document store for the Liquidity Provider connection settings so the
// admin's Book Management → LP Connection Settings persist across restarts.
// Previously these lived only in memory (runtime) and reverted to the env /
// corecen default on every refresh.
const lpSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'lp_config', unique: true },
    lpApiUrl: { type: String, default: '' },
    corecenWsUrl: { type: String, default: '' },
    lpApiKey: { type: String, default: '' },
    lpApiSecret: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.model('LpSettings', lpSettingsSchema)
