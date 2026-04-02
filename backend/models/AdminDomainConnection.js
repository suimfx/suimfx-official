import mongoose from 'mongoose'
import crypto from 'crypto'

const adminDomainConnectionSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    unique: true,
    index: true
  },
  hostname: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  // Status flow: pending_dns → dns_mismatch / connected
  status: {
    type: String,
    enum: ['pending_dns', 'dns_mismatch', 'connected'],
    default: 'pending_dns'
  },
  // SSL status after domain is connected
  ssl_status: {
    type: String,
    enum: ['pending', 'active', 'failed'],
    default: 'pending'
  },
  // Resolved A record IPs from last DNS check
  a_record_ip: {
    type: [String],
    default: []
  },
  // Resolved CNAME value from last DNS check
  cname_value: {
    type: String,
    default: ''
  },
  // Detected domain provider (e.g., GoDaddy, Namecheap)
  detectedProvider: {
    type: String,
    default: ''
  },
  // Nameservers detected on last check
  nameservers: {
    type: [String],
    default: []
  },
  // Unique token for TXT record verification
  verificationToken: {
    type: String,
    required: true
  },
  // Full DNS snapshot from last check
  lastSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  lastError: {
    type: String,
    default: ''
  },
  connectedAt: {
    type: Date,
    default: null
  },
  sslActivatedAt: {
    type: Date,
    default: null
  },
  // Track how many verification attempts have been made
  verifyAttempts: {
    type: Number,
    default: 0
  },
  lastCheckedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

adminDomainConnectionSchema.index({ hostname: 1 })

adminDomainConnectionSchema.statics.generateToken = function () {
  return crypto.randomBytes(16).toString('hex')
}

export default mongoose.model('AdminDomainConnection', adminDomainConnectionSchema)
