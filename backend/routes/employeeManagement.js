import express from 'express'
import jwt from 'jsonwebtoken'
import Employee from '../models/Employee.js'
import Admin from '../models/Admin.js'
import { verifyAdminToken, requireSuperAdmin, requireSidebarPermission, PERMISSIONS } from '../middleware/rbac.js'

const router = express.Router()
// Get JWT_SECRET dynamically to ensure env is loaded
const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key'

// Predefined role templates
const roleTemplates = {
  SUPPORT: {
    canViewDashboard: true,
    canViewUsers: true,
    canViewSupport: true,
    canManageSupport: true,
    canReplySupport: true,
    canViewKYC: true
  },
  FINANCE: {
    canViewDashboard: true,
    canViewUsers: true,
    canViewDeposits: true,
    canApproveDeposits: true,
    canRejectDeposits: true,
    canViewWithdrawals: true,
    canApproveWithdrawals: true,
    canRejectWithdrawals: true,
    canViewReports: true
  },
  KYC_OFFICER: {
    canViewDashboard: true,
    canViewUsers: true,
    canViewKYC: true,
    canApproveKYC: true,
    canRejectKYC: true
  },
  TRADE_MANAGER: {
    canViewDashboard: true,
    canViewUsers: true,
    canViewAccounts: true,
    canViewTrades: true,
    canManageTrades: true,
    canCloseTrades: true
  },
  MANAGER: {
    canViewDashboard: true,
    canViewUsers: true,
    canManageUsers: true,
    canViewAccounts: true,
    canManageAccounts: true,
    canViewTrades: true,
    canManageTrades: true,
    canViewDeposits: true,
    canApproveDeposits: true,
    canRejectDeposits: true,
    canViewWithdrawals: true,
    canApproveWithdrawals: true,
    canRejectWithdrawals: true,
    canViewKYC: true,
    canApproveKYC: true,
    canRejectKYC: true,
    canViewIB: true,
    canViewCopyTrading: true,
    canViewPropTrading: true,
    canViewSupport: true,
    canManageSupport: true,
    canReplySupport: true,
    canViewReports: true,
    canExportReports: true
  },
  CUSTOM: {}
}

// GET /api/employee-mgmt/role-templates
router.get('/role-templates', verifyAdminToken, requireSidebarPermission(PERMISSIONS.SIDEBAR.EMPLOYEE_MANAGEMENT), async (req, res) => {
  try {
    res.json({ success: true, roleTemplates })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/employee-mgmt/employees
router.get('/employees', verifyAdminToken, requireSidebarPermission(PERMISSIONS.SIDEBAR.EMPLOYEE_MANAGEMENT), async (req, res) => {
  try {
    const employees = await Employee.find({ createdBy: req.user._id })
      .select('-password')
      .sort({ createdAt: -1 })

    res.json({ success: true, employees })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/employee-mgmt/employees
router.post('/employees', verifyAdminToken, requireSidebarPermission(PERMISSIONS.SIDEBAR.EMPLOYEE_MANAGEMENT), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role, permissions } = req.body

    if (!email || !password || !firstName || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, first name, and role are required' 
      })
    }

    const existingEmployee = await Employee.findOne({ email: email.toLowerCase() })
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: 'Email already exists' })
    }

    let employeePermissions = {}
    if (role === 'CUSTOM' && permissions) {
      employeePermissions = permissions
    } else if (roleTemplates[role]) {
      employeePermissions = roleTemplates[role]
    }

    const employee = await Employee.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName: lastName || '',
      phone: phone || '',
      role,
      permissions: employeePermissions,
      createdBy: req.user._id
    })

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: {
        _id: employee._id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        permissions: employee.permissions,
        status: employee.status
      }
    })
  } catch (error) {
    console.error('Create employee error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/employee-mgmt/employees/:id
router.put('/employees/:id', verifyAdminToken, requireSidebarPermission(PERMISSIONS.SIDEBAR.EMPLOYEE_MANAGEMENT), async (req, res) => {
  try {
    const { firstName, lastName, phone, role, status } = req.body

    const employee = await Employee.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    })

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' })
    }

    if (firstName) employee.firstName = firstName
    if (lastName !== undefined) employee.lastName = lastName
    if (phone !== undefined) employee.phone = phone
    if (role) employee.role = role
    if (status) employee.status = status

    await employee.save()

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee: {
        _id: employee._id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        status: employee.status
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/employee-mgmt/employees/:id/permissions
router.put('/employees/:id/permissions', verifyAdminToken, requireSidebarPermission(PERMISSIONS.SIDEBAR.EMPLOYEE_MANAGEMENT), async (req, res) => {
  try {
    const { permissions, role } = req.body

    const employee = await Employee.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    })

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' })
    }

    if (role && role !== 'CUSTOM' && roleTemplates[role]) {
      employee.role = role
      employee.permissions = roleTemplates[role]
    } else if (permissions) {
      employee.role = 'CUSTOM'
      employee.permissions = permissions
    }

    await employee.save()

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      employee: {
        _id: employee._id,
        role: employee.role,
        permissions: employee.permissions
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/employee-mgmt/employees/:id/password
router.put('/employees/:id/password', verifyAdminToken, requireSidebarPermission(PERMISSIONS.SIDEBAR.EMPLOYEE_MANAGEMENT), async (req, res) => {
  try {
    const { newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      })
    }

    const employee = await Employee.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    })

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' })
    }

    employee.password = newPassword
    employee.passwordChangedAt = new Date()
    await employee.save()

    res.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/employee-mgmt/employees/:id
router.delete('/employees/:id', verifyAdminToken, requireSidebarPermission(PERMISSIONS.SIDEBAR.EMPLOYEE_MANAGEMENT), async (req, res) => {
  try {
    const employee = await Employee.findOneAndDelete({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    })

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' })
    }

    res.json({ success: true, message: 'Employee deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/employee-mgmt/employees/:id/status
router.put('/employees/:id/status', verifyAdminToken, requireSidebarPermission(PERMISSIONS.SIDEBAR.EMPLOYEE_MANAGEMENT), async (req, res) => {
  try {
    const { status } = req.body

    if (!['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' })
    }

    const employee = await Employee.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    })

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' })
    }

    employee.status = status
    await employee.save()

    res.json({ 
      success: true, 
      message: `Employee ${status.toLowerCase()} successfully`,
      employee: {
        _id: employee._id,
        status: employee.status
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
