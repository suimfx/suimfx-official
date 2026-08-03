import mongoose from 'mongoose'

// MetaApi credentials — single global document, same shape as LpSettings.
//
// Deliberately NOT merged into LpSettings: that document is read and written by
// routes/bookManagement.js, which is gated on the bookManagement sidebar
// permission — a permission a plain ADMIN can hold. The MetaApi token is
// Super-Admin-only, so it needs its own collection behind its own route.
const mtSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'metaapi_config', unique: true },
    metaApiToken: { type: String, default: '' },
    region: { type: String, default: '' }, // '' = MetaApi default region
    enabled: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.model('MtSettings', mtSettingsSchema)
