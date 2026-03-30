import express from 'express'
import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'
import User from '../models/User.js'
import { canAccessUser } from '../utils/adminFilter.js'

const router = express.Router()

const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key'

// Middleware to verify admin token
const verifyAdminToken = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }
  
  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, getJwtSecret())
    req.admin = await Admin.findById(decoded.adminId)
    req.originalAdminId = decoded.originalAdminId || decoded.adminId
    next()
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

// POST /api/impersonate/admin/:adminId - Super Admin impersonates Admin
router.post('/admin/:adminId', verifyAdminToken, async (req, res) => {
  try {
    // Only Super Admin can impersonate admins
    if (req.admin.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only Super Admin can impersonate admins' 
      })
    }

    const targetAdmin = await Admin.findById(req.params.adminId)
    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: 'Admin not found' })
    }

    if (targetAdmin.role === 'SUPER_ADMIN') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot impersonate Super Admin' 
      })
    }

    // Generate impersonation token
    const token = jwt.sign(
      { 
        adminId: targetAdmin._id,
        originalAdminId: req.admin._id,
        impersonatedAdminId: targetAdmin._id,
        role: targetAdmin.role,
        isImpersonating: true
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    )

    res.json({
      success: true,
      message: `Now impersonating ${targetAdmin.firstName} ${targetAdmin.lastName}`,
      token,
      admin: {
        _id: targetAdmin._id,
        email: targetAdmin.email,
        firstName: targetAdmin.firstName,
        lastName: targetAdmin.lastName,
        role: targetAdmin.role,
        sidebarPermissions: targetAdmin.sidebarPermissions,
        isImpersonating: true,
        originalAdminName: `${req.admin.firstName} ${req.admin.lastName}`
      }
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error impersonating admin', 
      error: error.message 
    })
  }
})

// POST /api/impersonate/user/:userId - Admin or Super Admin impersonates User
router.post('/user/:userId', verifyAdminToken, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId)
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Check permission
    const hasAccess = await canAccessUser(req.admin, req.params.userId)
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to access this user' 
      })
    }

    // Generate impersonation token for user
    const token = jwt.sign(
      { 
        userId: targetUser._id,
        originalAdminId: req.originalAdminId,
        impersonatedUserId: targetUser._id,
        isImpersonating: true,
        impersonatedBy: 'admin'
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    )

    res.json({
      success: true,
      message: `Now impersonating user ${targetUser.firstName || targetUser.email}`,
      token,
      user: {
        _id: targetUser._id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        walletBalance: targetUser.walletBalance,
        isImpersonating: true,
        originalAdminName: `${req.admin.firstName} ${req.admin.lastName}`
      }
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error impersonating user', 
      error: error.message 
    })
  }
})

// POST /api/impersonate/exit - Exit impersonation and return to original admin
router.post('/exit', verifyAdminToken, async (req, res) => {
  try {
    const originalAdmin = await Admin.findById(req.originalAdminId)
    if (!originalAdmin) {
      return res.status(404).json({ success: false, message: 'Original admin not found' })
    }

    // Generate token for original admin
    const token = jwt.sign(
      { 
        adminId: originalAdmin._id,
        role: originalAdmin.role,
        email: originalAdmin.email
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    )

    res.json({
      success: true,
      message: 'Returned to your account',
      token,
      admin: {
        _id: originalAdmin._id,
        email: originalAdmin.email,
        firstName: originalAdmin.firstName,
        lastName: originalAdmin.lastName,
        role: originalAdmin.role,
        sidebarPermissions: originalAdmin.sidebarPermissions,
        isImpersonating: false
      }
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error exiting impersonation', 
      error: error.message 
    })
  }
})

export default router
