import express from 'express'
import MtSettings from '../models/MtSettings.js'
import Mt5Account from '../models/Mt5Account.js'
import User from '../models/User.js'
import Trade from '../models/Trade.js'
import mt5Service from '../services/mt5Service.js'
import { verifyAdminToken, requireSuperAdmin } from '../middleware/rbac.js'

const router = express.Router()

// MT5 hedging is platform-level: one MetaApi token, many MT5 accounts, users
// from any tenant tagged onto them. Super Admin only.
router.use(verifyAdminToken)
router.use(requireSuperAdmin)

const maskToken = (t) => (t ? `${'•'.repeat(8)}${t.slice(-4)}` : '')
// The UI echoes the masked token back when the admin didn't retype it.
const isMasked = (v) => !v || /[•*]/.test(v) || v.includes('...')

// ─── Settings ────────────────────────────────────────────────────────────────

router.get('/settings', async (req, res) => {
  try {
    const s = await MtSettings.findOne({ key: 'metaapi_config' }).lean()
    res.json({
      success: true,
      settings: {
        metaApiToken: maskToken(s?.metaApiToken),
        hasToken: !!s?.metaApiToken,
        region: s?.region || '',
        enabled: !!s?.enabled,
      },
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

router.put('/settings', async (req, res) => {
  try {
    const { metaApiToken, region, enabled } = req.body
    const update = { key: 'metaapi_config' }
    if (!isMasked(metaApiToken)) update.metaApiToken = metaApiToken.trim()
    if (region !== undefined) update.region = region
    if (enabled !== undefined) update.enabled = !!enabled

    await MtSettings.findOneAndUpdate({ key: 'metaapi_config' }, { $set: update }, { upsert: true })
    res.json({ success: true, message: 'MetaApi settings saved' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// ─── MT5 accounts ────────────────────────────────────────────────────────────

router.get('/accounts', async (req, res) => {
  try {
    const accounts = await Mt5Account.find().sort({ createdAt: -1 }).lean()
    const withCounts = await Promise.all(
      accounts.map(async (a) => ({
        ...a,
        taggedUsers: await User.countDocuments({ mt5AccountId: a._id }),
        openTrades: await Trade.countDocuments({ mt5AccountId: a._id, status: 'OPEN' }),
      }))
    )
    res.json({ success: true, accounts: withCounts })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

router.post('/accounts', async (req, res) => {
  try {
    const { label, metaApiAccountId, symbolSuffix, symbolOverrides } = req.body
    if (!metaApiAccountId) {
      return res.status(400).json({ success: false, message: 'metaApiAccountId is required' })
    }
    const account = await Mt5Account.create({
      label: label || '',
      metaApiAccountId: metaApiAccountId.trim(),
      symbolSuffix: symbolSuffix || '',
      symbolOverrides: symbolOverrides || {},
    })
    res.json({ success: true, account })
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ success: false, message: 'That MetaApi account is already connected' })
    }
    res.status(500).json({ success: false, message: e.message })
  }
})

router.put('/accounts/:id', async (req, res) => {
  try {
    const { label, symbolSuffix, symbolOverrides, isActive } = req.body
    const update = {}
    if (label !== undefined) update.label = label
    if (symbolSuffix !== undefined) update.symbolSuffix = symbolSuffix
    if (symbolOverrides !== undefined) update.symbolOverrides = symbolOverrides
    if (isActive !== undefined) update.isActive = !!isActive

    const account = await Mt5Account.findByIdAndUpdate(req.params.id, { $set: update }, { new: true })
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' })

    // Config changed — force a fresh connection on next use.
    mt5Service.dropConnection(account.metaApiAccountId)
    res.json({ success: true, account })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

router.delete('/accounts/:id', async (req, res) => {
  try {
    const account = await Mt5Account.findById(req.params.id)
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' })

    // Refuse while exposure exists — deleting the mapping would orphan live MT5
    // positions with nothing left pointing at them to close.
    const openTrades = await Trade.countDocuments({ mt5AccountId: account._id, status: 'OPEN' })
    if (openTrades > 0) {
      return res.status(400).json({
        success: false,
        message: `${openTrades} open position(s) still routed here. Close them before removing this account.`,
      })
    }

    await User.updateMany(
      { mt5AccountId: account._id },
      { $set: { mt5AccountId: null, mt5TaggedAt: null, mt5TaggedBy: null } }
    )
    mt5Service.dropConnection(account.metaApiAccountId)
    await account.deleteOne()
    res.json({ success: true, message: 'MT5 account removed' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

router.post('/accounts/:id/test', async (req, res) => {
  try {
    const account = await Mt5Account.findById(req.params.id)
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' })

    const result = await mt5Service.testConnection(account.metaApiAccountId)
    account.lastCheckedAt = new Date()
    account.lastError = result.success ? '' : result.error
    if (result.success) {
      account.login = result.login
      account.server = result.server
      account.balance = result.balance ?? null
      account.equity = result.equity ?? null
      account.currency = result.currency || ''
    }
    await account.save()

    res.json({ success: result.success, message: result.error, info: result })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// Live symbol list, plus a suffix guess so the admin doesn't have to eyeball it.
router.get('/accounts/:id/symbols', async (req, res) => {
  try {
    const account = await Mt5Account.findById(req.params.id).lean()
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' })

    const symbols = await mt5Service.getSymbols(account.metaApiAccountId)
    // EURUSD exists on every forex broker, so whatever trails it is the suffix.
    const probe = symbols.find((s) => /^EURUSD/i.test(s))
    res.json({
      success: true,
      count: symbols.length,
      suggestedSuffix: probe ? probe.slice(6) : '',
      symbols,
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// Live positions straight from MT5 — no snapshot cache, this is only ever hit
// when an admin opens the account row.
router.get('/accounts/:id/positions', async (req, res) => {
  try {
    const account = await Mt5Account.findById(req.params.id).lean()
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' })

    const positions = await mt5Service.getPositions(account.metaApiAccountId)
    res.json({ success: true, count: positions.length, positions })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// ─── A-Book users + tagging ──────────────────────────────────────────────────

// Deliberate exception to utils/adminFilter.js: everywhere else SUPER_ADMIN sees
// only users with assignedAdmin == null, because tenants are isolated from the
// operator. Here the Super Admin is the one carrying the hedge risk for the whole
// platform, so this endpoint returns A-Book users across ALL tenants on purpose.
// Do not "fix" this to the usual scoping.
router.get('/users', async (req, res) => {
  try {
    const { search, tagged, page = 1, limit = 50 } = req.query
    const query = { bookType: 'A' }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }
    if (tagged === 'true') query.mt5AccountId = { $ne: null }
    if (tagged === 'false') query.mt5AccountId = null

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [users, total] = await Promise.all([
      User.find(query)
        .select('firstName email phone bookType mt5AccountId mt5TaggedAt assignedAdmin')
        .populate('mt5AccountId', 'label metaApiAccountId')
        .populate('assignedAdmin', 'brandName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ])

    res.json({ success: true, users, total, page: parseInt(page) })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

router.put('/users/:userId/tag', async (req, res) => {
  try {
    const { mt5AccountId } = req.body
    const user = await User.findById(req.params.userId)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    // Re-tagging or untagging while this user still has hedged positions open
    // would leave those MT5 positions with no route to close them.
    if (user.mt5AccountId && String(user.mt5AccountId) !== String(mt5AccountId || '')) {
      const openTrades = await Trade.countDocuments({
        userId: user._id,
        mt5AccountId: user.mt5AccountId,
        status: 'OPEN',
      })
      if (openTrades > 0) {
        return res.status(400).json({
          success: false,
          message: `${openTrades} open MT5-hedged position(s). Close them before changing this user's MT5 account.`,
        })
      }
    }

    if (mt5AccountId) {
      const account = await Mt5Account.findById(mt5AccountId).lean()
      if (!account) return res.status(404).json({ success: false, message: 'MT5 account not found' })
      if (user.bookType !== 'A') {
        return res.status(400).json({ success: false, message: 'Only A-Book users can be tagged to MT5' })
      }
      user.mt5AccountId = account._id
      user.mt5TaggedAt = new Date()
      user.mt5TaggedBy = req.admin._id
    } else {
      user.mt5AccountId = null
      user.mt5TaggedAt = null
      user.mt5TaggedBy = null
    }
    await user.save()

    res.json({
      success: true,
      message: mt5AccountId ? 'User tagged to MT5 account' : 'User untagged',
      user: { _id: user._id, email: user.email, mt5AccountId: user.mt5AccountId },
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

export default router
