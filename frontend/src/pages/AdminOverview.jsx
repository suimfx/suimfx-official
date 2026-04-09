import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import { 
  Users,
  TrendingUp,
  Wallet,
  CreditCard,
  RefreshCw,
  Calendar,
  BookOpen,
  ChevronRight,
  Copy,
  Check,
  LinkIcon,
  UserPlus
} from 'lucide-react'
import { API_URL } from '../config/api'

function getAdminInfo() {
  try {
    const raw = localStorage.getItem('adminUser')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function canAccessBookManagement() {
  try {
    const raw = localStorage.getItem('adminUser')
    if (!raw) return false
    const u = JSON.parse(raw)
    if (u.role === 'SUPER_ADMIN') return true
    if (u.sidebarPermissions?.bookManagement === true) return true
    const p = u.permissions
    if (p && (p.canViewTrades || p.canManageTrades)) return true
    return false
  } catch {
    return false
  }
}

const AdminOverview = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookLoading, setBookLoading] = useState(false)
  const [bookStats, setBookStats] = useState(null)
  const [lpConnected, setLpConnected] = useState(null)
  const [copied, setCopied] = useState(false)
  const [regLink, setRegLink] = useState('')
  const adminInfo = getAdminInfo()
  const isAdmin = adminInfo?.role === 'ADMIN'

  const copyLink = () => {
    if (!regLink) return
    navigator.clipboard.writeText(regLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    newThisWeek: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingKYC: 0,
    pendingWithdrawals: 0,
    activeTrades: 0
  })

  useEffect(() => {
    fetchData()
    if (isAdmin) fetchReferralCode()
  }, [])

  const buildRegOrigin = () => {
    const cd = getAdminInfo()?.customDomain?.trim()
    if (cd) {
      const clean = cd.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
      return `https://${clean}`
    }
    return window.location.origin
  }

  const fetchReferralCode = async () => {
    const origin = buildRegOrigin()
    // First check localStorage
    const stored = getAdminInfo()
    if (stored?.referralCode) {
      setRegLink(`${origin}/register?ref=${stored.referralCode}`)
      return
    }
    // Fallback: fetch from API
    const token = localStorage.getItem('adminToken')
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/my-profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const code = data.admin?.referralCode || data.referralCode
        if (code) {
          setRegLink(`${origin}/register?ref=${code}`)
          // Update localStorage so it's available next time
          const current = getAdminInfo()
          if (current) {
            current.referralCode = code
            localStorage.setItem('adminUser', JSON.stringify(current))
          }
        }
      }
    } catch (e) {
      console.error('Error fetching referral code:', e)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    const token = localStorage.getItem('adminToken')
    
    if (!token) {
      console.warn('No admin token found, redirecting to login')
      window.location.href = '/admin'
      return
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
    
    try {
      // Fetch users
      const usersResponse = await fetch(`${API_URL}/admin/users`, { headers })
      if (usersResponse.ok) {
        const data = await usersResponse.json()
        setUsers(data.users || [])
      }
      
      // Fetch dashboard stats
      const statsResponse = await fetch(`${API_URL}/admin/dashboard-stats`, { headers })
      if (statsResponse.ok) {
        const data = await statsResponse.json()
        if (data.success) {
          setStats({
            totalUsers: data.stats.totalUsers || 0,
            activeToday: data.stats.totalUsers || 0,
            newThisWeek: data.stats.newThisWeek || 0,
            totalDeposits: data.stats.totalDeposits || 0,
            totalWithdrawals: data.stats.totalWithdrawals || 0,
            pendingKYC: data.stats.pendingKYC || 0,
            pendingWithdrawals: data.stats.pendingWithdrawals || 0,
            activeTrades: data.stats.activeTrades || 0
          })
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  const fetchBookLpSummary = async () => {
    if (!canAccessBookManagement()) return
    const token = localStorage.getItem('adminToken')
    if (!token) return
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
    setBookLoading(true)
    try {
      const [st, lp] = await Promise.all([
        fetch(`${API_URL}/book-management/stats`, { headers }),
        fetch(`${API_URL}/book-management/lp-status`, { headers })
      ])
      if (st.ok) {
        const j = await st.json()
        if (j.success && j.stats) setBookStats(j.stats)
      }
      if (lp.ok) {
        const j = await lp.json()
        setLpConnected(j.connected === true)
      }
    } catch (e) {
      console.error('Book/LP overview fetch:', e)
    }
    setBookLoading(false)
  }

  useEffect(() => {
    fetchBookLpSummary()
  }, [])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const statCards = [
    { 
      title: 'Total Users', 
      value: stats.totalUsers, 
      icon: Users, 
      color: isAdmin ? 'blue' : 'blue'
    },
    { 
      title: 'New This Week', 
      value: stats.newThisWeek, 
      icon: TrendingUp, 
      color: isAdmin ? 'blue' : 'green'
    },
    { 
      title: 'Total Deposits', 
      value: `$${stats.totalDeposits.toLocaleString()}`, 
      icon: Wallet, 
      color: isAdmin ? 'blue' : 'purple'
    },
    { 
      title: 'Total Withdrawals', 
      value: `$${stats.totalWithdrawals.toLocaleString()}`, 
      icon: CreditCard, 
      color: isAdmin ? 'blue' : 'orange'
    },
  ]

  return (
    <AdminLayout title="Overview Dashboard" subtitle={isAdmin ? 'Admin Panel' : 'Welcome back, Admin'}>
      {/* Registration Link for Admin */}
      {isAdmin && regLink && (
        <div className="mb-6 bg-dark-800 rounded-xl p-5 border border-blue-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                <UserPlus size={22} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-blue-400 font-semibold text-lg">User Registration Link</h2>
                <p className="text-gray-400 text-sm mt-0.5">Share this link with your users to register under your panel</p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 bg-dark-700 border border-blue-500/20 rounded-lg px-3 py-2 max-w-full">
                    <LinkIcon size={14} className="text-blue-400 shrink-0" />
                    <span className="text-blue-300 text-sm font-mono truncate">{regLink}</span>
                  </div>
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <div key={index} className={`bg-dark-800 rounded-xl p-5 border ${
            isAdmin ? 'border-blue-500/20' : 'border-gray-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 bg-${stat.color}-500/20 rounded-lg flex items-center justify-center`}>
                <stat.icon size={20} className={`text-${stat.color}-500`} />
              </div>
            </div>
            <p className={`text-sm mb-1 ${isAdmin ? 'text-blue-300/60' : 'text-gray-500'}`}>{stat.title}</p>
            <p className={`text-2xl font-bold ${isAdmin ? 'text-blue-100' : 'text-white'}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className={`bg-dark-800 rounded-xl p-5 border ${isAdmin ? 'border-blue-500/20' : 'border-gray-800'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-semibold ${isAdmin ? 'text-blue-300' : 'text-white'}`}>Recent Users</h2>
            <button 
              onClick={() => { fetchData(); fetchBookLpSummary() }}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <RefreshCw size={16} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={20} className="text-gray-500 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No users registered yet</p>
            ) : (
              users.slice(0, 5).map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-green/20 rounded-full flex items-center justify-center">
                      <span className="text-accent-green font-medium">
                        {user.firstName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.firstName || 'Unknown'}</p>
                      <p className="text-gray-500 text-sm">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-gray-500 text-sm">{formatDate(user.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className={`bg-dark-800 rounded-xl p-5 border ${isAdmin ? 'border-blue-500/20' : 'border-gray-800'}`}>
          <h2 className={`font-semibold mb-4 ${isAdmin ? 'text-blue-300' : 'text-white'}`}>Platform Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Users size={18} className="text-blue-500" />
                </div>
                <span className={isAdmin ? 'text-blue-300/60' : 'text-gray-400'}>New Users This Week</span>
              </div>
              <span className={`font-semibold ${isAdmin ? 'text-blue-100' : 'text-white'}`}>{stats.newThisWeek}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isAdmin ? 'bg-blue-500/20' : 'bg-yellow-500/20'}`}>
                  <Calendar size={18} className={isAdmin ? 'text-blue-500' : 'text-yellow-500'} />
                </div>
                <span className={isAdmin ? 'text-blue-300/60' : 'text-gray-400'}>Pending KYC</span>
              </div>
              <span className={`font-semibold ${isAdmin ? 'text-blue-100' : 'text-white'}`}>{stats.pendingKYC}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isAdmin ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                  <TrendingUp size={18} className={isAdmin ? 'text-blue-500' : 'text-green-500'} />
                </div>
                <span className={isAdmin ? 'text-blue-300/60' : 'text-gray-400'}>Active Trades</span>
              </div>
              <span className={`font-semibold ${isAdmin ? 'text-blue-100' : 'text-white'}`}>{stats.activeTrades}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isAdmin ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                  <Wallet size={18} className={isAdmin ? 'text-blue-500' : 'text-purple-500'} />
                </div>
                <span className={isAdmin ? 'text-blue-300/60' : 'text-gray-400'}>Pending Withdrawals</span>
              </div>
              <span className={`font-semibold ${isAdmin ? 'text-blue-100' : 'text-white'}`}>{stats.pendingWithdrawals}</span>
            </div>
          </div>
        </div>
      </div>

      {canAccessBookManagement() && (
        <div className="mt-6 bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-accent-green/15 rounded-lg flex items-center justify-center shrink-0">
                <BookOpen size={22} className="text-accent-green" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">A-Book &amp; Liquidity (Corecen)</h2>
                <p className="text-gray-500 text-sm mt-0.5">
                  LP / A-Book routing is configured under Book Management. Here is a quick snapshot.
                </p>
                {bookLoading ? (
                  <p className="text-gray-500 text-sm mt-2 flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" /> Loading…
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm">
                    <span className="text-gray-400">
                      LP:{' '}
                      <span className={lpConnected ? 'text-green-400 font-medium' : 'text-amber-400 font-medium'}>
                        {lpConnected === null ? '—' : lpConnected ? 'Connected' : 'Not connected'}
                      </span>
                    </span>
                    <span className="text-gray-400">
                      A-Book users:{' '}
                      <span className="text-white font-medium">{bookStats?.aBook?.users ?? '—'}</span>
                    </span>
                    <span className="text-gray-400">
                      B-Book users:{' '}
                      <span className="text-white font-medium">{bookStats?.bBook?.users ?? '—'}</span>
                    </span>
                    <span className="text-gray-400">
                      A-Book open trades:{' '}
                      <span className="text-white font-medium">{bookStats?.aBook?.openTrades ?? '—'}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Link
              to="/admin/book-management"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent-green/20 hover:bg-accent-green/30 text-accent-green border border-accent-green/40 text-sm font-medium transition-colors whitespace-nowrap"
            >
              Open Book Management
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminOverview
