import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet'
  },
  type: {
    type: String,
    enum: ['Deposit', 'Withdrawal', 'Transfer_To_Account', 'Transfer_From_Account', 'Account_Transfer_Out', 'Account_Transfer_In', 'Demo_Credit', 'Demo_Reset', 'Challenge_Purchase', 'Challenge_Profit_Withdrawal', 'Admin_Fund_Add', 'Admin_Credit_Add', 'Admin_Credit_Remove'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'UPI', 'QR Code', 'Internal', 'System', 'Wallet', 'Manual Crypto'],
    default: 'Internal'
  },
  description: {
    type: String,
    default: ''
  },
  challengeAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChallengeAccount'
  },
  // For internal transfers
  tradingAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount'
  },
  tradingAccountName: {
    type: String,
    default: ''
  },
  // For account-to-account transfers
  toTradingAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount'
  },
  toTradingAccountName: {
    type: String,
    default: ''
  },
  fromTradingAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount'
  },
  fromTradingAccountName: {
    type: String,
    default: ''
  },
  transactionRef: {
    type: String,
    default: ''
  },
  screenshot: {
    type: String,
    default: ''
  },
  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserBankAccount'
  },
  bankAccountDetails: {
    type: {
      type: String,
      enum: ['Bank', 'UPI', 'Crypto']
    },
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    upiId: String,
    // Crypto snapshot fields (captured at withdraw-request time)
    cryptoCurrency: String,
    cryptoNetwork: String,
    walletAddress: String
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
    default: 'Pending'
  },
  adminRemarks: {
    type: String,
    default: ''
  },
  processedAt: {
    type: Date
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Bonus related fields
  bonusAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  bonusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bonus'
  },
  cryptoCurrency: { type: String, default: null },
  cryptoNetwork: { type: String, default: null },
  /** Omit for non–manual-crypto txs. Do not default null — unique index would treat many nulls as duplicates. */
  cryptoTxHash: {
    type: String
  },
  manualCryptoWalletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ManualCryptoWallet',
    default: null
  },
  manualCryptoAddress: { type: String, default: null },
  feePercentage: { type: Number, default: 0 },
  feeAmount: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  submittedAt: { type: Date, default: null },
  walletCredited: { type: Boolean, default: false },
  walletCreditedAt: { type: Date, default: null }
}, { timestamps: true })

// Only enforce uniqueness when a real hash is stored (challenge purchases, etc. omit cryptoTxHash)
transactionSchema.index(
  { cryptoTxHash: 1 },
  {
    unique: true,
    partialFilterExpression: {
      cryptoTxHash: { $exists: true, $type: 'string', $gt: '' }
    }
  }
)

export default mongoose.model('Transaction', transactionSchema)
