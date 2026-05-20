import express from 'express'
import Charges from '../models/Charges.js'
import AccountType from '../models/AccountType.js'
import Admin from '../models/Admin.js'
import { verifyAdminToken } from '../middleware/rbac.js'

const router = express.Router()

// GET /api/charges/spreads - Get spreads for all instruments (for display in trading UI)
router.get('/spreads', async (req, res) => {
  try {
    const { userId, accountTypeId, adminId } = req.query

    // Frontend omits adminId for Super-Admin users (those without assignedAdmin).
    // Without explicit resolution, every sub-admin's spreads would be returned and
    // displayed to Super-Admin users — fall back to the Super Admin's id so the
    // UI only shows spreads that actually apply at trade execution.
    let effectiveAdminId = adminId || null
    if (!effectiveAdminId) {
      const superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' }).select('_id').lean()
      effectiveAdminId = superAdmin?._id?.toString() || null
    }

    // Filter by adminId: use tenant-specific charges + fallback to legacy global (adminId null/missing)
    let spreadQuery = {
      isActive: true,
      spreadValue: { $gt: 0 },
      $or: [
        ...(effectiveAdminId ? [{ adminId: effectiveAdminId }] : []),
        { adminId: null },
        { adminId: { $exists: false } }
      ]
    }
    
    const charges = await Charges.find(spreadQuery)
      .sort({ level: 1 })
    
    // Build a map of symbol -> spread (respecting hierarchy)
    const spreadMap = {}
    
    // Priority order: USER > INSTRUMENT > ACCOUNT_TYPE > SEGMENT > GLOBAL
    const priorityOrder = { 'USER': 1, 'INSTRUMENT': 2, 'ACCOUNT_TYPE': 3, 'SEGMENT': 4, 'GLOBAL': 5 }

    const segmentSymbols = {
      'Forex': ['EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','NZDUSD','USDCAD','EURGBP','EURJPY',
        'GBPJPY','EURCHF','EURAUD','EURCAD','GBPAUD','GBPCAD','AUDCAD','AUDJPY','CADJPY','CHFJPY',
        'NZDJPY','AUDNZD','CADCHF','GBPCHF','GBPNZD','EURNZD','NZDCAD','NZDCHF','AUDCHF'],
      'Metals': ['XAUUSD','XAGUSD','XPTUSD','XPDUSD','XAUEUR','XAUAUD','XAUGBP','XAUCHF','XAUJPY','XAGEUR'],
      'Crypto': ['BTCUSD','ETHUSD','LTCUSD','XRPUSD','BCHUSD','BNBUSD','SOLUSD','ADAUSD','DOGEUSD',
        'DOTUSD','MATICUSD','AVAXUSD','LINKUSD','SHIBUSD','XLMUSD','TRXUSD','UNIUSD','ATOMUSD',
        'ETCUSD','PEPEUSD','ARBUSD','OPUSD','SUIUSD','APTUSD','INJUSD','TONUSD','HBARUSD'],
      'Indices': ['US30','US500','NAS100','DAX','CAC40','AUS200','EU50','AEX','CN50'],
      'Energy': ['USOIL','UKOIL','NGAS','BRENT','WTI']
    }
    const allSymbols = Object.values(segmentSymbols).flat()

    const setSpread = (symbol, charge) => {
      const existing = spreadMap[symbol]
      if (!existing) {
        spreadMap[symbol] = { spread: charge.spreadValue, spreadType: charge.spreadType, level: charge.level, hasAdmin: !!charge.adminId }
      } else if (priorityOrder[charge.level] < priorityOrder[existing.level]) {
        spreadMap[symbol] = { spread: charge.spreadValue, spreadType: charge.spreadType, level: charge.level, hasAdmin: !!charge.adminId }
      } else if (priorityOrder[charge.level] === priorityOrder[existing.level] && !!charge.adminId && !existing.hasAdmin) {
        // Same level but admin-specific overrides global
        spreadMap[symbol] = { spread: charge.spreadValue, spreadType: charge.spreadType, level: charge.level, hasAdmin: true }
      }
    }

    for (const charge of charges) {
      if (charge.instrumentSymbol) {
        // Instrument-specific charge
        setSpread(charge.instrumentSymbol, charge)
      } else if (charge.segment) {
        // Segment-level charge - apply to all instruments in that segment
        const symbols = segmentSymbols[charge.segment] || []
        for (const symbol of symbols) setSpread(symbol, charge)
      } else {
        // No instrument, no segment = applies to ALL instruments (GLOBAL, ACCOUNT_TYPE global, etc.)
        for (const symbol of allSymbols) setSpread(symbol, charge)
      }
    }
    
    res.json({ success: true, spreads: spreadMap })
  } catch (error) {
    console.error('Error fetching spreads:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/charges - Get all charges with optional filters
router.get('/', verifyAdminToken, async (req, res) => {
  try {
    const { segment, level, instrumentSymbol, userId } = req.query
    
    let query = { isActive: true }
    
    // Each admin sees only their own charges
    query.adminId = req.admin._id
    
    // Include charges for specific segment OR null segment (applies to all)
    if (segment) {
      query.$and = query.$and || []
      query.$and.push({ $or: [{ segment: segment }, { segment: null }] })
    }
    if (level) query.level = level
    if (instrumentSymbol) query.instrumentSymbol = instrumentSymbol
    if (userId) query.userId = userId

    const charges = await Charges.find(query)
      .populate('userId', 'name email mobile')
      .sort({ level: 1, createdAt: -1 })
    res.json({ success: true, charges })
  } catch (error) {
    console.error('Error fetching charges:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/charges/:id - Get single charge
router.get('/:id', verifyAdminToken, async (req, res) => {
  try {
    const charge = await Charges.findById(req.params.id)
    if (!charge) {
      return res.status(404).json({ success: false, message: 'Charge not found' })
    }
    // Admin can only view their own charges; Super Admin can view any
    if (req.userType !== 'SUPER_ADMIN' && charge.adminId?.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }
    res.json({ success: true, charge })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/charges - Create new charge
router.post('/', verifyAdminToken, async (req, res) => {
  try {
    const {
      level,
      userId,
      instrumentSymbol,
      segment,
      accountTypeId,
      spreadType,
      spreadValue,
      commissionType,
      commissionValue,
      commissionOnBuy,
      commissionOnSell,
      commissionOnClose,
      commissionOverride,
      swapLong,
      swapShort,
      swapType
    } = req.body

    if (!level) {
      return res.status(400).json({ success: false, message: 'Level is required' })
    }

    const parsedCommissionValue = commissionValue !== undefined ? Number(commissionValue) : 0
    // Auto-enable commissionOverride when admin explicitly sets 0 on a specific level
    const effectiveCommissionOverride = commissionOverride !== undefined
      ? !!commissionOverride
      : (commissionValue !== undefined && parsedCommissionValue === 0 && ['USER', 'INSTRUMENT'].includes(level))

    const charge = await Charges.create({
      level,
      userId: userId || null,
      instrumentSymbol: instrumentSymbol || null,
      segment: segment || null,
      accountTypeId: accountTypeId || null,
      adminId: req.admin._id,
      spreadType: spreadType || 'FIXED',
      spreadValue: spreadValue || 0,
      commissionType: commissionType || 'PER_LOT',
      commissionValue: parsedCommissionValue,
      commissionOnBuy: commissionOnBuy !== false,
      commissionOnSell: commissionOnSell !== false,
      commissionOnClose: commissionOnClose || false,
      commissionOverride: effectiveCommissionOverride,
      swapLong: swapLong || 0,
      swapShort: swapShort || 0,
      swapType: swapType || 'POINTS',
      isActive: true
    })

    // Sync spread to AccountType if this is an ACCOUNT_TYPE level charge
    if (level === 'ACCOUNT_TYPE' && accountTypeId && spreadValue > 0) {
      await AccountType.findByIdAndUpdate(accountTypeId, { 
        minSpread: spreadValue,
        commission: commissionValue || 0
      })
      console.log(`Synced spread ${spreadValue} and commission ${commissionValue || 0} to AccountType ${accountTypeId}`)
    }

    res.json({ success: true, message: 'Charge created', charge })
  } catch (error) {
    console.error('Error creating charge:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/charges/:id - Update charge
router.put('/:id', verifyAdminToken, async (req, res) => {
  try {
    const {
      level,
      userId,
      instrumentSymbol,
      segment,
      accountTypeId,
      spreadType,
      spreadValue,
      commissionType,
      commissionValue,
      commissionOnBuy,
      commissionOnSell,
      commissionOnClose,
      commissionOverride,
      swapLong,
      swapShort,
      swapType,
      isActive
    } = req.body

    const charge = await Charges.findById(req.params.id)
    if (!charge) {
      return res.status(404).json({ success: false, message: 'Charge not found' })
    }
    if (req.userType !== 'SUPER_ADMIN' && charge.adminId?.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    if (level !== undefined) charge.level = level
    if (userId !== undefined) charge.userId = userId || null
    if (instrumentSymbol !== undefined) charge.instrumentSymbol = instrumentSymbol || null
    if (segment !== undefined) charge.segment = segment || null
    if (accountTypeId !== undefined) charge.accountTypeId = accountTypeId || null
    if (spreadType !== undefined) charge.spreadType = spreadType
    if (spreadValue !== undefined) charge.spreadValue = spreadValue
    if (commissionType !== undefined) charge.commissionType = commissionType
    if (commissionValue !== undefined) {
      charge.commissionValue = Number(commissionValue)
      // Auto-enable override when admin explicitly sets 0 on USER/INSTRUMENT level
      if (commissionOverride !== undefined) {
        charge.commissionOverride = !!commissionOverride
      } else if (Number(commissionValue) === 0 && ['USER', 'INSTRUMENT'].includes(charge.level)) {
        charge.commissionOverride = true
      } else if (Number(commissionValue) > 0) {
        charge.commissionOverride = false
      }
    }
    if (commissionOnBuy !== undefined) charge.commissionOnBuy = commissionOnBuy
    if (commissionOnSell !== undefined) charge.commissionOnSell = commissionOnSell
    if (commissionOnClose !== undefined) charge.commissionOnClose = commissionOnClose
    if (swapLong !== undefined) charge.swapLong = swapLong
    if (swapShort !== undefined) charge.swapShort = swapShort
    if (swapType !== undefined) charge.swapType = swapType
    if (isActive !== undefined) charge.isActive = isActive

    await charge.save()

    // Sync spread to AccountType if this is an ACCOUNT_TYPE level charge
    if (charge.level === 'ACCOUNT_TYPE' && charge.accountTypeId) {
      const updateData = {}
      if (charge.spreadValue > 0) updateData.minSpread = charge.spreadValue
      if (charge.commissionValue > 0) updateData.commission = charge.commissionValue
      
      if (Object.keys(updateData).length > 0) {
        await AccountType.findByIdAndUpdate(charge.accountTypeId, updateData)
        console.log(`Synced spread/commission to AccountType ${charge.accountTypeId}:`, updateData)
      }
    }

    res.json({ success: true, message: 'Charge updated', charge })
  } catch (error) {
    console.error('Error updating charge:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/charges/:id - Delete charge
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    const charge = await Charges.findById(req.params.id)
    if (!charge) {
      return res.status(404).json({ success: false, message: 'Charge not found' })
    }
    if (req.userType !== 'SUPER_ADMIN' && charge.adminId?.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    await Charges.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Charge deleted' })
  } catch (error) {
    console.error('Error deleting charge:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
