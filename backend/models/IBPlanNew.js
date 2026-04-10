import mongoose from 'mongoose'

const ibPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  maxLevels: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 3
  },
  commissionType: {
    type: String,
    enum: ['PER_LOT', 'PERCENT'],
    default: 'PER_LOT'
  },
  levels: [{
    level: {
      type: Number,
      required: true
    },
    rate: {
      type: Number,
      required: true,
      default: 0
    }
  }],
  source: {
    spread: {
      type: Boolean,
      default: true
    },
    tradeCommission: {
      type: Boolean,
      default: true
    },
    swap: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

// Unique plan name per admin
ibPlanSchema.index({ name: 1, adminId: 1 }, { unique: true })

// Get default plan (scoped to admin)
ibPlanSchema.statics.getDefaultPlan = async function(adminId = null) {
  const query = { name: 'Default', isActive: true }
  if (adminId) query.adminId = adminId
  let plan = await this.findOne(query)
  if (!plan) {
    plan = await this.create({
      name: 'Default',
      adminId: adminId || null,
      maxLevels: 3,
      commissionType: 'PER_LOT',
      levels: [
        { level: 1, rate: 5 },
        { level: 2, rate: 3 },
        { level: 3, rate: 1 }
      ],
      source: {
        spread: true,
        tradeCommission: true,
        swap: false
      }
    })
  }
  return plan
}

// Get rate for a specific level
ibPlanSchema.methods.getRateForLevel = function(level) {
  const levelConfig = this.levels.find(l => l.level === level)
  return levelConfig ? levelConfig.rate : 0
}

export default mongoose.model('IBPlan', ibPlanSchema)
