import mongoose from 'mongoose'

const themeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  // Whose theme this is. null = the platform default, which every tenant falls
  // back to until it sets one of its own. Without this the whole platform shared
  // a single active theme, so giving one broker its colours repainted them all.
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
    index: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  colors: {
    // Primary colors
    primary: { type: String, default: '#3B82F6' },        // Blue
    primaryHover: { type: String, default: '#2563EB' },
    secondary: { type: String, default: '#10B981' },      // Green
    secondaryHover: { type: String, default: '#059669' },
    
    // Accent colors
    accent: { type: String, default: '#F59E0B' },         // Amber/Gold
    accentHover: { type: String, default: '#D97706' },
    
    // Background colors
    bgPrimary: { type: String, default: '#000000' },      // Black
    bgSecondary: { type: String, default: '#0D0D0D' },    // Dark gray
    bgCard: { type: String, default: '#1A1A1A' },         // Card background
    bgHover: { type: String, default: '#262626' },        // Hover state
    
    // Text colors
    textPrimary: { type: String, default: '#FFFFFF' },    // White
    textSecondary: { type: String, default: '#9CA3AF' },  // Gray
    textMuted: { type: String, default: '#6B7280' },      // Muted gray
    
    // Border colors
    border: { type: String, default: '#374151' },         // Gray border
    borderLight: { type: String, default: '#4B5563' },
    
    // Status colors
    success: { type: String, default: '#10B981' },        // Green
    error: { type: String, default: '#EF4444' },          // Red
    warning: { type: String, default: '#F59E0B' },        // Yellow
    info: { type: String, default: '#3B82F6' },           // Blue
    
    // Trading colors
    buyColor: { type: String, default: '#3B82F6' },       // Blue for buy
    sellColor: { type: String, default: '#EF4444' },      // Red for sell
    profitColor: { type: String, default: '#10B981' },    // Green for profit
    lossColor: { type: String, default: '#EF4444' },      // Red for loss
    
    // Sidebar colors
    sidebarBg: { type: String, default: '#0D0D0D' },
    sidebarText: { type: String, default: '#9CA3AF' },
    sidebarActive: { type: String, default: '#3B82F6' },
    
    // Button colors
    buttonPrimary: { type: String, default: '#3B82F6' },
    buttonSecondary: { type: String, default: '#374151' },
    buttonDanger: { type: String, default: '#EF4444' }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
})

// Theme names are per-tenant: two brokers may both want one called "Light".
// A global unique index on name would let whoever created it first block
// everyone else, the same trap AccountType and IBPlan already had to undo.
themeSchema.index({ name: 1, adminId: 1 }, { unique: true })

// One active theme per tenant. Scoped to adminId on purpose — activating a
// broker's theme must not switch off the platform's or another broker's.
themeSchema.pre('save', async function(next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, adminId: this.adminId ?? null },
      { isActive: false }
    )
  }
  next()
})

/**
 * The theme to paint for one tenant: its own active theme, or the platform
 * default when it has none. Called with no argument for the platform itself.
 */
themeSchema.statics.getActiveTheme = async function(adminId = null) {
  if (adminId) {
    const own = await this.findOne({ adminId, isActive: true })
    if (own) return own
  }

  let theme = await this.findOne({ adminId: null, isActive: true })
  if (!theme) {
    theme = await this.findOne({ adminId: null, name: 'Default Blue' })
    if (!theme) {
      theme = await this.create({ name: 'Default Blue', isActive: true, adminId: null })
    }
  }
  return theme
}

export default mongoose.model('Theme', themeSchema)
