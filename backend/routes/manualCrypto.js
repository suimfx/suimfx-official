import express from 'express'
import jwt from 'jsonwebtoken'
import ManualCryptoWallet from '../models/ManualCryptoWallet.js'
import Transaction from '../models/Transaction.js'
import Wallet from '../models/Wallet.js'
import User from '../models/User.js'
import { verifyAdminToken, requireSidebarPermission, PERMISSIONS } from '../middleware/rbac.js'

const router = express.Router()
const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key'

function verifyUserToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ success: false, message: 'Login required' })
    }
    const decoded = jwt.verify(token, getJwtSecret())
    const uid = decoded.id || decoded.userId
    if (!uid) {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }
    req.userId = uid
    next()
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' })
  }
}

const adminBankSettings = [
  verifyAdminToken,
  requireSidebarPermission(PERMISSIONS.SIDEBAR.BANK_SETTINGS)
]

// --- Public ---
router.get('/wallets', async (req, res) => {
  try {
    const wallets = await ManualCryptoWallet.getActiveWallets()
    res.json({
      success: true,
      wallets: wallets.map((w) => ({
        _id: w._id,
        currency: w.currency,
        network: w.network,
        address: w.address,
        qrCodeData: w.qrCodeData,
        displayName: w.displayName || `${w.currency} (${w.network})`,
        feePercentage: w.feePercentage,
        minDeposit: w.minDeposit,
        maxDeposit: w.maxDeposit,
        instructions: w.instructions
      }))
    })
  } catch (error) {
    console.error('[ManualCrypto] wallets:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/calculate-fee', async (req, res) => {
  try {
    const { walletId, amount } = req.body
    if (!walletId || amount == null) {
      return res.status(400).json({ success: false, message: 'walletId and amount required' })
    }
    const wallet = await ManualCryptoWallet.findById(walletId)
    if (!wallet || !wallet.isActive) {
      return res.status(404).json({ success: false, message: 'Wallet not found or inactive' })
    }
    const calculation = wallet.calculateTotal(parseFloat(amount))
    res.json({
      success: true,
      manual: {
        ...calculation,
        currency: wallet.currency,
        network: wallet.network
      }
    })
  } catch (error) {
    console.error('[ManualCrypto] calculate-fee:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// --- User (JWT) ---
router.post('/submit-deposit', verifyUserToken, async (req, res) => {
  try {
    const { walletId, amount, txHash, screenshot } = req.body
    const userId = req.userId

    if (!walletId || !amount || !txHash || String(txHash).trim().length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Wallet, amount, and a valid transaction hash are required'
      })
    }

    const mcWallet = await ManualCryptoWallet.findById(walletId)
    if (!mcWallet || !mcWallet.isActive) {
      return res.status(404).json({ success: false, message: 'Wallet not found or inactive' })
    }

    const depositAmount = parseFloat(amount)
    if (!Number.isFinite(depositAmount) || depositAmount < mcWallet.minDeposit) {
      return res.status(400).json({
        success: false,
        message: `Minimum deposit is $${mcWallet.minDeposit}`
      })
    }
    if (depositAmount > mcWallet.maxDeposit) {
      return res.status(400).json({
        success: false,
        message: `Maximum deposit is $${mcWallet.maxDeposit}`
      })
    }

    const hash = String(txHash).trim()
    const existingTx = await Transaction.findOne({ cryptoTxHash: hash })
    if (existingTx) {
      return res.status(400).json({
        success: false,
        message: 'This transaction hash has already been submitted'
      })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const calculation = mcWallet.calculateTotal(depositAmount)

    let wallet = await Wallet.findOne({ userId })
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 })
      await wallet.save()
    }

    const transaction = await Transaction.create({
      userId,
      walletId: wallet._id,
      type: 'Deposit',
      amount: depositAmount,
      paymentMethod: 'Manual Crypto',
      status: 'Pending',
      description: `Manual ${mcWallet.currency} (${mcWallet.network}) deposit`,
      transactionRef: hash,
      screenshot: screenshot || '',
      bonusAmount: 0,
      totalAmount: depositAmount,
      bonusId: null,
      cryptoCurrency: mcWallet.currency,
      cryptoNetwork: mcWallet.network,
      cryptoTxHash: hash,
      manualCryptoWalletId: mcWallet._id,
      manualCryptoAddress: mcWallet.address,
      feePercentage: mcWallet.feePercentage,
      feeAmount: calculation.feeAmount,
      totalPaid: calculation.totalToPay,
      submittedAt: new Date()
    })

    wallet.pendingDeposits = (wallet.pendingDeposits || 0) + depositAmount
    await wallet.save()

    res.json({
      success: true,
      message: 'Deposit submitted. Our team will verify your transaction.',
      transaction: {
        _id: transaction._id,
        amount: depositAmount,
        feeAmount: calculation.feeAmount,
        totalPaid: calculation.totalToPay,
        currency: mcWallet.currency,
        network: mcWallet.network,
        txHash: hash,
        status: 'Pending'
      }
    })
  } catch (error) {
    console.error('[ManualCrypto] submit-deposit:', error)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This transaction hash is already used' })
    }
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/my-deposits', verifyUserToken, async (req, res) => {
  try {
    const deposits = await Transaction.find({
      userId: req.userId,
      paymentMethod: 'Manual Crypto'
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    res.json({ success: true, deposits })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// --- Admin ---
router.get('/admin/wallets', ...adminBankSettings, async (req, res) => {
  try {
    const wallets = await ManualCryptoWallet.find().sort({ createdAt: -1 })
    res.json({ success: true, wallets })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/admin/wallets', ...adminBankSettings, async (req, res) => {
  try {
    const {
      currency,
      network,
      address,
      qrCodeData,
      displayName,
      feePercentage,
      minDeposit,
      maxDeposit,
      instructions
    } = req.body

    if (!currency || !network || !address) {
      return res.status(400).json({
        success: false,
        message: 'Currency, network, and address are required'
      })
    }

    const existing = await ManualCryptoWallet.findOne({ currency, network, address })
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A wallet with this currency, network, and address already exists'
      })
    }

    const wallet = await ManualCryptoWallet.create({
      currency,
      network,
      address,
      qrCodeData: qrCodeData || null,
      displayName: displayName || `${currency} (${network})`,
      feePercentage: feePercentage ?? 0.5,
      minDeposit: minDeposit ?? 10,
      maxDeposit: maxDeposit ?? 50000,
      instructions:
        instructions ||
        'Send the total amount (deposit + fee) to the address. Then submit your transaction hash below.',
      isActive: true
    })

    res.json({ success: true, message: 'Wallet created', wallet })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

router.put('/admin/wallets/:walletId', ...adminBankSettings, async (req, res) => {
  try {
    const wallet = await ManualCryptoWallet.findById(req.params.walletId)
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' })
    }

    const allowed = [
      'currency',
      'network',
      'address',
      'qrCodeData',
      'displayName',
      'feePercentage',
      'minDeposit',
      'maxDeposit',
      'instructions',
      'isActive'
    ]
    for (const field of allowed) {
      if (req.body[field] !== undefined) wallet[field] = req.body[field]
    }
    await wallet.save()
    res.json({ success: true, message: 'Wallet updated', wallet })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

router.delete('/admin/wallets/:walletId', ...adminBankSettings, async (req, res) => {
  try {
    const wallet = await ManualCryptoWallet.findByIdAndDelete(req.params.walletId)
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' })
    }
    res.json({ success: true, message: 'Wallet deleted' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/admin/pending-deposits', ...adminBankSettings, async (req, res) => {
  try {
    const { status = 'Pending' } = req.query
    const query = { paymentMethod: 'Manual Crypto' }
    if (status !== 'all') query.status = status

    const deposits = await Transaction.find(query)
      .populate('userId', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .limit(100)

    res.json({ success: true, deposits })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
