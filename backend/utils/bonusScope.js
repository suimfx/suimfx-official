import Bonus from '../models/Bonus.js'
import User from '../models/User.js'

/**
 * Admin or employee's parent admin — owns bonus templates for this session.
 */
export function getBonusOwnerAdminId (req) {
  if (req.userType === 'EMPLOYEE') {
    return req.user?.createdBy || null
  }
  return req.admin?._id || null
}

/** Mongo filter for listing bonus templates in admin UI */
export function bonusTemplateListFilter (req) {
  const ownerId = getBonusOwnerAdminId(req)
  if (!ownerId) return { _id: { $exists: false } } // no match
  if (req.userType === 'SUPER_ADMIN') {
    return { $or: [{ createdBy: ownerId }, { createdBy: null }] }
  }
  return { createdBy: ownerId }
}

export function canMutateBonusTemplate (bonus, req) {
  const ownerId = getBonusOwnerAdminId(req)
  if (!ownerId || !bonus) return false
  if (!bonus.createdBy) {
    return req.userType === 'SUPER_ADMIN'
  }
  return String(bonus.createdBy) === String(ownerId)
}

/**
 * Bonuses that apply when this user deposits (scoped to their assigned white-label admin).
 */
export async function findBonusesForUserDeposit (userId) {
  const user = await User.findById(userId).select('assignedAdmin')
  if (!user) return []
  const q = { status: 'ACTIVE' }
  if (user.assignedAdmin) {
    q.createdBy = user.assignedAdmin
  } else {
    q.createdBy = null
  }
  return Bonus.find(q).sort({ createdAt: -1 })
}

export function selectApplicableBonus (bonuses, depositAmount, isFirstDeposit) {
  let bonusAmount = 0
  let applicableBonus = null

  for (const bonus of bonuses) {
    if (bonus.status !== 'ACTIVE') continue
    if (isFirstDeposit && bonus.type !== 'FIRST_DEPOSIT') continue
    if (!isFirstDeposit && bonus.type === 'FIRST_DEPOSIT') continue
    if (depositAmount < bonus.minDeposit) continue
    if (bonus.usageLimit != null && bonus.usedCount >= bonus.usageLimit) continue

    let calculatedBonus = 0
    if (bonus.bonusType === 'PERCENTAGE') {
      calculatedBonus = depositAmount * (bonus.bonusValue / 100)
      if (bonus.maxBonus != null && calculatedBonus > bonus.maxBonus) {
        calculatedBonus = bonus.maxBonus
      }
    } else {
      calculatedBonus = bonus.bonusValue
    }

    if (calculatedBonus > bonusAmount) {
      bonusAmount = calculatedBonus
      applicableBonus = bonus
    }
  }

  return { bonusAmount, applicableBonus }
}

/** UserBonus list: super admin sees all; others only users under their admin */
export async function userBonusMongoFilter (req) {
  if (req.userType === 'SUPER_ADMIN') {
    return {}
  }
  const ownerId = getBonusOwnerAdminId(req)
  if (!ownerId) return { _id: { $exists: false } }
  const users = await User.find({ assignedAdmin: ownerId }).select('_id').lean()
  const ids = users.map((u) => u._id)
  if (ids.length === 0) return { _id: { $exists: false } }
  return { userId: { $in: ids } }
}
