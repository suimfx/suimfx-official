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
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query
    let atQuery = { isActive: true }
    
    // Scope account types to the user's assigned admin
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const user = await User.findById(userId).select('assignedAdmin')
      if (user) {
        if (user.assignedAdmin) {
          // User belongs to a specific admin — show only that admin's account types
          atQuery.adminId = user.assignedAdmin
        } else {
          // User belongs to Super Admin — show only Super Admin's account types
          const superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' }).select('_id')
          if (superAdmin) {
            atQuery.adminId = superAdmin._id
          }
        }
      }
    }
    
    const accountTypes = await AccountType.find(atQuery).sort({ createdAt: -1 })
    
    // Fetch actual spread and commission from Charges for each account type
    const accountTypesWithCharges = await Promise.all(accountTypes.map(async (at) => {
      const atObj = at.toObject()
      
      // Find charges for this account type (both ACCOUNT_TYPE level and SEGMENT level with accountTypeId)
      const charges = await Charges.find({ 
        isActive: true, 
        accountTypeId: at._id
      })
      
      console.log(`[AccountTypes] Found ${charges.length} charges for ${at.name}:`, charges.map(c => ({
        segment: c.segment,
        spreadValue: c.spreadValue,
        commissionValue: c.commissionValue
      })))
      
      // Get the highest spread value from any charge (regardless of segment)
      let maxSpread = 0
      let maxCommission = 0
      
      for (const charge of charges) {
        if (charge.spreadValue > maxSpread) {
          maxSpread = charge.spreadValue
        }
        if (charge.commissionValue > maxCommission) {
          maxCommission = charge.commissionValue
        }
      }
      
      // Override minSpread and commission with values from Charges if found
      if (maxSpread > 0) {
        atObj.minSpread = maxSpread
        console.log(`[AccountTypes] Setting minSpread for ${at.name} to ${maxSpread}`)
      }
      if (maxCommission > 0) {
        atObj.commission = maxCommission
        console.log(`[AccountTypes] Setting commission for ${at.name} to ${maxCommission}`)
      }
      
      return atObj
    }))
    
    res.json({ success: true, accountTypes: accountTypesWithCharges })
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
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    const existing = await AccountType.findById(req.params.id)
    if (!existing) return res.status(404).json({ message: 'Account type not found' })
    if (!adminCanAccess(existing, req.admin)) {
      return res.status(403).json({ message: 'Access denied' })
    }

    // Block deletion if any trading accounts use this account type
    const linkedAccounts = await TradingAccount.countDocuments({ accountTypeId: req.params.id })
    if (linkedAccounts > 0) {
      return res.status(400).json({
        message: `Cannot delete "${existing.name}" — ${linkedAccounts} trading account(s) are using it. Disable it instead.`
      })
    }

    await AccountType.findByIdAndDelete(req.params.id)
    res.json({ message: 'Account type deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting account type', error: error.message })
  }
})

export default router
