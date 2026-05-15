import express from 'express'
import mongoose from 'mongoose'
import AccountType from '../models/AccountType.js'
import TradingAccount from '../models/TradingAccount.js'
import Charges from '../models/Charges.js'
import User from '../models/User.js'
import Admin from '../models/Admin.js'
import { verifyAdminToken } from '../middleware/rbac.js'

const router = express.Router()

// GET /api/account-types - Get all active account types (for users)
//
// Scope rules:
//   - Sub-admin tenant user (assignedAdmin = some sub-admin)
//       → STRICT isolation: only that admin's types.
//   - Super-admin user (assignedAdmin = super-admin _id, null, or missing)
//       → EVERY active type. Super Admin owns the platform catalog, and
//         historical types have a mix of stored adminId values (super admin's
//         id / null / sub-admins' ids from impersonation flows). Filtering by
//         super admin's id alone was hiding the rest, so super-admin users
//         saw a subset of the types they themselves had configured.
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query
    let atQuery = { isActive: true }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const user = await User.findById(userId).select('assignedAdmin')
      const superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' }).select('_id')
      const superAdminId = superAdmin?._id?.toString() || null
      const userAdminId = user?.assignedAdmin?.toString() || null

      const isSuperAdminUser =
        !userAdminId ||
        (superAdminId && userAdminId === superAdminId)

      if (!isSuperAdminUser) {
        // Sub-admin tenant: strict isolation
        atQuery.adminId = user.assignedAdmin
      }
      // else: super-admin user → no extra filter, see every active type
    }

    const accountTypes = await AccountType.find(atQuery).sort({ createdAt: -1 })

    // Strip legacy minSpread / commission from the user-facing payload.
    // Forex Charges is the single source for live trade spread/commission now;
    // we no longer show these per-AccountType numbers in the UI, so don't leak
    // stale stored values from older account types either.
    const sanitized = accountTypes.map(at => {
      const obj = at.toObject()
      delete obj.minSpread
      delete obj.commission
      return obj
    })

    res.json({ success: true, accountTypes: sanitized })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching account types', error: error.message })
  }
})

// Access policy for account types:
//   SUPER_ADMIN  → can read/write every account type, including legacy rows with adminId=null
//   ADMIN        → can read/write own (adminId === self) + legacy globals (adminId == null)
function adminCanAccess (existing, admin) {
  if (admin.role === 'SUPER_ADMIN') return true
  const owner = existing.adminId?.toString() || null
  if (!owner) return true // legacy global row created before multi-tenant
  return owner === admin._id.toString()
}

// GET /api/account-types/all - Get all account types (for admin)
router.get('/all', verifyAdminToken, async (req, res) => {
  try {
    let q = {}
    if (req.admin.role !== 'SUPER_ADMIN') {
      // Admin sees their own + legacy global (adminId=null) account types
      q = { $or: [{ adminId: req.admin._id }, { adminId: null }, { adminId: { $exists: false } }] }
    }
    const accountTypes = await AccountType.find(q).sort({ createdAt: -1 })
    res.json({ accountTypes })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching account types', error: error.message })
  }
})

// POST /api/account-types - Create account type (admin)
router.post('/', verifyAdminToken, async (req, res) => {
  try {
    const { name, description, minDeposit, leverage, exposureLimit, minSpread, commission, isDemo, demoBalance } = req.body
    const accountType = new AccountType({
      name,
      description,
      minDeposit,
      leverage,
      exposureLimit,
      minSpread: minSpread || 0,
      commission: commission || 0,
      isDemo: isDemo || false,
      demoBalance: isDemo ? (demoBalance || 10000) : 0,
      adminId: req.admin._id
    })
    await accountType.save()
    res.status(201).json({ message: 'Account type created', accountType })
  } catch (error) {
    res.status(500).json({ message: 'Error creating account type', error: error.message })
  }
})

// PUT /api/account-types/:id - Update account type (admin)
router.put('/:id', verifyAdminToken, async (req, res) => {
  try {
    const existing = await AccountType.findById(req.params.id)
    if (!existing) return res.status(404).json({ message: 'Account type not found' })
    if (!adminCanAccess(existing, req.admin)) {
      return res.status(403).json({ message: 'Access denied' })
    }
    const { name, description, minDeposit, leverage, exposureLimit, minSpread, commission, isActive, isDemo, demoBalance } = req.body
    // Build update object explicitly so we only overwrite fields the client actually sent.
    // (Sending `{ isDemo: undefined }` via findByIdAndUpdate would otherwise leave the field
    // unchanged, but `demoBalance: 0` is a legitimate write we DO want to persist.)
    const update = {}
    if (name !== undefined) update.name = name
    if (description !== undefined) update.description = description
    if (minDeposit !== undefined) update.minDeposit = minDeposit
    if (leverage !== undefined) update.leverage = leverage
    if (exposureLimit !== undefined) update.exposureLimit = exposureLimit
    if (minSpread !== undefined) update.minSpread = minSpread
    if (commission !== undefined) update.commission = commission
    if (isActive !== undefined) update.isActive = isActive
    if (isDemo !== undefined) update.isDemo = isDemo
    if (demoBalance !== undefined) update.demoBalance = demoBalance
    // Adopt legacy null-adminId rows on first edit so subsequent ADMIN edits work.
    if (!existing.adminId) update.adminId = req.admin._id
    const accountType = await AccountType.findByIdAndUpdate(req.params.id, update, { new: true })
    res.json({ message: 'Account type updated', accountType })
  } catch (error) {
    res.status(500).json({ message: 'Error updating account type', error: error.message })
  }
})

// DELETE /api/account-types/:id - Delete account type (admin)
// Add ?force=true to also delete an account type that has linked trading
// accounts. Linked accounts are NOT deleted — their accountTypeId is just
// unset, so the accounts remain usable.
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    const existing = await AccountType.findById(req.params.id)
    if (!existing) return res.status(404).json({ message: 'Account type not found' })
    if (!adminCanAccess(existing, req.admin)) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const linkedAccounts = await TradingAccount.countDocuments({ accountTypeId: req.params.id })
    const force = req.query.force === 'true' || req.body?.force === true

    if (linkedAccounts > 0 && !force) {
      return res.status(400).json({
        message: `Cannot delete "${existing.name}" — ${linkedAccounts} trading account(s) are using it. Pass ?force=true to delete anyway (linked accounts will be detached), or disable the type instead.`,
        linkedAccounts,
        canForce: true
      })
    }

    if (linkedAccounts > 0 && force) {
      await TradingAccount.updateMany(
        { accountTypeId: req.params.id },
        { $unset: { accountTypeId: 1 } }
      )
    }

    await AccountType.findByIdAndDelete(req.params.id)
    res.json({
      message: linkedAccounts > 0
        ? `Account type deleted. ${linkedAccounts} linked trading account(s) detached.`
        : 'Account type deleted'
    })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting account type', error: error.message })
  }
})

export default router
