import mongoose from 'mongoose'

/**
 * A deposit lock holds part of the wallet balance back from withdrawal for a
 * while. It deliberately does NOT freeze the money: the user can still trade
 * it and move it to a trading account. The point is to keep a deposit on the
 * platform for a period, not to suspend the account.
 */
const depositLockSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  unlockAt: { type: Date, required: true },
  reason: { type: String, default: '' },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  // Set when an admin ends the lock early. Kept rather than pulled from the
  // array so there is a record of who released it and when.
  releasedAt: { type: Date, default: null },
  releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, { timestamps: true })

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0
  },
  pendingDeposits: {
    type: Number,
    default: 0
  },
  pendingWithdrawals: {
    type: Number,
    default: 0
  },
  // ponytail: an unbounded array, fine at a handful of locks per user; move to
  // its own collection if a wallet ever accumulates enough to matter.
  locks: {
    type: [depositLockSchema],
    default: []
  }
}, {
  timestamps: true,
  // The amounts below are virtuals so that every endpoint already returning a
  // wallet hands them to the UI without being touched.
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

/**
 * A lock lapses on its own: whether it still holds is decided when the balance
 * is read, not by a job that flips a flag. There is nothing to drift if the
 * server is down at the moment one expires, and nothing to repair afterwards.
 */
walletSchema.methods.activeLocks = function (now = new Date()) {
  return (this.locks || []).filter(l => !l.releasedAt && l.unlockAt > now)
}

walletSchema.virtual('lockedAmount').get(function () {
  return this.activeLocks().reduce((sum, l) => sum + (l.amount || 0), 0)
})

/** What the user may actually withdraw. Floors at 0: an admin is allowed to
 *  lock more than the current balance, which simply means nothing goes out
 *  until the lock lapses. */
walletSchema.virtual('availableBalance').get(function () {
  return Math.max(0, (this.balance || 0) - this.lockedAmount)
})

/** When the soonest lock lapses, for the message shown to the user. */
walletSchema.virtual('nextUnlockAt').get(function () {
  const dates = this.activeLocks().map(l => l.unlockAt).sort((a, b) => a - b)
  return dates[0] || null
})

export default mongoose.model('Wallet', walletSchema)
