import dotenv from 'dotenv'
dotenv.config() // MUST be first before any other imports that use env vars

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import compression from 'compression'
import { createServer } from 'http'
import { Server } from 'socket.io'
import WebSocket from 'ws'
import cron from 'node-cron'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import accountTypesRoutes from './routes/accountTypes.js'
import tradingAccountsRoutes from './routes/tradingAccounts.js'
import walletRoutes from './routes/wallet.js'
import paymentMethodsRoutes from './routes/paymentMethods.js'
import manualCryptoRoutes from './routes/manualCrypto.js'
import tradeRoutes from './routes/trade.js'
import walletTransferRoutes from './routes/walletTransfer.js'
import adminTradeRoutes from './routes/adminTrade.js'
import copyTradingRoutes from './routes/copyTrading.js'
import ibRoutes from './routes/ibNew.js'
import propTradingRoutes from './routes/propTrading.js'
import chargesRoutes from './routes/charges.js'
import pricesRoutes from './routes/prices.js'
import earningsRoutes from './routes/earnings.js'
import supportRoutes from './routes/support.js'
import kycRoutes from './routes/kyc.js'
import themeRoutes from './routes/theme.js'
import adminManagementRoutes from './routes/adminManagement.js'
import customDomainRoutes from './routes/customDomain.js'
import impersonationRoutes from './routes/impersonation.js'
import uploadRoutes from './routes/upload.js'
import emailTemplatesRoutes from './routes/emailTemplates.js'
import bonusRoutes from './routes/bonus.js'
import bannerRoutes from './routes/banner.js'
import employeeRoutes from './routes/employee.js'
import employeeManagementRoutes from './routes/employeeManagement.js'
import lpIntegrationRoutes from './routes/lpIntegration.js'
import bookManagementRoutes from './routes/bookManagement.js'
import path from 'path'
import { fileURLToPath } from 'url'
import copyTradingEngine from './services/copyTradingEngine.js'
import tradeEngine from './services/tradeEngine.js'
import propTradingEngine from './services/propTradingEngine.js'
import lpPriceService from './services/lpPriceService.js'
import AdminDomainConnection from './models/AdminDomainConnection.js'
import { refreshDnsCheck } from './services/domainDnsService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)

// Allowed origins for CORS - use env variable or defaults
const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []
const defaultOrigins = [
  'https://suimfx.com', 
  'https://www.suimfx.com', 
  'https://trade.suimfx.com',
  'https://admin.suimfx.com',
  'https://api.suimfx.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:5001'
]
const allowedOrigins = [...new Set([...envOrigins, ...defaultOrigins])]
console.log('Allowed CORS origins:', allowedOrigins)

// CORS options with dynamic origin checking
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    
    // Allow if in list or any suimfx.com subdomain
    if (allowedOrigins.includes(origin) || origin.endsWith('.suimfx.com') || origin.includes('suimfx.com')) {
      callback(null, true)
    } else {
      console.log('CORS blocked origin:', origin)
      callback(null, true) // Allow all for now to debug
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}

// Socket.IO for real-time updates
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
})

global.io = io

// Store connected clients
const connectedClients = new Map()
const priceSubscribers = new Set()

// Price cache for real-time streaming (populated by Corecen LP pushes)
const priceCache = lpPriceService.getPriceCache()

lpPriceService.setOnPriceUpdate((symbol, price) => {
  if (priceSubscribers.size > 0) {
    io.to('prices').emit('priceUpdate', { symbol, price })
    io.to('prices').emit('priceStream', {
      prices: { [symbol]: price },
      updated: { [symbol]: true },
      timestamp: Date.now()
    })
  }
})

lpPriceService.setOnConnectionChange((connected) => {
  console.log(`[LP Price Service] ${connected ? 'Ready' : 'Disconnected'}`)
})

lpPriceService.connect()
console.log('[Market data] Corecen LP → POST /api/lp/prices/batch')

// Background stop-out check every 5 seconds
setInterval(async () => {
  try {
    if (priceCache.size === 0) return
    
    const currentPrices = {}
    priceCache.forEach((data, symbol) => {
      currentPrices[symbol] = { bid: data.bid, ask: data.ask }
    })
    
    const result = await tradeEngine.checkAllAccountsStopOut(currentPrices)
    if (result.stopOuts && result.stopOuts.length > 0) {
      console.log(`[STOP-OUT] ${result.stopOuts.length} accounts stopped out`)
    }
  } catch (error) {}
}, 5000)

// Background SL/TP check every 1 second
setInterval(async () => {
  try {
    if (priceCache.size === 0) return
    
    const currentPrices = {}
    priceCache.forEach((data, symbol) => {
      currentPrices[symbol] = { bid: data.bid, ask: data.ask }
    })
    
    const closedRegularTrades = await tradeEngine.checkSlTpForAllTrades(currentPrices)
    const closedChallengeTrades = await propTradingEngine.checkSlTpForAllTrades(currentPrices)
    
    const allClosed = [...closedRegularTrades, ...closedChallengeTrades]
    if (allClosed.length > 0) {
      console.log(`[SL/TP AUTO] ${allClosed.length} trades closed by SL/TP`)
      allClosed.forEach(ct => {
        console.log(`[SL/TP AUTO] ${ct.trade?.symbol || 'Unknown'} closed by ${ct.trigger || ct.reason} - PnL: ${ct.pnl?.toFixed(2) || 0}`)
        
        // Emit SL/TP notification to all connected clients
        io.emit('slTpTriggered', {
          symbol: ct.trade?.symbol || ct.symbol || 'Unknown',
          reason: ct.trigger || ct.reason || 'SL/TP',
          pnl: ct.pnl || 0,
          tradeId: ct.trade?._id || ct.tradeId,
          tradingAccountId: ct.trade?.tradingAccountId || ct.tradingAccountId,
          side: ct.trade?.side || ct.side,
          quantity: ct.trade?.quantity || ct.quantity,
          closePrice: ct.closePrice || ct.trade?.closePrice
        })
      })
    }
  } catch (error) {}
}, 1000)

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('subscribePrices', () => {
    socket.join('prices')
    priceSubscribers.add(socket.id)
    socket.emit('priceStream', {
      prices: Object.fromEntries(priceCache),
      updated: {},
      timestamp: Date.now()
    })
    console.log(`Socket ${socket.id} subscribed to price stream`)
  })

  socket.on('unsubscribePrices', () => {
    socket.leave('prices')
    priceSubscribers.delete(socket.id)
  })

  socket.on('subscribe', (data) => {
    const { tradingAccountId } = data
    if (tradingAccountId) {
      socket.join(`account:${tradingAccountId}`)
      connectedClients.set(socket.id, tradingAccountId)
      console.log(`Socket ${socket.id} subscribed to account ${tradingAccountId}`)
    }
  })

  socket.on('unsubscribe', (data) => {
    const { tradingAccountId } = data
    if (tradingAccountId) {
      socket.leave(`account:${tradingAccountId}`)
      connectedClients.delete(socket.id)
    }
  })

  socket.on('priceUpdate', async (data) => {
    const { tradingAccountId, prices } = data
    if (tradingAccountId && prices) {
      io.to(`account:${tradingAccountId}`).emit('accountUpdate', {
        tradingAccountId,
        prices,
        timestamp: Date.now()
      })
    }
  })

  socket.on('disconnect', () => {
    connectedClients.delete(socket.id)
    priceSubscribers.delete(socket.id)
    console.log('Client disconnected:', socket.id)
  })
})

// Make io accessible to routes
app.set('io', io)

// Middleware
app.use(compression())
app.use(cors(corsOptions))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Tenant Domain Routing Middleware
// Detects custom domains and attaches the matching admin to req.tenantAdmin.
// This allows routes to serve branded experiences per admin's custom domain.
// ─────────────────────────────────────────────────────────────────────────────
app.use(async (req, res, next) => {
  try {
    const hostname = req.hostname?.toLowerCase()
    if (!hostname) return next()

    // Skip localhost, IP addresses, and main platform domains
    const isLocalhost = hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.')
    const isPlatformDomain = hostname.endsWith('suimfx.com') || hostname === 'api.suimfx.com'
    if (isLocalhost || isPlatformDomain) return next()

    // Single Admin model import
    const AdminModel = (await import('./models/Admin.js')).default

    // First: check active domain connections
    const conn = await AdminDomainConnection.findOne({ hostname, status: 'connected' }).lean()
    if (conn) {
      const admin = await AdminModel.findById(conn.adminId)
        .select('_id email firstName lastName brandName urlSlug customDomain logo referralCode')
        .lean()
      if (admin) { req.tenantAdmin = admin; req.tenantDomain = hostname }
    } else {
      // Fallback: check Admin.customDomain field directly
      const admin = await AdminModel.findOne({ customDomain: hostname })
        .select('_id email firstName lastName brandName urlSlug customDomain logo referralCode')
        .lean()
      if (admin) { req.tenantAdmin = admin; req.tenantDomain = hostname }
    }
  } catch (_) { /* non-fatal: always proceed */ }
  next()
})

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB')
    try {
      const Transaction = (await import('./models/Transaction.js')).default
      await Transaction.syncIndexes()
    } catch (e) {
      console.warn('[MongoDB] Transaction.syncIndexes:', e.message)
    }
    // Sync IBPlan indexes (drop old unique on name, add compound name+adminId)
    try {
      const IBPlan = (await import('./models/IBPlanNew.js')).default
      await IBPlan.syncIndexes()
    } catch (e) {
      console.warn('[MongoDB] IBPlan.syncIndexes:', e.message)
    }
    // Sync IBSettings indexes (drop old unique on settingsType, add compound settingsType+adminId)
    try {
      const IBSettings = (await import('./models/IBSettings.js')).default
      await IBSettings.syncIndexes()
    } catch (e) {
      console.warn('[MongoDB] IBSettings.syncIndexes:', e.message)
    }
    // One-time migration: backfill accountTypeName for existing trading accounts
    try {
      const TradingAccount = (await import('./models/TradingAccount.js')).default
      const AccountType = (await import('./models/AccountType.js')).default
      // Find accounts missing accountTypeName
      const orphaned = await TradingAccount.find({ $or: [{ accountTypeName: '' }, { accountTypeName: { $exists: false } }] })
      let filled = 0
      for (const acc of orphaned) {
        const at = await AccountType.findById(acc.accountTypeId)
        if (at) {
          acc.accountTypeName = at.name
          await acc.save()
          filled++
        }
      }
      if (filled > 0) {
        console.log(`[Migration] Backfilled accountTypeName for ${filled} trading account(s)`)
      }
    } catch (e) {
      console.warn('[Migration] accountTypeName backfill:', e.message)
    }
    // One-time migration: ensure all ADMINs have bankSettings enabled
    try {
      const Admin = (await import('./models/Admin.js')).default
      const result = await Admin.updateMany(
        { role: 'ADMIN', 'sidebarPermissions.bankSettings': { $ne: true } },
        { $set: { 'sidebarPermissions.bankSettings': true } }
      )
      if (result.modifiedCount > 0) {
        console.log(`[Migration] Enabled bankSettings for ${result.modifiedCount} existing admin(s)`)
      }
    } catch (e) {
      console.warn('[Migration] bankSettings:', e.message)
    }
  })
  .catch((err) => console.error('MongoDB connection error:', err))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/account-types', accountTypesRoutes)
app.use('/api/trading-accounts', tradingAccountsRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/payment-methods', paymentMethodsRoutes)
app.use('/api/manual-crypto', manualCryptoRoutes)
app.use('/api/trade', tradeRoutes)
app.use('/api/wallet-transfer', walletTransferRoutes)
app.use('/api/admin/trade', adminTradeRoutes)
app.use('/api/copy', copyTradingRoutes)
app.use('/api/ib', ibRoutes)
app.use('/api/prop', propTradingRoutes)
app.use('/api/charges', chargesRoutes)
app.use('/api/prices', pricesRoutes)
app.use('/api/earnings', earningsRoutes)
app.use('/api/support', supportRoutes)
app.use('/api/kyc', kycRoutes)
app.use('/api/theme', themeRoutes)
app.use('/api/admin-mgmt', adminManagementRoutes)
app.use('/api/custom-domain', customDomainRoutes)
app.use('/api/impersonate', impersonationRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/email-templates', emailTemplatesRoutes)
app.use('/api/bonus', bonusRoutes)
app.use('/api/banners', bannerRoutes)
app.use('/api/employee', employeeRoutes)
app.use('/api/employee-mgmt', employeeManagementRoutes)
app.use('/api/lp', lpIntegrationRoutes)
app.use('/api/book-management', bookManagementRoutes)

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Serve APK download
app.get('/downloads/Suimfx.apk', (req, res) => {
  const apkPath = path.join(__dirname, 'apk', 'Suimfx.apk')
  res.download(apkPath, 'Suimfx.apk', (err) => {
    if (err) {
      console.error('APK download error:', err)
      res.status(404).json({ error: 'APK not found' })
    }
  })
})

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Suimfx API is running' })
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)

  // ─── Domain Auto-Recheck Cron (every 5 minutes) ───────────────────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      const pendingDomains = await AdminDomainConnection.find({
        status: { $in: ['pending_dns', 'dns_mismatch'] }
      }).lean()

      if (pendingDomains.length === 0) return

      console.log(`[CRON-DOMAIN] Checking ${pendingDomains.length} pending domain(s)...`)

      for (const connDoc of pendingDomains) {
        try {
          const { snapshot, flags } = await refreshDnsCheck(connDoc.hostname, connDoc.verificationToken)
          const update = {
            lastSnapshot: { ...snapshot, flags },
            lastCheckedAt: new Date(),
            a_record_ip: snapshot.aRecords || [],
            cname_value: (snapshot.cnameRecords || [])[0] || '',
            lastError: snapshot.errors.length > 0
              ? snapshot.errors.map((e) => `${e.record}: ${e.message}`).join('; ')
              : ''
          }
          update.status = flags.fullyOk ? 'pending_dns' : 'dns_mismatch'

          await AdminDomainConnection.updateOne({ _id: connDoc._id }, { $set: update })

          if (flags.fullyOk) {
            console.log(`[CRON-DOMAIN] ✅ ${connDoc.hostname} — DNS ready, awaiting manual verify`)
          } else {
            console.log(`[CRON-DOMAIN] ⏳ ${connDoc.hostname} — DNS not ready yet`)
          }
        } catch (domainErr) {
          console.error(`[CRON-DOMAIN] Error checking ${connDoc.hostname}:`, domainErr.message)
        }
      }
    } catch (err) {
      console.error('[CRON-DOMAIN] Cron error:', err.message)
    }
  })
  console.log('[CRON] Domain auto-recheck scheduled every 5 minutes')

  // Schedule daily commission calculation for copy trading
  cron.schedule('59 23 * * *', async () => {
    console.log('[CRON] Running daily copy trade commission calculation...')
    try {
      const results = await copyTradingEngine.calculateDailyCommission()
      console.log(`[CRON] Daily commission calculated: ${results.length} commission records processed`)
    } catch (error) {
      console.error('[CRON] Error calculating daily commission:', error)
    }
  }, {
    timezone: 'UTC'
  })
  console.log('[CRON] Daily commission calculation scheduled for 23:59 UTC')
  
  // Schedule daily swap application for all open trades
  cron.schedule('0 22 * * *', async () => {
    console.log('[CRON] Applying daily swap to all open trades...')
    try {
      await tradeEngine.applySwap()
      console.log('[CRON] Swap applied successfully')
    } catch (error) {
      console.error('[CRON] Error applying swap:', error)
    }
  }, {
    timezone: 'UTC'
  })
  console.log('[CRON] Daily swap application scheduled for 22:00 UTC')
})
