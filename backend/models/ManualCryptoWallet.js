import mongoose from 'mongoose'

const manualCryptoWalletSchema = new mongoose.Schema({
  currency: {
    type: String,
    required: true,
    enum: ['USDT', 'BTC', 'ETH', 'BNB', 'TRX', 'LTC', 'DOGE', 'SOL']
  },
  network: {
    type: String,
    required: true,
    enum: ['TRC20', 'ERC20', 'BEP20', 'Bitcoin', 'Ethereum', 'Solana', 'Litecoin', 'Dogecoin']
  },
  address: {
    type: String,
    required: true
  },
  qrCodeData: {
    type: String,
    default: null
  },
  displayName: {
    type: String,
    default: ''
  },
  feePercentage: {
    type: Number,
    default: 0.5
  },
  minDeposit: {
    type: Number,
    default: 10
  },
  maxDeposit: {
    type: Number,
    default: 50000
  },
  isActive: {
    type: Boolean,
    default: true
  },
  instructions: {
    type: String,
    default: 'Send the total amount (deposit + fee) to the address. Then submit your transaction hash below.'
  }
}, {
  timestamps: true
})

manualCryptoWalletSchema.index({ currency: 1, network: 1, isActive: 1 })

manualCryptoWalletSchema.statics.getActiveWallets = function () {
  return this.find({ isActive: true }).sort({ currency: 1, network: 1 })
}

manualCryptoWalletSchema.methods.calculateTotal = function (depositAmount) {
  const fee = depositAmount * (this.feePercentage / 100)
  const total = depositAmount + fee
  return {
    depositAmount,
    feePercentage: this.feePercentage,
    feeAmount: parseFloat(fee.toFixed(2)),
    totalToPay: parseFloat(total.toFixed(2))
  }
}

export default mongoose.model('ManualCryptoWallet', manualCryptoWalletSchema)
