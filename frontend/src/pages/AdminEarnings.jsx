import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import {
  DollarSign,
  TrendingUp,
  Calendar,
  BarChart3,
  RefreshCw,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { API_URL } from '../config/api'

const PAGE_SIZE = 10

const AdminEarnings = () => {
  const [summary, setSummary] = useState(null)
  const [dailyEarnings, setDailyEarnings] = useState([])
  const [userEarnings, setUserEarnings] = useState([])
  const [symbolEarnings, setSymbolEarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('daily')
  const [dateRange, setDateRange] = useState('30')
  const [dailyPage, setDailyPage] = useState(1)
  const [userPage, setUserPage] = useState(1)
  const [symbolPage, setSymbolPage] = useState(1)

  useEffect(() => {
    fetchAllData()
  }, [dateRange])

  useEffect(() => {
    setDailyPage(1)
    setUserPage(1)
    setSymbolPage(1)
  }, [dateRange])

  useEffect(() => {
    const clamp = (len, setPage) => {
      const tp = len === 0 ? 1 : Math.max(1, Math.ceil(len / PAGE_SIZE))
      setPage((p) => Math.min(p, tp))
    }
    clamp(dailyEarnings.length, setDailyPage)
    clamp(userEarnings.length, setUserPage)
    clamp(symbolEarnings.length, setSymbolPage)
  }, [dailyEarnings, userEarnings, symbolEarnings])

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([
      fetchSummary(),
      fetchDailyEarnings(),
      fetchUserEarnings(),
      fetchSymbolEarnings()
    ])
    setLoading(false)
  }

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/earnings/summary`)
      const data = await res.json()
      if (data.success) {
        setSummary(data.earnings)
      }
    } catch (error) {
      console.error('Error fetching summary:', error)
    }
  }

  const fetchDailyEarnings = async () => {
    try {
      const res = await fetch(`${API_URL}/earnings/daily?days=${dateRange}`)
      const data = await res.json()
      if (data.success) {
        setDailyEarnings(data.earnings || [])
      }
    } catch (error) {
      console.error('Error fetching daily earnings:', error)
    }
  }

  const fetchUserEarnings = async () => {
    try {
      const res = await fetch(`${API_URL}/earnings/by-user?days=${dateRange}`)
      const data = await res.json()
      if (data.success) {
        setUserEarnings(data.earnings || [])
      }
    } catch (error) {
      console.error('Error fetching user earnings:', error)
    }
  }

  const fetchSymbolEarnings = async () => {
    try {
      const res = await fetch(`${API_URL}/earnings/by-symbol?days=${dateRange}`)
      const data = await res.json()
      if (data.success) {
        setSymbolEarnings(data.earnings || [])
      }
    } catch (error) {
      console.error('Error fetching symbol earnings:', error)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value || 0)
  }

  const Row = ({ label, value, highlightClass }) => (
    <div className="flex justify-between gap-2">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={`font-mono text-right text-sm ${highlightClass || 'text-white'}`}>{value}</span>
    </div>
  )

  const getPageSlice = (items, page) => {
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1)
    const safePage = Math.min(Math.max(1, page), totalPages)
    const start = (safePage - 1) * PAGE_SIZE
    return {
      rows: items.slice(start, start + PAGE_SIZE),
      totalPages,
      safePage,
      from: total === 0 ? 0 : start + 1,
      to: Math.min(start + PAGE_SIZE, total)
    }
  }

  const PaginationFooter = ({ page, setPage, totalItems }) => {
    const tp =
      totalItems === 0 ? 1 : Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
    const sp = Math.min(Math.max(1, page), tp)
    const start = (sp - 1) * PAGE_SIZE
    const fromN = totalItems === 0 ? 0 : start + 1
    const toN = Math.min(start + PAGE_SIZE, totalItems)

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-800 bg-dark-700/50">
        <p className="text-gray-500 text-xs sm:text-sm">
          {totalItems === 0
            ? 'No data'
            : `Showing ${fromN}–${toN} of ${totalItems}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={sp <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 rounded-lg bg-dark-800 border border-gray-700 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-dark-700"
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-gray-400 text-sm tabular-nums min-w-[7rem] text-center">
            Page {sp} of {tp}
          </span>
          <button
            type="button"
            disabled={sp >= tp}
            onClick={() => setPage((p) => Math.min(tp, p + 1))}
            className="p-2 rounded-lg bg-dark-800 border border-gray-700 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-dark-700"
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
    <div className="bg-dark-800 rounded-xl border border-gray-800 p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className={`text-xl sm:text-2xl font-bold mt-1 ${color || 'text-white'}`}>
            {formatCurrency(value)}
          </p>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color?.includes('green') ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
          <Icon size={20} className={color?.includes('green') ? 'text-green-500' : 'text-blue-500'} />
        </div>
      </div>
    </div>
  )

  return (
    <AdminLayout
      title="Earnings Report"
      subtitle="Live & prop accounts only — demo trading accounts are excluded. Commission, spread, and swap."
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-dark-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
          <button 
            onClick={fetchAllData}
            className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-gray-400"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw size={24} className="animate-spin text-gray-500" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              title="Today (total)"
              value={summary?.today?.total}
              subtitle={`${summary?.today?.trades || 0} trades · comm+spread+swap`}
              icon={DollarSign}
              color="text-green-500"
            />
            <StatCard
              title="This Week"
              value={summary?.thisWeek?.total}
              subtitle={`${summary?.thisWeek?.trades || 0} trades`}
              icon={Calendar}
              color="text-blue-500"
            />
            <StatCard
              title="This Month"
              value={summary?.thisMonth?.total}
              subtitle={`${summary?.thisMonth?.trades || 0} trades`}
              icon={TrendingUp}
              color="text-purple-500"
            />
            <StatCard
              title="This Year"
              value={summary?.thisYear?.total}
              subtitle={`${summary?.thisYear?.trades || 0} trades`}
              icon={BarChart3}
              color="text-orange-500"
            />
            <StatCard
              title="All Time"
              value={summary?.allTime?.total}
              subtitle={`${summary?.allTime?.trades || 0} trades`}
              icon={DollarSign}
              color="text-green-500"
            />
          </div>

          {/* Breakdown: commission, spread, swap, volume — same periods */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <div className="bg-dark-800 rounded-xl border border-gray-800 p-5">
              <h3 className="text-white font-semibold mb-4">Commission Earnings</h3>
              <div className="space-y-2">
                <Row label="Today" value={formatCurrency(summary?.today?.commission)} />
                <Row label="This week" value={formatCurrency(summary?.thisWeek?.commission)} />
                <Row label="This month" value={formatCurrency(summary?.thisMonth?.commission)} />
                <Row label="This year" value={formatCurrency(summary?.thisYear?.commission)} />
                <Row label="All time" value={formatCurrency(summary?.allTime?.commission)} highlightClass="font-bold text-green-500" />
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl border border-gray-800 p-5 ring-1 ring-amber-500/20">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Activity size={18} className="text-amber-500 shrink-0" />
                Spread Earnings
              </h3>
              <div className="space-y-2">
                <Row label="Today" value={formatCurrency(summary?.today?.spread)} />
                <Row label="This week" value={formatCurrency(summary?.thisWeek?.spread)} />
                <Row label="This month" value={formatCurrency(summary?.thisMonth?.spread)} />
                <Row label="This year" value={formatCurrency(summary?.thisYear?.spread)} />
                <Row label="All time" value={formatCurrency(summary?.allTime?.spread)} highlightClass="font-bold text-amber-500" />
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl border border-gray-800 p-5">
              <h3 className="text-white font-semibold mb-4">Swap Earnings</h3>
              <div className="space-y-2">
                <Row label="Today" value={formatCurrency(summary?.today?.swap)} />
                <Row label="This week" value={formatCurrency(summary?.thisWeek?.swap)} />
                <Row label="This month" value={formatCurrency(summary?.thisMonth?.swap)} />
                <Row label="This year" value={formatCurrency(summary?.thisYear?.swap)} />
                <Row label="All time" value={formatCurrency(summary?.allTime?.swap)} highlightClass="font-bold text-blue-500" />
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl border border-gray-800 p-5">
              <h3 className="text-white font-semibold mb-4">Trading Volume (Lots)</h3>
              <div className="space-y-2">
                <Row label="Today" value={(summary?.today?.volume || 0).toFixed(2)} />
                <Row label="This week" value={(summary?.thisWeek?.volume || 0).toFixed(2)} />
                <Row label="This month" value={(summary?.thisMonth?.volume || 0).toFixed(2)} />
                <Row label="This year" value={(summary?.thisYear?.volume || 0).toFixed(2)} />
                <Row label="All time" value={(summary?.allTime?.volume || 0).toFixed(2)} highlightClass="font-bold text-purple-500" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-800 pb-2">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'daily' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Daily Breakdown
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'users' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              By User
            </button>
            <button
              onClick={() => setActiveTab('symbols')}
              className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'symbols' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              By Symbol
            </button>
          </div>

          {/* Daily Breakdown Table */}
          {activeTab === 'daily' && (
            <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Date</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Commission</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Spread</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Swap</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Total</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Trades</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyEarnings.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center text-gray-500 py-8">No data for selected period</td>
                      </tr>
                    ) : (
                      getPageSlice(dailyEarnings, dailyPage).rows.map((day, idx) => (
                        <tr key={day.date || idx} className="border-t border-gray-800 hover:bg-dark-700">
                          <td className="px-4 py-3 text-white text-sm">{day.date}</td>
                          <td className="px-4 py-3 text-right text-white font-mono text-sm">{formatCurrency(day.commission)}</td>
                          <td className="px-4 py-3 text-right text-amber-200/90 font-mono text-sm">{formatCurrency(day.spread)}</td>
                          <td className="px-4 py-3 text-right text-white font-mono text-sm">{formatCurrency(day.swap)}</td>
                          <td className="px-4 py-3 text-right text-green-500 font-mono text-sm font-semibold">{formatCurrency(day.total)}</td>
                          <td className="px-4 py-3 text-right text-gray-400 text-sm">{day.trades}</td>
                          <td className="px-4 py-3 text-right text-gray-400 text-sm">{day.volume?.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationFooter
                page={dailyPage}
                setPage={setDailyPage}
                totalItems={dailyEarnings.length}
              />
            </div>
          )}

          {/* By User Table */}
          {activeTab === 'users' && (
            <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">User</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Commission</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Spread</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Swap</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Total</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Trades</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userEarnings.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center text-gray-500 py-8">No data for selected period</td>
                      </tr>
                    ) : (
                      getPageSlice(userEarnings, userPage).rows.map((user, idx) => (
                        <tr key={user.userId || idx} className="border-t border-gray-800 hover:bg-dark-700">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-white text-sm font-medium">{user.userName || 'Unknown'}</p>
                              <p className="text-gray-500 text-xs">{user.userEmail}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-white font-mono text-sm">{formatCurrency(user.commission)}</td>
                          <td className="px-4 py-3 text-right text-amber-200/90 font-mono text-sm">{formatCurrency(user.spread)}</td>
                          <td className="px-4 py-3 text-right text-white font-mono text-sm">{formatCurrency(user.swap)}</td>
                          <td className="px-4 py-3 text-right text-green-500 font-mono text-sm font-semibold">{formatCurrency(user.total)}</td>
                          <td className="px-4 py-3 text-right text-gray-400 text-sm">{user.trades}</td>
                          <td className="px-4 py-3 text-right text-gray-400 text-sm">{user.volume?.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationFooter
                page={userPage}
                setPage={setUserPage}
                totalItems={userEarnings.length}
              />
            </div>
          )}

          {/* By Symbol Table */}
          {activeTab === 'symbols' && (
            <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Symbol</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Commission</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Spread</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Swap</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Total</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Trades</th>
                      <th className="text-right text-gray-400 text-xs font-medium px-4 py-3">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symbolEarnings.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center text-gray-500 py-8">No data for selected period</td>
                      </tr>
                    ) : (
                      getPageSlice(symbolEarnings, symbolPage).rows.map((sym, idx) => (
                        <tr key={sym.symbol || idx} className="border-t border-gray-800 hover:bg-dark-700">
                          <td className="px-4 py-3 text-white text-sm font-medium">{sym.symbol}</td>
                          <td className="px-4 py-3 text-right text-white font-mono text-sm">{formatCurrency(sym.commission)}</td>
                          <td className="px-4 py-3 text-right text-amber-200/90 font-mono text-sm">{formatCurrency(sym.spread)}</td>
                          <td className="px-4 py-3 text-right text-white font-mono text-sm">{formatCurrency(sym.swap)}</td>
                          <td className="px-4 py-3 text-right text-green-500 font-mono text-sm font-semibold">{formatCurrency(sym.total)}</td>
                          <td className="px-4 py-3 text-right text-gray-400 text-sm">{sym.trades}</td>
                          <td className="px-4 py-3 text-right text-gray-400 text-sm">{sym.volume?.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationFooter
                page={symbolPage}
                setPage={setSymbolPage}
                totalItems={symbolEarnings.length}
              />
            </div>
          )}
        </>
      )}
    </AdminLayout>
  )
}

export default AdminEarnings
