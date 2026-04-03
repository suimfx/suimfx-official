import User from '../models/User.js'

/**
 * Session is scoped like Super Admin (platform / unassigned users) — either the Super Admin
 * logged in directly, or staff (Employee) created by that Super Admin. White-label admins and
 * their staff use tenant scope only (req.admin.role === 'ADMIN').
 */
export const isPlatformAdminScope = (req) => {
  return !!(req?.admin && req.admin.role === 'SUPER_ADMIN')
}

/**
 * Get list of user IDs that belong to an admin
 * SUPER_ADMIN: returns only unassigned users (not belonging to any Admin)
 * ADMIN: returns only their assigned users
 */
export const getAdminUserIds = async (admin) => {
  if (!admin) return null
  
  if (admin.role === 'SUPER_ADMIN') {
    // Super Admin sees only unassigned users (complete data isolation)
    const users = await User.find({ $or: [{ assignedAdmin: null }, { assignedAdmin: { $exists: false } }] }).select('_id')
    return users.map(u => u._id)
  }
  
  // Admin role - get their users only
  const users = await User.find({ assignedAdmin: admin._id }).select('_id')
  return users.map(u => u._id)
}

/**
 * Apply admin-based filtering to a query
 * Modifies query object to filter by admin's users
 */
export const applyAdminFilter = async (query, admin, userIdField = 'userId') => {
  if (!admin) return query
  
  const userIds = await getAdminUserIds(admin)
  if (userIds && userIds.length > 0) {
    query[userIdField] = { $in: userIds }
  } else {
    // No users - return empty result
    query[userIdField] = { $in: [] }
  }
  
  return query
}

/**
 * Check if admin has permission to access a specific user
 */
export const canAccessUser = async (admin, userId) => {
  if (!admin) return false
  
  const user = await User.findById(userId)
  if (!user) return false
  
  if (admin.role === 'SUPER_ADMIN') {
    // Super Admin can only access unassigned users
    return !user.assignedAdmin
  }
  
  return user.assignedAdmin?.toString() === admin._id.toString()
}

/**
 * Generate unique referral code for admin
 */
export const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
