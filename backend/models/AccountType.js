import mongoose from 'mongoose'

const accountTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  // Admin who created this account type (null = Super Admin / global)
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  description: {
    type: String,
    default: ''
  },
  minDeposit: {
    type: Number,
    required: true,
    min: 0
  },
  leverage: {
    type: String,
    required: true,
    default: '1:100'
  },
  exposureLimit: {
    type: Number,
    default: 0
  },
  minSpread: {
    type: Number,
    default: 0
  },
  commission: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDemo: {
    type: Boolean,
    default: false
  },
  demoBalance: {
    type: Number,
    default: 10000
  }
}, { timestamps: true })

export default mongoose.model('AccountType', accountTypeSchema)
