import mongoose from 'mongoose'

const adminSchema = new mongoose.Schema({
  // Basic Info
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    default: ''
  },
  
  // Admin Type
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'ADMIN'],
    default: 'ADMIN'
  },
  
  // Unique URL slug for this admin's users
  urlSlug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  
  // Referral code for user signup (e.g., ?ref=JOHN123)
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true
  },
  
  // Custom domain for this admin (optional)
  customDomain: {
    type: String,
    default: null
  },
  
  // Commission rate: % Super Admin takes from this admin's profit
  commissionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Company/Brand Info for this admin
  brandName: {
    type: String,
    default: ''
  },
  logo: {
    type: String,
    default: ''
  },
  
  // Parent admin (for sub-admins created by super admin)
  parentAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  
  // Sidebar Permissions - which menu items this admin can see
  // For ADMIN role, all defaults are FALSE - SuperAdmin must explicitly grant permissions
  // For SUPER_ADMIN, all sidebar items are visible
  sidebarPermissions: {
    overviewDashboard: { type: Boolean, default: true }, // Always visible
    userManagement: { type: Boolean, default: false },
    tradeManagement: { type: Boolean, default: false },
    bookManagement: { type: Boolean, default: false },
    fundManagement: { type: Boolean, default: false },
    bankSettings: { type: Boolean, default: true },
    ibManagement: { type: Boolean, default: false },
    forexCharges: { type: Boolean, default: false },
    earningsReport: { type: Boolean, default: false },
    copyTrade: { type: Boolean, default: false },
    propFirmChallenges: { type: Boolean, default: false },
    accountTypes: { type: Boolean, default: false },
    themeSettings: { type: Boolean, default: false },
    emailTemplates: { type: Boolean, default: false },
    bonusManagement: { type: Boolean, default: false },
    bannerManagement: { type: Boolean, default: false },
    adminManagement: { type: Boolean, default: false },
    employeeManagement: { type: Boolean, default: true },
    kycVerification: { type: Boolean, default: false },
    supportTickets: { type: Boolean, default: false }
  },
  
  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'PENDING'],
    default: 'ACTIVE'
  },
  
  // Stats
  stats: {
    totalUsers: { type: Number, default: 0 },
    totalDeposits: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
    totalTrades: { type: Number, default: 0 }
  },
  
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

export default mongoose.model('Admin', adminSchema)
