import mongoose from 'mongoose'

const emailSettingsSchema = new mongoose.Schema({
  // Per-tenant email config. null = the platform/global settings (Super Admin).
  // A white-label admin (e.g. FXCRESTAA) gets its own row so its users' emails
  // and login OTP go out from its own domain, without touching other tenants.
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
    index: true
  },
  smtpEnabled: {
    type: Boolean,
    default: false
  },
  smtpHost: {
    type: String,
    default: ''
  },
  smtpPort: {
    type: Number,
    default: 587
  },
  smtpUser: {
    type: String,
    default: ''
  },
  smtpPass: {
    type: String,
    default: ''
  },
  smtpSecure: {
    type: Boolean,
    default: false
  },
  fromEmail: {
    type: String,
    default: ''
  },
  fromName: {
    type: String,
    default: 'Trading Platform'
  },
  // Signup email verification OTP (existing behaviour).
  otpVerificationEnabled: {
    type: Boolean,
    default: false
  },
  // Login two-factor: email an OTP on sign-in before issuing the token.
  // Separate flag so enabling login 2FA does not change signup behaviour.
  loginOtpEnabled: {
    type: Boolean,
    default: false
  },
  otpExpiryMinutes: {
    type: Number,
    default: 10
  }
}, { timestamps: true })

// Resolve the effective settings for a tenant: the admin's own row if present,
// otherwise fall back to the global (adminId null) row. Never throws.
emailSettingsSchema.statics.getForAdmin = async function (adminId = null) {
  if (adminId) {
    const own = await this.findOne({ adminId })
    if (own) return own
  }
  return await this.findOne({ $or: [{ adminId: null }, { adminId: { $exists: false } }] })
}

export default mongoose.model('EmailSettings', emailSettingsSchema)
