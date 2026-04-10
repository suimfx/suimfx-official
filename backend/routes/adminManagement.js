import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import Admin from '../models/Admin.js'
import Employee from '../models/Employee.js'
import AdminWallet from '../models/AdminWallet.js'
import AdminWalletTransaction from '../models/AdminWalletTransaction.js'
import User from '../models/User.js'
import Transaction from '../models/Transaction.js'
import Trade from '../models/Trade.js'
import { generateReferralCode } from '../utils/adminFilter.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure logos directory exists
const logosDir = path.join(__dirname, '../uploads/logos')
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true })
}

// Multer config for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, logosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `logo-${req.adminId}-${Date.now()}${ext}`)
  }
})
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Only image files are allowed'), false)
  }
})

const router = express.Router()

// Get JWT_SECRET dynamically to ensure env is loaded
const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key'

// Middleware to verify admin token
const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }
  
  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, getJwtSecret())
    req.adminId = decoded.adminId
    next()
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

// ==================== ADMIN AUTH ====================

// PUT /api/admin-mgmt/change-password - Change own password
router.put('/change-password', verifyAdminToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
    }

    const admin = await Admin.findById(req.adminId)
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' })
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    admin.password = hashedPassword
    await admin.save()

    res.json({ success: true, message: 'Password changed successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error changing password', error: error.message })
  }
})

// PUT /api/admin-mgmt/update-profile - Update own profile (name, phone, brandName, customDomain)
router.put('/update-profile', verifyAdminToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, brandName, customDomain } = req.body

    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ success: false, message: 'First name is required' })
    }

    const admin = await Admin.findById(req.adminId)
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' })
    }

    admin.firstName = firstName.trim()
    admin.lastName = lastName?.trim() || ''
    admin.phone = phone?.trim() || ''
    if (brandName !== undefined) {
      admin.brandName = brandName?.trim() || ''
    }
    if (customDomain !== undefined) {
      // Validate domain uniqueness if set
      if (customDomain && customDomain.trim()) {
        const domainClean = customDomain.trim().toLowerCase()
        const existing = await Admin.findOne({ customDomain: domainClean, _id: { $ne: admin._id } })
        if (existing) {
          return res.status(400).json({ success: false, message: 'This domain is already in use by another admin' })
        }
        admin.customDomain = domainClean
      } else {
        admin.customDomain = null
      }
    }
    await admin.save()

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      admin: {
        firstName: admin.firstName,
        lastName: admin.lastName,
        phone: admin.phone,
        brandName: admin.brandName,
        customDomain: admin.customDomain,
        logo: admin.logo
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating profile', error: error.message })
  }
})

// POST /api/admin-mgmt/upload-logo - Upload admin logo
router.post('/upload-logo', verifyAdminToken, logoUpload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }

    const admin = await Admin.findById(req.adminId)
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' })
    }

    // Delete old logo file if exists
    if (admin.logo) {
      const oldPath = path.join(__dirname, '..', admin.logo)
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath)
      }
    }

    admin.logo = `/uploads/logos/${req.file.filename}`
    await admin.save()

    res.json({ 
      success: true, 
      message: 'Logo uploaded successfully',
      logo: admin.logo
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error uploading logo', error: error.message })
  }
})

// GET /api/admin-mgmt/my-profile - Get own admin profile
router.get('/my-profile', verifyAdminToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-password')
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' })
    }
    res.json({ success: true, admin })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching profile', error: error.message })
  }
})

// POST /api/admin-mgmt/login - Super Admin login only (for /admin route)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const admin = await Admin.findOne({ email: email.toLowerCase() })
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    // Only SUPER_ADMIN can login via this route
    if (admin.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Use admin-employee login.' })
    }

    if (admin.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Account is suspended or pending' })
    }

    const isMatch = await bcrypt.compare(password, admin.password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    // Update last login
    admin.lastLogin = new Date()
    await admin.save()

    // Get wallet info
    const wallet = await AdminWallet.findOne({ adminId: admin._id })

    const token = jwt.sign(
      { adminId: admin._id, role: admin.role, email: admin.email },
      getJwtSecret(),
      { expiresIn: '24h' }
    )

    res.json({
      success: true,
      token,
      admin: {
        _id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        sessionKind: 'super_admin',
        urlSlug: admin.urlSlug,
        brandName: admin.brandName,
        logo: admin.logo,
        customDomain: admin.customDomain,
        sidebarPermissions: admin.sidebarPermissions,
        walletBalance: wallet?.balance || 0
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message })
  }
})

// POST /api/admin-mgmt/admin-login - Admin/Employee login only (for /admin-employee route)
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password, adminSlug, domain } = req.body
    console.log('Admin login attempt:', email, adminSlug ? `(slug: ${adminSlug})` : domain ? `(domain: ${domain})` : '')

    // Resolve the admin context: by slug OR by custom domain (fallback when branding fetch failed)
    let slugAdmin = null
    if (adminSlug) {
      slugAdmin = await Admin.findOne({ urlSlug: adminSlug.toLowerCase(), status: 'ACTIVE' })
      if (!slugAdmin) {
        return res.status(404).json({ success: false, message: 'Invalid login URL' })
      }
    } else if (domain) {
      const domainClean = domain.toLowerCase().replace(/^www\./, '').replace(/^https?:\/\//, '').replace(/\/$/, '')
      slugAdmin = await Admin.findOne({
        customDomain: { $in: [domainClean, `www.${domainClean}`] },
        status: 'ACTIVE'
      })
      if (!slugAdmin) {
        return res.status(404).json({ success: false, message: 'No admin found for this domain' })
      }
    }

    // Only attempt admin (ADMIN role) lookup when no slug is provided (central login)
    if (!adminSlug) {
      const admin = await Admin.findOne({ email: email.toLowerCase() })
      console.log('Admin found:', admin ? { id: admin._id, role: admin.role } : null)

      if (admin) {
        if (admin.role !== 'ADMIN') {
          return res.status(403).json({ success: false, message: 'Access denied. Use super admin login.' })
        }

        if (admin.status !== 'ACTIVE') {
          return res.status(403).json({ success: false, message: 'Account is suspended or pending' })
        }

        const isMatch = await bcrypt.compare(password, admin.password)
        if (isMatch) {
          admin.lastLogin = new Date()
          await admin.save()

          const wallet = await AdminWallet.findOne({ adminId: admin._id })

          const token = jwt.sign(
            { adminId: admin._id, role: admin.role, email: admin.email },
            getJwtSecret(),
            { expiresIn: '24h' }
          )

          return res.json({
            success: true,
            token,
            admin: {
              _id: admin._id,
              email: admin.email,
              firstName: admin.firstName,
              lastName: admin.lastName,
              role: admin.role,
              sessionKind: 'admin',
              referralCode: admin.referralCode,
              urlSlug: admin.urlSlug,
              brandName: admin.brandName,
              logo: admin.logo,
              customDomain: admin.customDomain,
              sidebarPermissions: admin.sidebarPermissions,
              walletBalance: wallet?.balance || 0
            }
          })
        }
        // Wrong password for this Admin email — fall through to Employee check
      }
    }

    // Staff created under Employee Management live in Employee collection (not Admin)
    // If adminSlug provided, scope lookup to that admin's employees only (security)
    const employeeQuery = { email: email.toLowerCase() }
    if (slugAdmin) employeeQuery.createdBy = slugAdmin._id

    const employee = await Employee.findOne(employeeQuery)
    if (!employee) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }
    if (employee.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Account is suspended or inactive' })
    }

    const parentAdmin = slugAdmin || await Admin.findById(employee.createdBy)
    if (!parentAdmin || parentAdmin.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Employer account is unavailable' })
    }

    const employeePasswordOk = await employee.comparePassword(password)
    if (!employeePasswordOk) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    employee.lastLogin = new Date()
    await employee.save()

    const token = jwt.sign(
      { employeeId: employee._id, role: employee.role, email: employee.email },
      getJwtSecret(),
      { expiresIn: '24h' }
    )

    const wallet = await AdminWallet.findOne({ adminId: parentAdmin._id })

    res.json({
      success: true,
      token,
      admin: {
        _id: employee._id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        sessionKind: 'employee',
        employerRole: parentAdmin.role,
        employerId: parentAdmin._id,
        permissions: employee.permissions,
        urlSlug: parentAdmin.urlSlug,
        brandName: parentAdmin.brandName,
        logo: parentAdmin.logo,
        customDomain: parentAdmin.customDomain,
        walletBalance: wallet?.balance || 0
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message })
  }
})

// ==================== SUPER ADMIN - ADMIN MANAGEMENT ====================

// GET /api/admin-mgmt/admins - Get all admins (super admin only)
router.get('/admins', async (req, res) => {
  try {
    const admins = await Admin.find({ role: 'ADMIN' })
      .select('-password')
      .sort({ createdAt: -1 })

    // Get wallet balances for each admin
    const adminsWithWallets = await Promise.all(admins.map(async (admin) => {
      const wallet = await AdminWallet.findOne({ adminId: admin._id })
      const userCount = await User.countDocuments({ assignedAdmin: admin._id })
      return {
        ...admin.toObject(),
        walletBalance: wallet?.balance || 0,
        totalReceived: wallet?.totalReceived || 0,
        totalGivenToUsers: wallet?.totalGivenToUsers || 0,
        userCount
      }
    }))

    res.json({ success: true, admins: adminsWithWallets })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admins', error: error.message })
  }
})

// GET /api/admin-mgmt/admins/:id - Get single admin details
router.get('/admins/:id', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select('-password')
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    const wallet = await AdminWallet.findOne({ adminId: admin._id })
    const userCount = await User.countDocuments({ assignedAdmin: admin._id })

    res.json({
      success: true,
      admin: {
        ...admin.toObject(),
        walletBalance: wallet?.balance || 0,
        totalReceived: wallet?.totalReceived || 0,
        totalGivenToUsers: wallet?.totalGivenToUsers || 0,
        userCount
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin', error: error.message })
  }
})

// POST /api/admin-mgmt/admins - Create new admin (super admin only)
router.post('/admins', async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      commissionRate,
      customDomain
    } = req.body

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Check if email already exists
    const existingEmail = await Admin.findOne({ email: email.toLowerCase() })
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Default sidebar permissions for new ADMIN
    const defaultSidebarPermissions = {
      overviewDashboard: true,
      userManagement: false,
      tradeManagement: false,
      bookManagement: false,
      fundManagement: false,
      bankSettings: false,
      ibManagement: false,
      forexCharges: false,
      earningsReport: false,
      copyTrade: false,
      propFirmChallenges: false,
      accountTypes: false,
      themeSettings: false,
      emailTemplates: false,
      bonusManagement: false,
      bannerManagement: false,
      adminManagement: false,
      employeeManagement: true,
      kycVerification: false,
      supportTickets: false
    }

    // Merge with provided sidebarPermissions
    const finalSidebarPermissions = { ...defaultSidebarPermissions, ...(req.body.sidebarPermissions || {}) }

    // Generate unique urlSlug from email
    const generatedSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Date.now().toString(36)
    
    // Generate unique referral code
    let referralCode = generateReferralCode()
    let codeExists = await Admin.findOne({ referralCode })
    while (codeExists) {
      referralCode = generateReferralCode()
      codeExists = await Admin.findOne({ referralCode })
    }

    // Create admin
    const admin = new Admin({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || '',
      urlSlug: generatedSlug,
      referralCode,
      commissionRate: commissionRate || 0,
      customDomain: customDomain || null,
      role: 'ADMIN',
      sidebarPermissions: finalSidebarPermissions
    })

    await admin.save()

    // Create wallet for admin
    const wallet = new AdminWallet({
      adminId: admin._id,
      balance: 0
    })
    await wallet.save()

    res.json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        _id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        referralCode: admin.referralCode,
        commissionRate: admin.commissionRate,
        customDomain: admin.customDomain,
        sidebarPermissions: admin.sidebarPermissions
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error creating admin', error: error.message })
  }
})

// PUT /api/admin-mgmt/admins/:id - Update admin
router.put('/admins/:id', async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      phone,
      status,
      commissionRate,
      customDomain,
      sidebarPermissions
    } = req.body

    const admin = await Admin.findById(req.params.id)
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    // Update email (check for duplicates)
    if (email && email !== admin.email) {
      const existingAdmin = await Admin.findOne({ email: email.toLowerCase(), _id: { $ne: admin._id } })
      if (existingAdmin) {
        return res.status(400).json({ success: false, message: 'Email already in use by another admin' })
      }
      admin.email = email.toLowerCase()
    }

    // Update fields
    if (firstName) admin.firstName = firstName
    if (lastName) admin.lastName = lastName
    if (phone !== undefined) admin.phone = phone
    if (status) admin.status = status
    if (commissionRate !== undefined) admin.commissionRate = commissionRate
    if (customDomain !== undefined) admin.customDomain = customDomain
    if (sidebarPermissions) admin.sidebarPermissions = sidebarPermissions

    await admin.save()

    res.json({
      success: true,
      message: 'Admin updated successfully',
      admin: {
        _id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        sidebarPermissions: admin.sidebarPermissions,
        status: admin.status
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error updating admin', error: error.message })
  }
})

// PUT /api/admin-mgmt/admins/:id/permissions - Update admin sidebar permissions
router.put('/admins/:id/permissions', async (req, res) => {
  try {
    const { sidebarPermissions } = req.body

    const admin = await Admin.findById(req.params.id)
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    // Default all permissions to false, then apply the provided ones
    const defaultPermissions = {
      overviewDashboard: true,
      userManagement: false,
      tradeManagement: false,
      bookManagement: false,
      fundManagement: false,
      bankSettings: false,
      ibManagement: false,
      forexCharges: false,
      earningsReport: false,
      copyTrade: false,
      propFirmChallenges: false,
      accountTypes: false,
      themeSettings: false,
      emailTemplates: false,
      bonusManagement: false,
      bannerManagement: false,
      adminManagement: false,
      employeeManagement: false,
      kycVerification: false,
      supportTickets: false
    }

    // Replace permissions entirely (not merge) to ensure unchecked items become false
    admin.sidebarPermissions = { ...defaultPermissions, ...sidebarPermissions }
    await admin.save()
    
    console.log('Updated permissions for admin:', admin._id, admin.sidebarPermissions)

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      sidebarPermissions: admin.sidebarPermissions
    })
  } catch (error) {
    res.status(500).json({ message: 'Error updating permissions', error: error.message })
  }
})

// POST /api/admin-mgmt/fix-subadmin-permissions - Fix all subadmin permissions (one-time migration)
router.post('/fix-subadmin-permissions', async (req, res) => {
  try {
    const defaultPermissions = {
      overviewDashboard: true,
      userManagement: false,
      tradeManagement: false,
      bookManagement: false,
      fundManagement: false,
      bankSettings: false,
      ibManagement: false,
      forexCharges: false,
      earningsReport: false,
      copyTrade: false,
      propFirmChallenges: false,
      accountTypes: false,
      themeSettings: false,
      emailTemplates: false,
      bonusManagement: false,
      bannerManagement: false,
      adminManagement: false,
      employeeManagement: true,
      kycVerification: false,
      supportTickets: false
    }

    // Find all ADMIN role users and reset their permissions to defaults
    const result = await Admin.updateMany(
      { role: 'ADMIN' },
      { $set: { sidebarPermissions: defaultPermissions } }
    )

    console.log('Fixed subadmin permissions:', result)
    res.json({
      success: true,
      message: `Reset permissions for ${result.modifiedCount} subadmins`,
      modifiedCount: result.modifiedCount
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fixing permissions', error: error.message })
  }
})

// PUT /api/admin-mgmt/admins/:id/reset-password - Reset admin password
router.put('/admins/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const admin = await Admin.findById(req.params.id)
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    admin.password = hashedPassword
    await admin.save()

    res.json({
      success: true,
      message: 'Password reset successfully'
    })
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message })
  }
})

// GET /api/admin-mgmt/super-admin-stats - Get total commission stats for the super admin
router.get('/super-admin-stats', async (req, res) => {
  try {
    const admins = await Admin.find().select('_id commissionRate')
    let totalCommission = 0

    for (const admin of admins) {
      const users = await User.find({ assignedAdmin: admin._id }).select('_id')
      const userIds = users.map(u => u._id)
      if (userIds.length === 0) continue

      const tradeAgg = await Trade.aggregate([
        { $match: { userId: { $in: userIds }, status: { $in: ['OPEN', 'CLOSED'] } } },
        { $group: {
          _id: null,
          totalCommission: { $sum: '$commission' },
          totalSpread: { $sum: '$spread' },
          totalSwap: { $sum: '$swap' }
        }}
      ])

      const earnings = (tradeAgg[0]?.totalCommission || 0) + (tradeAgg[0]?.totalSpread || 0) + (tradeAgg[0]?.totalSwap || 0)
      totalCommission += (earnings * (admin.commissionRate || 0)) / 100
    }

    res.json({ success: true, totalCommission })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/admin-mgmt/admin-summary/:adminId - Get detailed summary for a specific admin
router.get('/admin-summary/:adminId', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.adminId).select('-password')
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    // Get all user IDs assigned to this admin
    const users = await User.find({ assignedAdmin: admin._id }).select('_id')
    const userIds = users.map(u => u._id)
    const totalUsers = userIds.length

    // Wallet info
    const wallet = await AdminWallet.findOne({ adminId: admin._id })

    // Transaction aggregation for this admin's users
    const depositAgg = await Transaction.aggregate([
      { $match: { userId: { $in: userIds }, type: 'Deposit', status: { $in: ['Approved', 'Completed'] } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
    const withdrawalAgg = await Transaction.aggregate([
      { $match: { userId: { $in: userIds }, type: 'Withdrawal', status: { $in: ['Approved', 'Completed'] } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
    const pendingWithdrawals = await Transaction.countDocuments({
      userId: { $in: userIds }, type: 'Withdrawal', status: 'Pending'
    })

    // Trade earnings: commission + spread + swap
    const tradeAgg = await Trade.aggregate([
      { $match: { userId: { $in: userIds }, status: { $in: ['OPEN', 'CLOSED'] } } },
      { $group: {
        _id: null,
        totalCommission: { $sum: '$commission' },
        totalSpread: { $sum: '$spread' },
        totalSwap: { $sum: '$swap' },
        totalTrades: { $sum: 1 },
        totalVolume: { $sum: '$quantity' },
        totalRealizedPnl: { $sum: { $ifNull: ['$realizedPnl', 0] } }
      }}
    ])

    // Closed trades only for realized P&L
    const closedTradeAgg = await Trade.aggregate([
      { $match: { userId: { $in: userIds }, status: 'CLOSED' } },
      { $group: {
        _id: null,
        totalRealizedPnl: { $sum: { $ifNull: ['$realizedPnl', 0] } },
        closedTrades: { $sum: 1 }
      }}
    ])

    // Admin wallet transactions
    const walletReceivedAgg = await AdminWalletTransaction.aggregate([
      { $match: { toAdminId: admin._id, type: 'SUPER_TO_ADMIN', status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
    const walletGivenAgg = await AdminWalletTransaction.aggregate([
      { $match: { fromAdminId: admin._id, type: 'ADMIN_TO_USER', status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])

    // Super admin commission from this admin
    const commissionRate = admin.commissionRate || 0
    const totalDeposits = depositAgg[0]?.total || 0
    const totalEarnings = (tradeAgg[0]?.totalCommission || 0) + (tradeAgg[0]?.totalSpread || 0) + (tradeAgg[0]?.totalSwap || 0)
    const superAdminCommission = (totalEarnings * commissionRate) / 100

    res.json({
      success: true,
      summary: {
        admin: {
          _id: admin._id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          commissionRate,
          status: admin.status,
          createdAt: admin.createdAt
        },
        users: {
          total: totalUsers
        },
        wallet: {
          balance: wallet?.balance || 0,
          totalReceived: walletReceivedAgg[0]?.total || 0,
          receivedCount: walletReceivedAgg[0]?.count || 0,
          totalGivenToUsers: walletGivenAgg[0]?.total || 0,
          givenCount: walletGivenAgg[0]?.count || 0
        },
        deposits: {
          total: totalDeposits,
          count: depositAgg[0]?.count || 0
        },
        withdrawals: {
          total: withdrawalAgg[0]?.total || 0,
          count: withdrawalAgg[0]?.count || 0,
          pending: pendingWithdrawals
        },
        trades: {
          totalTrades: tradeAgg[0]?.totalTrades || 0,
          totalVolume: tradeAgg[0]?.totalVolume || 0,
          closedTrades: closedTradeAgg[0]?.closedTrades || 0,
          realizedPnl: closedTradeAgg[0]?.totalRealizedPnl || 0
        },
        earnings: {
          commission: tradeAgg[0]?.totalCommission || 0,
          spread: tradeAgg[0]?.totalSpread || 0,
          swap: tradeAgg[0]?.totalSwap || 0,
          totalEarnings
        },
        superAdminCommission: {
          rate: commissionRate,
          amount: superAdminCommission
        }
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin summary', error: error.message })
  }
})

// PUT /api/admin-mgmt/admins/:id/status - Suspend/Activate admin
router.put('/admins/:id/status', async (req, res) => {
  try {
    const { status } = req.body

    const admin = await Admin.findById(req.params.id)
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    admin.status = status
    await admin.save()

    // Also update wallet status if suspending
    if (status === 'SUSPENDED') {
      await AdminWallet.findOneAndUpdate(
        { adminId: admin._id },
        { status: 'FROZEN' }
      )
    } else if (status === 'ACTIVE') {
      await AdminWallet.findOneAndUpdate(
        { adminId: admin._id },
        { status: 'ACTIVE' }
      )
    }

    res.json({
      success: true,
      message: `Admin ${status === 'ACTIVE' ? 'activated' : 'suspended'} successfully`
    })
  } catch (error) {
    res.status(500).json({ message: 'Error updating status', error: error.message })
  }
})

// DELETE /api/admin-mgmt/admins/:id - Delete admin
router.delete('/admins/:id', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id)
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    // Check if admin has users
    const userCount = await User.countDocuments({ assignedAdmin: admin._id })
    if (userCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete admin with ${userCount} assigned users. Reassign users first.` 
      })
    }

    // Delete wallet
    await AdminWallet.findOneAndDelete({ adminId: admin._id })
    
    // Delete wallet transactions
    await AdminWalletTransaction.deleteMany({ 
      $or: [{ fromAdminId: admin._id }, { toAdminId: admin._id }] 
    })

    // Delete admin
    await Admin.findByIdAndDelete(req.params.id)

    res.json({ success: true, message: 'Admin deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting admin', error: error.message })
  }
})

// ==================== ADMIN WALLET MANAGEMENT ====================

// GET /api/admin-mgmt/wallet/:adminId - Get admin wallet
router.get('/wallet/:adminId', async (req, res) => {
  try {
    const wallet = await AdminWallet.findOne({ adminId: req.params.adminId })
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' })
    }

    res.json({ success: true, wallet })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wallet', error: error.message })
  }
})

// POST /api/admin-mgmt/wallet/fund - Fund admin wallet (super admin only)
router.post('/wallet/fund', async (req, res) => {
  try {
    const { adminId, amount, description } = req.body

    if (!adminId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid admin ID or amount' })
    }

    const admin = await Admin.findById(adminId)
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    let wallet = await AdminWallet.findOne({ adminId })
    if (!wallet) {
      wallet = new AdminWallet({ adminId, balance: 0 })
    }

    // Update wallet balance
    wallet.balance += amount
    wallet.totalReceived += amount
    await wallet.save()

    // Create transaction record
    const transaction = new AdminWalletTransaction({
      toAdminId: adminId,
      type: 'SUPER_TO_ADMIN',
      amount,
      balanceAfter: wallet.balance,
      description: description || `Funds added by Super Admin`
    })
    await transaction.save()

    res.json({
      success: true,
      message: `$${amount} added to ${admin.firstName}'s wallet`,
      wallet: {
        balance: wallet.balance,
        totalReceived: wallet.totalReceived
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error funding wallet', error: error.message })
  }
})

// POST /api/admin-mgmt/wallet/deduct - Deduct from admin wallet (super admin only)
router.post('/wallet/deduct', async (req, res) => {
  try {
    const { adminId, amount, description } = req.body

    if (!adminId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid admin ID or amount' })
    }

    const wallet = await AdminWallet.findOne({ adminId })
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' })
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' })
    }

    wallet.balance -= amount
    await wallet.save()

    // Create transaction record
    const transaction = new AdminWalletTransaction({
      fromAdminId: adminId,
      type: 'ADJUSTMENT',
      amount: -amount,
      balanceAfter: wallet.balance,
      description: description || `Funds deducted by Super Admin`
    })
    await transaction.save()

    res.json({
      success: true,
      message: `$${amount} deducted from wallet`,
      wallet: {
        balance: wallet.balance
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error deducting from wallet', error: error.message })
  }
})

// GET /api/admin-mgmt/wallet/:adminId/transactions - Get wallet transactions
router.get('/wallet/:adminId/transactions', async (req, res) => {
  try {
    const { limit = 50, type } = req.query

    const query = {
      $or: [
        { fromAdminId: req.params.adminId },
        { toAdminId: req.params.adminId }
      ]
    }

    if (type) query.type = type

    const transactions = await AdminWalletTransaction.find(query)
      .populate('fromAdminId', 'firstName lastName email')
      .populate('toAdminId', 'firstName lastName email')
      .populate('toUserId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))

    res.json({ success: true, transactions })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message })
  }
})

// ==================== PUBLIC ROUTES ====================

// GET /api/admin-mgmt/brand/:slug - Get brand info by URL slug (public - for branded login)
router.get('/brand/:slug', async (req, res) => {
  try {
    const admin = await Admin.findOne({ 
      urlSlug: req.params.slug.toLowerCase(),
      status: 'ACTIVE'
    }).select('brandName logo urlSlug _id')

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Brand not found or inactive' })
    }

    res.json({
      success: true,
      brand: {
        brandName: admin.brandName,
        logo: admin.logo,
        urlSlug: admin.urlSlug,
        adminId: admin._id
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching brand', error: error.message })
  }
})

// GET /api/admin-mgmt/branding - Get brand info by domain (public - for custom domain detection)
router.get('/branding', async (req, res) => {
  try {
    const { domain } = req.query
    if (!domain) {
      return res.status(400).json({ success: false, message: 'Domain parameter required' })
    }

    const raw = domain.toLowerCase().trim()
    const base = raw.replace(/^www\./, '')
    const domainVariants = [...new Set([raw, base, `www.${base}`])]

    const admin = await Admin.findOne({
      customDomain: { $in: domainVariants },
      status: 'ACTIVE'
    }).select('brandName logo urlSlug customDomain _id')

    if (!admin) {
      return res.status(404).json({ success: false, message: 'No brand found for this domain' })
    }

    res.json({
      success: true,
      brand: {
        brandName: admin.brandName,
        logo: admin.logo,
        urlSlug: admin.urlSlug,
        customDomain: admin.customDomain,
        adminId: admin._id
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching brand', error: error.message })
  }
})

// GET /api/admin-mgmt/by-slug/:slug - Get admin info by URL slug (public)
router.get('/by-slug/:slug', async (req, res) => {
  try {
    const admin = await Admin.findOne({ 
      urlSlug: req.params.slug.toLowerCase(),
      status: 'ACTIVE'
    }).select('brandName logo urlSlug')

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    res.json({
      success: true,
      admin: {
        brandName: admin.brandName,
        logo: admin.logo,
        urlSlug: admin.urlSlug
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin', error: error.message })
  }
})

// GET /api/admin-mgmt/check-slug/:slug - Check if URL slug is available
router.get('/check-slug/:slug', async (req, res) => {
  try {
    const existing = await Admin.findOne({ urlSlug: req.params.slug.toLowerCase() })
    res.json({ available: !existing })
  } catch (error) {
    res.status(500).json({ message: 'Error checking slug', error: error.message })
  }
})

// ==================== INITIALIZE SUPER ADMIN ====================

// POST /api/admin-mgmt/init-super-admin - Create initial super admin
router.post('/init-super-admin', async (req, res) => {
  try {
    // Check if super admin already exists
    const existingSuperAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' })
    if (existingSuperAdmin) {
      return res.status(400).json({ message: 'Super admin already exists' })
    }

    const { email, password, firstName, lastName } = req.body

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const superAdmin = new Admin({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role: 'SUPER_ADMIN',
      urlSlug: 'super-admin',
      brandName: 'Super Admin',
      permissions: {
        canManageUsers: true,
        canCreateUsers: true,
        canDeleteUsers: true,
        canViewUsers: true,
        canManageTrades: true,
        canCloseTrades: true,
        canModifyTrades: true,
        canManageAccounts: true,
        canCreateAccounts: true,
        canDeleteAccounts: true,
        canModifyLeverage: true,
        canManageDeposits: true,
        canApproveDeposits: true,
        canManageWithdrawals: true,
        canApproveWithdrawals: true,
        canManageKYC: true,
        canApproveKYC: true,
        canManageIB: true,
        canApproveIB: true,
        canManageCopyTrading: true,
        canApproveMasters: true,
        canManageSymbols: true,
        canManageGroups: true,
        canManageSettings: true,
        canManageTheme: true,
        canViewReports: true,
        canExportReports: true,
        canManageAdmins: true,
        canFundAdmins: true
      }
    })

    await superAdmin.save()

    // Create wallet for super admin (unlimited funds conceptually)
    const wallet = new AdminWallet({
      adminId: superAdmin._id,
      balance: 999999999 // Unlimited for super admin
    })
    await wallet.save()

    res.json({
      success: true,
      message: 'Super admin created successfully',
      admin: {
        _id: superAdmin._id,
        email: superAdmin.email,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        role: superAdmin.role
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error creating super admin', error: error.message })
  }
})

// GET /api/admin-mgmt/admin-by-referral/:referralCode - Get admin by referral code (supports both Admin and IB referral codes)
router.get('/admin-by-referral/:referralCode', async (req, res) => {
  try {
    const { referralCode } = req.params

    // First check if it's an Admin's referral code
    let admin = await Admin.findOne({
      referralCode: referralCode.toUpperCase(),
      status: 'ACTIVE'
    }).select('urlSlug brandName logo customDomain')

    // If not found, check if it's an IB user's referral code and resolve their admin
    if (!admin) {
      const ibUser = await User.findOne({
        referralCode: referralCode.toUpperCase(),
        isIB: true
      }).select('assignedAdmin')
      if (ibUser && ibUser.assignedAdmin) {
        admin = await Admin.findById(ibUser.assignedAdmin).select('urlSlug brandName logo customDomain')
      }
    }

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found with this referral code'
      })
    }

    res.json({
      success: true,
      admin: {
        urlSlug: admin.urlSlug,
        brandName: admin.brandName,
        logo: admin.logo,
        customDomain: admin.customDomain || null
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admin',
      error: error.message
    })
  }
})

export default router
