import User from '../models/User.js'

/**
 * Get list of user IDs that belong to an admin
 * Returns null for Super Admin (no filter needed)
 */
export const getAdminUserIds = async (admin) => {
  if (!admin) return null
  
  if (admin.role === 'SUPER_ADMIN') {
    return null // No filter - Super Admin sees all
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
  if (!admin || admin.role === 'SUPER_ADMIN') {
    return query // No changes for Super Admin
  }
  
  const userIds = await getAdminUserIds(admin)
  if (userIds && userIds.length > 0) {
    query[userIdField] = { $in: userIds }
  } else {
    // Admin has no users yet - return empty result
    query[userIdField] = { $in: [] }
  }
  
  return query
}

/**
 * Check if admin has permission to access a specific user
 */
export const canAccessUser = async (admin, userId) => {
  if (!admin) return false
  
  if (admin.role === 'SUPER_ADMIN') {
    return true // Super Admin can access any user
  }
  
  const user = await User.findById(userId)
  if (!user) return false
  
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
