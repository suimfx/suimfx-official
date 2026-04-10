import mongoose from 'mongoose'

const ibSettingsSchema = new mongoose.Schema({
  settingsType: {
    type: String,
    default: 'GLOBAL'
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  // IB Requirements
  ibRequirements: {
    kycRequired: { type: Boolean, default: true },
    minAccountAge: { type: Number, default: 0 }, // Days
    minBalance: { type: Number, default: 0 }
  },
  // Commission settings
  commissionSettings: {
    settlementType: { type: String, enum: ['REALTIME', 'DAILY'], default: 'REALTIME' },
    minWithdrawalAmount: { type: Number, default: 50 },
    withdrawalApprovalRequired: { type: Boolean, default: true }
  },
  // Feature toggles
  isEnabled: {
    type: Boolean,
    default: true
  },
  allowNewApplications: {
    type: Boolean,
    default: true
  },
  autoApprove: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

// Unique settings per admin
ibSettingsSchema.index({ settingsType: 1, adminId: 1 }, { unique: true })

// Static method to get settings (scoped to admin)
ibSettingsSchema.statics.getSettings = async function(adminId = null) {
  const query = { settingsType: 'GLOBAL' }
  if (adminId) query.adminId = adminId
  let settings = await this.findOne(query)
  if (!settings) {
    settings = await this.create({ settingsType: 'GLOBAL', adminId: adminId || null })
  }
  return settings
}

export default mongoose.model('IBSettings', ibSettingsSchema)
