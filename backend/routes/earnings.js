import express from 'express'
import Trade from '../models/Trade.js'
import { verifyAdminToken } from '../middleware/rbac.js'
import { getAdminUserIds } from '../utils/adminFilter.js'
import { SPREAD_DOLLARS_STAGE } from '../utils/earningsAgg.js'

const router = express.Router()

/** Exclude demo TradingAccount trades; keep ChallengeAccount trades (prop). */
const REAL_ACCOUNT_STAGES = [
  {
    $lookup: {
      from: 'tradingaccounts',
      localField: 'tradingAccountId',
      foreignField: '_id',
      as: '_ta'
    }
  },
  {
    $match: {
      $or: [
        { accountType: 'ChallengeAccount' },
        {
          $and: [
            { accountType: 'TradingAccount' },
            { '_ta.0': { $exists: true } },
            { '_ta.0.isDemo': { $ne: true } }
          ]
        }
      ]
    }
  }
]


function earningsTotal (commission, spread, swap) {
  return (commission || 0) + (spread || 0) + (swap || 0)
}

// GET /api/earnings/summary - Get earnings summary (daily, weekly, monthly)
router.get('/summary', verifyAdminToken, async (req, res) => {
  try {
    const now = new Date()

    let userFilter = {}
    const userIds = await getAdminUserIds(req.admin)
    if (userIds) userFilter.userId = { $in: userIds }

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const yearStart = new Date(now.getFullYear(), 0, 1)

    const aggregateEarnings = async (startDate, endDate = now) => {
      const result = await Trade.aggregate([
        {
          $addFields: {
            _tradeDate: { $ifNull: ['$openedAt', '$createdAt'] }
          }
        },
        {
          $match: {
            ...userFilter,
            _tradeDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['OPEN', 'CLOSED'] }
          }
        },
        ...REAL_ACCOUNT_STAGES,
        SPREAD_DOLLARS_STAGE,
        {
          $group: {
            _id: null,
            totalCommission: { $sum: '$commission' },
            totalSpread: { $sum: '$_spreadDollars' },
            totalSwap: { $sum: '$swap' },
            tradeCount: { $sum: 1 },
            totalVolume: { $sum: '$quantity' }
          }
        }
      ])

      if (result.length === 0) {
        return { totalCommission: 0, totalSpread: 0, totalSwap: 0, tradeCount: 0, totalVolume: 0 }
      }

      return result[0]
    }

    const [today, thisWeek, thisMonth, thisYear, allTime] = await Promise.all([
      aggregateEarnings(todayStart),
      aggregateEarnings(weekStart),
      aggregateEarnings(monthStart),
      aggregateEarnings(yearStart),
      aggregateEarnings(new Date(0))
    ])

    const pack = (row) => ({
      commission: row.totalCommission,
      spread: row.totalSpread,
      swap: row.totalSwap,
      total: earningsTotal(row.totalCommission, row.totalSpread, row.totalSwap),
      trades: row.tradeCount,
      volume: row.totalVolume
    })

    res.json({
      success: true,
      earnings: {
        today: pack(today),
        thisWeek: pack(thisWeek),
        thisMonth: pack(thisMonth),
        thisYear: pack(thisYear),
        allTime: pack(allTime)
      }
    })
  } catch (error) {
    console.error('Error fetching earnings summary:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/earnings/daily - Get daily earnings breakdown for a date range
router.get('/daily', verifyAdminToken, async (req, res) => {
  try {
    const { startDate, endDate, days = 30 } = req.query

    let userFilter = {}
    const userIds = await getAdminUserIds(req.admin)
    if (userIds) userFilter.userId = { $in: userIds }

    let start, end
    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      end = new Date()
      start = new Date()
      start.setDate(start.getDate() - parseInt(days))
    }

    const dailyEarnings = await Trade.aggregate([
      {
        $addFields: {
          _tradeDate: { $ifNull: ['$openedAt', '$createdAt'] }
        }
      },
      {
        $match: {
          ...userFilter,
          _tradeDate: { $gte: start, $lte: end },
          status: { $in: ['OPEN', 'CLOSED'] }
        }
      },
      ...REAL_ACCOUNT_STAGES,
      {
        $group: {
          _id: {
            year: { $year: '$_tradeDate' },
            month: { $month: '$_tradeDate' },
            day: { $dayOfMonth: '$_tradeDate' }
          },
          commission: { $sum: '$commission' },
          spread: { $sum: '$_spreadDollars' },
          swap: { $sum: '$swap' },
          trades: { $sum: 1 },
          volume: { $sum: '$quantity' }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
      }
    ])

    const formatted = dailyEarnings.map(day => ({
      date: `${day._id.year}-${String(day._id.month).padStart(2, '0')}-${String(day._id.day).padStart(2, '0')}`,
      commission: day.commission,
      spread: day.spread,
      swap: day.swap,
      total: earningsTotal(day.commission, day.spread, day.swap),
      trades: day.trades,
      volume: day.volume
    }))

    res.json({ success: true, earnings: formatted })
  } catch (error) {
    console.error('Error fetching daily earnings:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/earnings/by-user - Get earnings breakdown by user
router.get('/by-user', verifyAdminToken, async (req, res) => {
  try {
    const { startDate, endDate, days = 30 } = req.query

    let userFilter = {}
    const userIds = await getAdminUserIds(req.admin)
    if (userIds) userFilter.userId = { $in: userIds }

    let start, end
    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      end = new Date()
      start = new Date()
      start.setDate(start.getDate() - parseInt(days))
    }

    const userEarnings = await Trade.aggregate([
      {
        $addFields: {
          _tradeDate: { $ifNull: ['$openedAt', '$createdAt'] }
        }
      },
      {
        $match: {
          ...userFilter,
          _tradeDate: { $gte: start, $lte: end },
          status: { $in: ['OPEN', 'CLOSED'] }
        }
      },
      ...REAL_ACCOUNT_STAGES,
      {
        $group: {
          _id: '$userId',
          commission: { $sum: '$commission' },
          spread: { $sum: '$_spreadDollars' },
          swap: { $sum: '$swap' },
          trades: { $sum: 1 },
          volume: { $sum: '$quantity' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userEmail: '$user.email',
          commission: 1,
          spread: 1,
          swap: 1,
          total: { $add: ['$commission', { $ifNull: ['$spread', 0] }, '$swap'] },
          trades: 1,
          volume: 1
        }
      },
      {
        $sort: { total: -1 }
      }
    ])

    res.json({ success: true, earnings: userEarnings })
  } catch (error) {
    console.error('Error fetching user earnings:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/earnings/by-symbol - Get earnings breakdown by symbol
router.get('/by-symbol', verifyAdminToken, async (req, res) => {
  try {
    const { startDate, endDate, days = 30 } = req.query

    let userFilter = {}
    const userIds = await getAdminUserIds(req.admin)
    if (userIds) userFilter.userId = { $in: userIds }

    let start, end
    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      end = new Date()
      start = new Date()
      start.setDate(start.getDate() - parseInt(days))
    }

    const symbolEarnings = await Trade.aggregate([
      {
        $addFields: {
          _tradeDate: { $ifNull: ['$openedAt', '$createdAt'] }
        }
      },
      {
        $match: {
          ...userFilter,
          _tradeDate: { $gte: start, $lte: end },
          status: { $in: ['OPEN', 'CLOSED'] }
        }
      },
      ...REAL_ACCOUNT_STAGES,
      {
        $group: {
          _id: '$symbol',
          commission: { $sum: '$commission' },
          spread: { $sum: '$_spreadDollars' },
          swap: { $sum: '$swap' },
          trades: { $sum: 1 },
          volume: { $sum: '$quantity' }
        }
      },
      {
        $project: {
          symbol: '$_id',
          commission: 1,
          spread: 1,
          swap: 1,
          total: { $add: ['$commission', { $ifNull: ['$spread', 0] }, '$swap'] },
          trades: 1,
          volume: 1
        }
      },
      {
        $sort: { total: -1 }
      }
    ])

    res.json({ success: true, earnings: symbolEarnings })
  } catch (error) {
    console.error('Error fetching symbol earnings:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
