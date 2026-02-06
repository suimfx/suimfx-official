import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'
import Employee from '../models/Employee.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
console.log('[RBAC] JWT_SECRET loaded:', JWT_SECRET ? `${JWT_SECRET.substring(0, 10)}...` : 'MISSING')

/**
 * RBAC Middleware for Suimfx Admin Panel
 * Handles authentication and authorization for Super Admin, Admin, and Employee roles
 */

// Verify token and attach user to request
export const verifyAdminToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    
    // Check if it's an employee token
    if (decoded.employeeId) {
      const employee = await Employee.findById(decoded.employeeId)
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found' })
      }
      if (employee.status !== 'ACTIVE') {
        return res.status(403).json({ success: false, message: 'Account is suspended or inactive' })
      }
      req.user = employee
      req.userType = 'EMPLOYEE'
      req.permissions = employee.permissions
      return next()
    }
    
    // Check if it's an admin token
    if (decoded.adminId || decoded.id) {
      const adminId = decoded.adminId || decoded.id
      const admin = await Admin.findById(adminId)
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found' })
      }
      if (admin.status !== 'ACTIVE') {
        return res.status(403).json({ success: false, message: 'Account is suspended' })
      }
      req.user = admin
      req.userType = admin.role // 'SUPER_ADMIN' or 'ADMIN'
      req.sidebarPermissions = admin.sidebarPermissions
      return next()
    }

    return res.status(401).json({ success: false, message: 'Invalid token' })
  } catch (error) {
    console.error('Token verification error:', error.name, error.message)
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' })
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token. Please login again.' })
    }
    return res.status(401).json({ success: false, message: 'Authentication failed. Please login again.' })
  }
}

// Check if user is Super Admin
export const requireSuperAdmin = (req, res, next) => {
  if (req.userType !== 'SUPER_ADMIN') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Super Admin privileges required.' 
    })
  }
  next()
}

// Check sidebar permission for Admin role
export const requireSidebarPermission = (permissionKey) => {
  return (req, res, next) => {
    // Super Admin has all permissions
    if (req.userType === 'SUPER_ADMIN') {
      return next()
    }
    
    // Dashboard is always accessible to all authenticated admins/employees
    if (permissionKey === 'overviewDashboard') {
      return next()
    }
    
    // Admin role - check sidebarPermissions
    if (req.userType === 'ADMIN') {
      if (req.sidebarPermissions && req.sidebarPermissions[permissionKey] === true) {
        return next()
      }
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. You don't have permission for ${permissionKey}.` 
      })
    }

    // Employee - map sidebar permission to employee permissions
    if (req.userType === 'EMPLOYEE') {
      const hasPermission = checkEmployeePermissionForSidebar(req.permissions, permissionKey)
      if (hasPermission) {
        return next()
      }
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. You don't have permission for this action.` 
      })
    }

    return res.status(403).json({ success: false, message: 'Access denied' })
  }
}

// Check specific employee permission
export const requireEmployeePermission = (permissionKey) => {
  return (req, res, next) => {
    // Super Admin has all permissions
    if (req.userType === 'SUPER_ADMIN') {
      return next()
    }
    
    // Admin role has all permissions within their sidebar access
    if (req.userType === 'ADMIN') {
      return next()
    }

    // Employee - check specific permission
    if (req.userType === 'EMPLOYEE') {
      if (req.permissions && req.permissions[permissionKey] === true) {
        return next()
      }
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. You don't have permission: ${permissionKey}` 
      })
    }

    return res.status(403).json({ success: false, message: 'Access denied' })
  }
}

// Map sidebar permissions to employee permissions
function checkEmployeePermissionForSidebar(permissions, sidebarKey) {
  if (!permissions) return false
  
  const mapping = {
    'overviewDashboard': permissions.canViewDashboard,
    'userManagement': permissions.canViewUsers || permissions.canManageUsers,
    'tradeManagement': permissions.canViewTrades || permissions.canManageTrades,
    'fundManagement': permissions.canViewDeposits || permissions.canViewWithdrawals || permissions.canApproveDeposits || permissions.canApproveWithdrawals,
    'bankSettings': permissions.canManagePaymentMethods,
    'ibManagement': permissions.canViewIB || permissions.canManageIB,
    'forexCharges': permissions.canManageCharges,
    'earningsReport': permissions.canViewReports,
    'copyTrade': permissions.canViewCopyTrading || permissions.canManageCopyTrading,
    'propFirmChallenges': permissions.canViewPropTrading || permissions.canManagePropTrading,
    'accountTypes': permissions.canManageSettings,
    'themeSettings': permissions.canManageTheme,
    'emailTemplates': permissions.canManageEmailTemplates,
    'bonusManagement': permissions.canManageBonus,
    'bannerManagement': permissions.canManageBanners,
    'kycVerification': permissions.canViewKYC || permissions.canApproveKYC,
    'supportTickets': permissions.canViewSupport || permissions.canManageSupport
  }
  
  return mapping[sidebarKey] === true
}

// Permission constants for easy reference
export const PERMISSIONS = {
  // Sidebar permissions (for Admin role)
  SIDEBAR: {
    OVERVIEW_DASHBOARD: 'overviewDashboard',
    USER_MANAGEMENT: 'userManagement',
    TRADE_MANAGEMENT: 'tradeManagement',
    FUND_MANAGEMENT: 'fundManagement',
    BANK_SETTINGS: 'bankSettings',
    IB_MANAGEMENT: 'ibManagement',
    FOREX_CHARGES: 'forexCharges',
    EARNINGS_REPORT: 'earningsReport',
    COPY_TRADE: 'copyTrade',
    PROP_FIRM: 'propFirmChallenges',
    ACCOUNT_TYPES: 'accountTypes',
    THEME_SETTINGS: 'themeSettings',
    EMAIL_TEMPLATES: 'emailTemplates',
    BONUS_MANAGEMENT: 'bonusManagement',
    BANNER_MANAGEMENT: 'bannerManagement',
    EMPLOYEE_MANAGEMENT: 'employeeManagement',
    KYC_VERIFICATION: 'kycVerification',
    SUPPORT_TICKETS: 'supportTickets'
  },
  // Employee permissions (granular)
  EMPLOYEE: {
    VIEW_DASHBOARD: 'canViewDashboard',
    VIEW_USERS: 'canViewUsers',
    MANAGE_USERS: 'canManageUsers',
    CREATE_USERS: 'canCreateUsers',
    EDIT_USERS: 'canEditUsers',
    DELETE_USERS: 'canDeleteUsers',
    VIEW_ACCOUNTS: 'canViewAccounts',
    MANAGE_ACCOUNTS: 'canManageAccounts',
    VIEW_TRADES: 'canViewTrades',
    MANAGE_TRADES: 'canManageTrades',
    CLOSE_TRADES: 'canCloseTrades',
    MODIFY_TRADES: 'canModifyTrades',
    VIEW_DEPOSITS: 'canViewDeposits',
    APPROVE_DEPOSITS: 'canApproveDeposits',
    REJECT_DEPOSITS: 'canRejectDeposits',
    VIEW_WITHDRAWALS: 'canViewWithdrawals',
    APPROVE_WITHDRAWALS: 'canApproveWithdrawals',
    REJECT_WITHDRAWALS: 'canRejectWithdrawals',
    VIEW_KYC: 'canViewKYC',
    APPROVE_KYC: 'canApproveKYC',
    REJECT_KYC: 'canRejectKYC',
    VIEW_IB: 'canViewIB',
    MANAGE_IB: 'canManageIB',
    VIEW_COPY_TRADING: 'canViewCopyTrading',
    MANAGE_COPY_TRADING: 'canManageCopyTrading',
    VIEW_PROP_TRADING: 'canViewPropTrading',
    MANAGE_PROP_TRADING: 'canManagePropTrading',
    VIEW_SUPPORT: 'canViewSupport',
    MANAGE_SUPPORT: 'canManageSupport',
    REPLY_SUPPORT: 'canReplySupport',
    VIEW_REPORTS: 'canViewReports',
    EXPORT_REPORTS: 'canExportReports',
    VIEW_SETTINGS: 'canViewSettings',
    MANAGE_SETTINGS: 'canManageSettings',
    MANAGE_PAYMENT_METHODS: 'canManagePaymentMethods',
    MANAGE_CHARGES: 'canManageCharges',
    MANAGE_THEME: 'canManageTheme',
    MANAGE_EMAIL_TEMPLATES: 'canManageEmailTemplates',
    MANAGE_BANNERS: 'canManageBanners',
    MANAGE_BONUS: 'canManageBonus'
  }
}

export default {
  verifyAdminToken,
  requireSuperAdmin,
  requireSidebarPermission,
  requireEmployeePermission,
  PERMISSIONS
}
