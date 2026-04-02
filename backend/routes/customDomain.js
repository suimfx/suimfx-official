import express from 'express'
import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'
import AdminDomainConnection from '../models/AdminDomainConnection.js'
import {
  normalizeDomain,
  buildRequiredRecords,
  refreshDnsCheck,
  getPlatformTargets,
  detectProvider
} from '../services/domainDnsService.js'

const router = express.Router()

const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key'

/**
 * Middleware: verify admin JWT (works for ADMIN, SUPER_ADMIN, and employee tokens).
 * Extracts adminId from decoded.adminId or decoded.id.
 */
const verifyAdminMgmtToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }
  const token = authHeader.slice(7).trim()
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret())
    const id = decoded.adminId || decoded.id
    if (!id) {
      return res.status(401).json({ success: false, message: 'Invalid token payload' })
    }
    req.adminId = id
    req.adminRole = decoded.role || null
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.' })
    }
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

/**
 * Checks whether this domain is already taken by a DIFFERENT admin.
 */
async function hostnameTakenByOther(hostname, adminId) {
  const otherAdmin = await Admin.findOne({
    customDomain: hostname,
    _id: { $ne: adminId }
  }).select('_id')
  if (otherAdmin) return true

  const otherConn = await AdminDomainConnection.findOne({
    hostname,
    adminId: { $ne: adminId }
  }).select('_id')
  return !!otherConn
}

/**
 * Builds a consistent connection object for API responses.
 */
function buildConnectionResponse(conn) {
  if (!conn) return null
  const requiredRecords = buildRequiredRecords(conn.hostname, conn.verificationToken)
  return {
    _id: conn._id,
    hostname: conn.hostname,
    status: conn.status,
    ssl_status: conn.ssl_status || 'pending',
    a_record_ip: conn.a_record_ip || [],
    cname_value: conn.cname_value || '',
    detectedProvider: conn.detectedProvider || '',
    nameservers: conn.nameservers || [],
    lastSnapshot: conn.lastSnapshot || null,
    lastError: conn.lastError || '',
    connectedAt: conn.connectedAt || null,
    sslActivatedAt: conn.sslActivatedAt || null,
    verifyAttempts: conn.verifyAttempts || 0,
    lastCheckedAt: conn.lastCheckedAt || null,
    updatedAt: conn.updatedAt,
    requiredRecords
  }
}

// ─────────────────────────────────────────────────────────
// GET /api/custom-domain/me
// Returns current domain connection info for the logged-in admin.
// ─────────────────────────────────────────────────────────
router.get('/me', verifyAdminMgmtToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select('customDomain')
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' })
    }

    const conn = await AdminDomainConnection.findOne({ adminId: req.adminId })
    const { cnameTarget, ipTarget } = getPlatformTargets()

    return res.json({
      success: true,
      connection: buildConnectionResponse(conn),
      adminCustomDomain: admin.customDomain || null,
      platformHints: { cnameTarget: cnameTarget || null, ipTarget: ipTarget || null }
    })
  } catch (error) {
    console.error('[custom-domain/me]', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─────────────────────────────────────────────────────────
// POST /api/custom-domain/start  { domain }
// Initializes or resets domain setup. Returns required DNS records.
// ─────────────────────────────────────────────────────────
router.post('/start', verifyAdminMgmtToken, async (req, res) => {
  try {
    const hostname = normalizeDomain(req.body?.domain || req.body?.hostname || '')
    if (!hostname) {
      return res.status(400).json({
        success: false,
        message: 'Invalid domain name. Enter a valid hostname like trade.yourbrand.com'
      })
    }

    if (await hostnameTakenByOther(hostname, req.adminId)) {
      return res.status(400).json({
        success: false,
        message: 'This domain is already connected to another account'
      })
    }

    const token = AdminDomainConnection.generateToken()

    // Detect provider in background (non-blocking)
    let detectedProvider = ''
    let nameservers = []
    try {
      const providerInfo = await detectProvider(hostname)
      detectedProvider = providerInfo.provider
      nameservers = providerInfo.nameservers
    } catch (_) {}

    const conn = await AdminDomainConnection.findOneAndUpdate(
      { adminId: req.adminId },
      {
        $set: {
          hostname,
          status: 'pending_dns',
          ssl_status: 'pending',
          verificationToken: token,
          lastError: '',
          lastSnapshot: null,
          connectedAt: null,
          sslActivatedAt: null,
          a_record_ip: [],
          cname_value: '',
          detectedProvider,
          nameservers,
          verifyAttempts: 0,
          lastCheckedAt: null
        }
      },
      { upsert: true, new: true }
    )

    // If admin previously had a different custom domain set, unset it
    const admin = await Admin.findById(req.adminId)
    if (admin && admin.customDomain && admin.customDomain !== hostname) {
      admin.customDomain = null
      await admin.save()
    }

    const { cnameTarget, ipTarget } = getPlatformTargets()

    res.json({
      success: true,
      message: 'Domain setup started. Add the DNS records below, then click Verify.',
      connection: buildConnectionResponse(conn),
      platformHints: { cnameTarget: cnameTarget || null, ipTarget: ipTarget || null }
    })
  } catch (error) {
    console.error('[custom-domain/start]', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─────────────────────────────────────────────────────────
// POST /api/custom-domain/refresh-dns
// Re-runs DNS check and updates snapshot. Does NOT mark as verified.
// ─────────────────────────────────────────────────────────
router.post('/refresh-dns', verifyAdminMgmtToken, async (req, res) => {
  try {
    const conn = await AdminDomainConnection.findOne({ adminId: req.adminId })
    if (!conn) {
      return res.status(404).json({ success: false, message: 'No domain setup in progress. Start setup first.' })
    }

    const { snapshot, flags } = await refreshDnsCheck(conn.hostname, conn.verificationToken)

    // Save full snapshot with flags embedded
    conn.lastSnapshot = { ...snapshot, flags }
    conn.lastCheckedAt = new Date()

    // Update resolved DNS values for display
    conn.a_record_ip = snapshot.aRecords || []
    conn.cname_value = (snapshot.cnameRecords || [])[0] || ''

    // Update error message
    conn.lastError = snapshot.errors.length > 0
      ? snapshot.errors.map((e) => `${e.record}: ${e.message}`).join('; ')
      : ''

    // FIX: Only update status if not already connected
    if (conn.status !== 'connected') {
      // dns_mismatch means checks ran but failed; pending_dns means we're waiting
      conn.status = flags.fullyOk ? 'pending_dns' : 'dns_mismatch'
    }

    await conn.save()

    const { cnameTarget, ipTarget } = getPlatformTargets()

    res.json({
      success: true,
      connection: buildConnectionResponse(conn),
      flags, // Expose flags at top level for easy access
      platformHints: { cnameTarget: cnameTarget || null, ipTarget: ipTarget || null }
    })
  } catch (error) {
    console.error('[custom-domain/refresh-dns]', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─────────────────────────────────────────────────────────
// POST /api/custom-domain/verify
// Final verification: confirms DNS is correct and marks domain as connected.
// ─────────────────────────────────────────────────────────
router.post('/verify', verifyAdminMgmtToken, async (req, res) => {
  try {
    const conn = await AdminDomainConnection.findOne({ adminId: req.adminId })
    if (!conn) {
      return res.status(404).json({ success: false, message: 'No domain setup in progress. Start setup first.' })
    }

    const { snapshot, flags } = await refreshDnsCheck(conn.hostname, conn.verificationToken)

    // Update snapshot and attempt count
    conn.lastSnapshot = { ...snapshot, flags }
    conn.lastCheckedAt = new Date()
    conn.a_record_ip = snapshot.aRecords || []
    conn.cname_value = (snapshot.cnameRecords || [])[0] || ''
    conn.verifyAttempts = (conn.verifyAttempts || 0) + 1

    if (!flags.fullyOk) {
      conn.status = 'dns_mismatch'
      const missing = []
      if (!flags.txtOk) missing.push('TXT verification record')
      if (flags.hasRoutingRule && !flags.routingOk) missing.push('A/CNAME routing record')
      conn.lastError = `DNS not ready yet. Missing: ${missing.join(', ') || 'records'}. DNS propagation can take up to 24 hours.`
      await conn.save()

      return res.status(400).json({
        success: false,
        message: conn.lastError,
        flags,
        connection: buildConnectionResponse(conn)
      })
    }

    // Check that another admin hasn't just claimed it
    if (await hostnameTakenByOther(conn.hostname, req.adminId)) {
      conn.lastError = 'Domain was claimed by another account during verification'
      await conn.save()
      return res.status(400).json({ success: false, message: conn.lastError })
    }

    // Update admin's customDomain field
    const admin = await Admin.findById(req.adminId)
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' })
    }

    admin.customDomain = conn.hostname
    await admin.save()

    // Mark as connected
    conn.status = 'connected'
    conn.connectedAt = new Date()
    conn.lastError = ''
    conn.ssl_status = 'pending' // SSL is handled by reverse proxy/certbot

    await conn.save()

    res.json({
      success: true,
      message: `Domain ${conn.hostname} connected successfully! Configure SSL (HTTPS) on your server's reverse proxy to enable secure access.`,
      admin: { customDomain: admin.customDomain },
      connection: buildConnectionResponse(conn),
      flags
    })
  } catch (error) {
    console.error('[custom-domain/verify]', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─────────────────────────────────────────────────────────
// POST /api/custom-domain/disconnect
// Removes domain connection entirely.
// ─────────────────────────────────────────────────────────
router.post('/disconnect', verifyAdminMgmtToken, async (req, res) => {
  try {
    await AdminDomainConnection.deleteOne({ adminId: req.adminId })
    const admin = await Admin.findById(req.adminId)
    if (admin) {
      admin.customDomain = null
      await admin.save()
    }
    res.json({ success: true, message: 'Custom domain removed successfully', admin: { customDomain: null } })
  } catch (error) {
    console.error('[custom-domain/disconnect]', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─────────────────────────────────────────────────────────
// POST /api/custom-domain/mark-ssl-active
// Super admin or internal: mark SSL as active after certbot configures it.
// ─────────────────────────────────────────────────────────
router.post('/mark-ssl-active', verifyAdminMgmtToken, async (req, res) => {
  try {
    const conn = await AdminDomainConnection.findOne({ adminId: req.adminId })
    if (!conn) {
      return res.status(404).json({ success: false, message: 'No domain connection found' })
    }
    if (conn.status !== 'connected') {
      return res.status(400).json({ success: false, message: 'Domain must be verified/connected first' })
    }
    conn.ssl_status = 'active'
    conn.sslActivatedAt = new Date()
    await conn.save()
    res.json({ success: true, message: 'SSL status updated to active', connection: buildConnectionResponse(conn) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─────────────────────────────────────────────────────────
// GET /api/custom-domain/all
// Super Admin only: list all domain connections across all admins.
// ─────────────────────────────────────────────────────────
router.get('/all', verifyAdminMgmtToken, async (req, res) => {
  try {
    // Verify super admin role
    const admin = await Admin.findById(req.adminId).select('role')
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Super admin access required' })
    }

    const connections = await AdminDomainConnection.find({})
      .sort({ updatedAt: -1 })
      .populate('adminId', 'firstName lastName email brandName')
      .lean()

    const result = connections.map((conn) => ({
      ...conn,
      requiredRecords: buildRequiredRecords(conn.hostname, conn.verificationToken)
    }))

    res.json({ success: true, connections: result, total: result.length })
  } catch (error) {
    console.error('[custom-domain/all]', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─────────────────────────────────────────────────────────
// POST /api/custom-domain/lookup-by-hostname
// Used by multi-tenant middleware to resolve which admin owns a custom domain.
// ─────────────────────────────────────────────────────────
router.post('/lookup-by-hostname', async (req, res) => {
  try {
    const { hostname } = req.body
    if (!hostname) return res.status(400).json({ success: false, message: 'hostname required' })

    const normalized = normalizeDomain(hostname)
    if (!normalized) return res.status(400).json({ success: false, message: 'Invalid hostname' })

    // Check AdminDomainConnection first
    const conn = await AdminDomainConnection.findOne({ hostname: normalized, status: 'connected' })
    if (conn) {
      const admin = await Admin.findById(conn.adminId).select('_id email firstName lastName brandName urlSlug customDomain logo referralCode')
      if (admin) {
        return res.json({ success: true, found: true, admin })
      }
    }

    // Fall back to Admin.customDomain field
    const adminByDomain = await Admin.findOne({ customDomain: normalized }).select('_id email firstName lastName brandName urlSlug customDomain logo referralCode')
    if (adminByDomain) {
      return res.json({ success: true, found: true, admin: adminByDomain })
    }

    res.json({ success: true, found: false })
  } catch (error) {
    console.error('[custom-domain/lookup-by-hostname]', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
