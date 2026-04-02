import express from 'express'
import Bonus from '../models/Bonus.js'
import UserBonus from '../models/UserBonus.js'
import User from '../models/User.js'
import { verifyAdminToken } from '../middleware/rbac.js'
import {
  getBonusOwnerAdminId,
  bonusTemplateListFilter,
  canMutateBonusTemplate,
  findBonusesForUserDeposit,
  selectApplicableBonus,
  userBonusMongoFilter
} from '../utils/bonusScope.js'

const router = express.Router()

// Get bonus templates for logged-in admin (scoped)
router.get('/', verifyAdminToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query
    const scope = bonusTemplateListFilter(req)
    const query = { ...scope }
    if (status) query.status = status
    if (type) query.type = type

    const bonuses = await Bonus.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Bonus.countDocuments(query)

    res.json({
      success: true,
      data: bonuses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get bonuses error:', error)
    res.status(500).json({ success: false, message: 'Error fetching bonuses' })
  }
})

// Create new bonus (owned by current admin)
router.post('/', verifyAdminToken, async (req, res) => {
  try {
    const ownerId = getBonusOwnerAdminId(req)
    if (!ownerId) {
      return res.status(403).json({ success: false, message: 'Cannot determine admin for bonus ownership' })
    }
    const { createdBy: _strip, ...rest } = req.body
    const bonus = new Bonus({
      ...rest,
      createdBy: ownerId
    })
    await bonus.save()

    const populatedBonus = await Bonus.findById(bonus._id).populate('createdBy', 'firstName lastName')

    res.json({
      success: true,
      message: 'Bonus created successfully',
      data: populatedBonus
    })
  } catch (error) {
    console.error('Create bonus error:', error)
    res.status(500).json({ success: false, message: 'Error creating bonus' })
  }
})

// Update bonus (only owner; legacy null only SUPER_ADMIN)
router.put('/:id', verifyAdminToken, async (req, res) => {
  try {
    const existing = await Bonus.findById(req.params.id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Bonus not found' })
    }
    if (!canMutateBonusTemplate(existing, req)) {
      return res.status(403).json({ success: false, message: 'You can only edit bonuses for your own account' })
    }
    const { createdBy: _strip, ...body } = req.body
    const bonus = await Bonus.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName')

    res.json({
      success: true,
      message: 'Bonus updated successfully',
      data: bonus
    })
  } catch (error) {
    console.error('Update bonus error:', error)
    res.status(500).json({ success: false, message: 'Error updating bonus' })
  }
})

// Delete bonus
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    const existing = await Bonus.findById(req.params.id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Bonus not found' })
    }
    if (!canMutateBonusTemplate(existing, req)) {
      return res.status(403).json({ success: false, message: 'You can only delete bonuses for your own account' })
    }

    await Bonus.findByIdAndDelete(req.params.id)
    await UserBonus.deleteMany({ bonusId: req.params.id })

    res.json({
      success: true,
      message: 'Bonus deleted successfully'
    })
  } catch (error) {
    console.error('Delete bonus error:', error)
    res.status(500).json({ success: false, message: 'Error deleting bonus' })
  }
})

// Get user bonuses (scoped to admin's users, except super admin = all)
router.get('/user-bonuses', verifyAdminToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query
    const scope = await userBonusMongoFilter(req)
    const query = { ...scope }
    if (status) query.status = status
    if (userId) query.userId = userId

    const userBonuses = await UserBonus.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('bonusId', 'name type bonusType')
      .populate('depositId', 'amount status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await UserBonus.countDocuments(query)

    res.json({
      success: true,
      data: userBonuses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get user bonuses error:', error)
    res.status(500).json({ success: false, message: 'Error fetching user bonuses' })
  }
})

// Public: used by user wallet UI — bonuses for that user's assigned admin only
router.post('/calculate-bonus', async (req, res) => {
  try {
    const { userId, depositAmount, isFirstDeposit } = req.body
    if (!userId || depositAmount == null) {
      return res.status(400).json({ success: false, message: 'userId and depositAmount required' })
    }

    const bonuses = await findBonusesForUserDeposit(userId)
    const { bonusAmount, applicableBonus } = selectApplicableBonus(
      bonuses,
      Number(depositAmount),
      !!isFirstDeposit
    )

    res.json({
      success: true,
      data: {
        bonusAmount,
        bonus: applicableBonus,
        totalAmount: Number(depositAmount) + bonusAmount
      }
    })
  } catch (error) {
    console.error('Calculate bonus error:', error)
    res.status(500).json({ success: false, message: 'Error calculating bonus' })
  }
})

// Default templates for this admin only
router.post('/create-default-bonuses', verifyAdminToken, async (req, res) => {
  try {
    const ownerId = getBonusOwnerAdminId(req)
    if (!ownerId) {
      return res.status(403).json({ success: false, message: 'Cannot determine admin' })
    }

    const existingMine = await Bonus.countDocuments({ createdBy: ownerId })
    if (existingMine > 0) {
      return res.json({ success: true, message: 'Default bonuses already exist for your account' })
    }

    const defaultBonuses = [
      {
        name: 'First Deposit Bonus',
        type: 'FIRST_DEPOSIT',
        bonusType: 'PERCENTAGE',
        bonusValue: 100,
        minDeposit: 100,
        maxBonus: 500,
        wagerRequirement: 30,
        duration: 30,
        status: 'ACTIVE',
        description: '100% bonus on your first deposit up to $500',
        terms: '30x wagering requirement applies. Bonus expires after 30 days.',
        createdBy: ownerId
      },
      {
        name: 'Regular Deposit Bonus',
        type: 'DEPOSIT',
        bonusType: 'PERCENTAGE',
        bonusValue: 50,
        minDeposit: 50,
        maxBonus: 200,
        wagerRequirement: 25,
        duration: 30,
        status: 'ACTIVE',
        description: '50% bonus on regular deposits up to $200',
        terms: '25x wagering requirement applies. Bonus expires after 30 days.',
        createdBy: ownerId
      },
      {
        name: 'Reload Bonus',
        type: 'RELOAD',
        bonusType: 'FIXED',
        bonusValue: 25,
        minDeposit: 100,
        maxBonus: null,
        wagerRequirement: 20,
        duration: 14,
        status: 'ACTIVE',
        description: '$25 fixed bonus on deposits of $100 or more',
        terms: '20x wagering requirement applies. Bonus expires after 14 days.',
        createdBy: ownerId
      }
    ]

    const createdBonuses = await Bonus.insertMany(defaultBonuses)

    res.json({
      success: true,
      message: 'Default bonuses created successfully',
      data: createdBonuses
    })
  } catch (error) {
    console.error('Create default bonuses error:', error)
    res.status(500).json({ success: false, message: 'Error creating default bonuses' })
  }
})

router.post('/activate-bonus', verifyAdminToken, async (req, res) => {
  try {
    const { userId, bonusId, depositId, bonusAmount } = req.body

    const bonus = await Bonus.findById(bonusId)
    if (!bonus) {
      return res.status(404).json({ success: false, message: 'Bonus not found' })
    }
    if (!canMutateBonusTemplate(bonus, req)) {
      return res.status(403).json({ success: false, message: 'You cannot activate this bonus template' })
    }

    const user = await User.findById(userId).select('assignedAdmin')
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    if (req.userType !== 'SUPER_ADMIN') {
      const ownerId = getBonusOwnerAdminId(req)
      if (!user.assignedAdmin || String(user.assignedAdmin) !== String(ownerId)) {
        return res.status(403).json({ success: false, message: 'User is not assigned to your admin account' })
      }
    }

    const userBonus = new UserBonus({
      userId,
      bonusId,
      depositId,
      bonusAmount,
      wagerRequirement: bonus.wagerRequirement * bonusAmount,
      remainingWager: bonus.wagerRequirement * bonusAmount,
      status: 'ACTIVE',
      activatedAt: new Date(),
      expiresAt: bonus.duration ? new Date(Date.now() + bonus.duration * 24 * 60 * 60 * 1000) : null,
      maxWithdrawal: bonus.maxWithdrawal
    })

    await userBonus.save()
    await Bonus.findByIdAndUpdate(bonusId, { $inc: { usedCount: 1 } })

    const populatedUserBonus = await UserBonus.findById(userBonus._id)
      .populate('userId', 'firstName lastName email')
      .populate('bonusId', 'name type')

    res.json({
      success: true,
      message: 'Bonus activated successfully',
      data: populatedUserBonus
    })
  } catch (error) {
    console.error('Activate bonus error:', error)
    res.status(500).json({ success: false, message: 'Error activating bonus' })
  }
})

export default router
