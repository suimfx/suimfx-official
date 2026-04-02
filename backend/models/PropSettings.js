import mongoose from 'mongoose'

const propSettingsSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
    index: true
  },
  challengeModeEnabled: {
    type: Boolean,
    default: false
  },
  displayName: {
    type: String,
    default: 'Prop Trading Challenge'
  },
  description: {
    type: String,
    default: 'Trade with our capital. Pass the challenge and get funded.'
  },
  termsAndConditions: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
})

// Per-admin settings (inherits from global on first creation)
propSettingsSchema.statics.getSettings = async function(adminId) {
  if (adminId) {
    let settings = await this.findOne({ adminId })
    if (!settings) {
      // Inherit from global settings if they exist
      const global = await this.findOne({ adminId: null })
      settings = await this.create({
        adminId,
        challengeModeEnabled: global?.challengeModeEnabled || false,
        displayName: global?.displayName || 'Prop Trading Challenge',
        description: global?.description || 'Trade with our capital. Pass the challenge and get funded.',
        termsAndConditions: global?.termsAndConditions || ''
      })
    }
    return settings
  }
  // Fallback: global settings (legacy)
  let settings = await this.findOne({ adminId: null })
  if (!settings) {
    settings = await this.create({})
  }
  return settings
}

propSettingsSchema.statics.updateSettings = async function(updates, adminId) {
  let settings = adminId
    ? await this.findOne({ adminId })
    : await this.findOne({ adminId: null })
  if (!settings) {
    settings = new this({ adminId: adminId || null })
  }
  
  Object.assign(settings, updates)
  settings.updatedAt = new Date()
  settings.updatedBy = adminId
  await settings.save()
  return settings
}

export default mongoose.model('PropSettings', propSettingsSchema)
