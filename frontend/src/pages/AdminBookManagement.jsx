import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  Users,
  Search,
  RefreshCw,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Activity,
  Settings,
  Key,
  Link,
  Wifi,
  Eye,
  EyeOff,
  Save,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react'
import priceStreamService from '../services/priceStream'
import { useTheme } from '../context/ThemeContext'

import { API_URL } from '../config/api'

const AdminBookManagement = () => {
  const { isDarkMode } = useTheme()
  const [activeTab, setActiveTab] = useState('book-management')
  const [aBookSubTab, setABookSubTab] = useState('positions')
  const [users, setUsers] = useState([])
  const [positions, setPositions] = useState([])
  const [history, setHistory] = useState([])
  const [positionsSummary, setPositionsSummary] = useState({ totalVolume: 0, totalExposure: 0, count: 0 })
  const [historySummary, setHistorySummary] = useState({ totalPnl: 0, totalVolume: 0, count: 0, winCount: 0, lossCount: 0 })
  const [stats, setStats] = useState({
    aBook: { users: 0, openTrades: 0, volume: 0 },
    bBook: { users: 0, openTrades: 0, volume: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [bookFilter, setBookFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [selectedUsers, setSelectedUsers] = useState([])
  const [livePrices, setLivePrices] = useState({})
  const [positionsPagination, setPositionsPagination] = useState({ total: 0, pages: 1 })
  const [historyPagination, setHistoryPagination] = useState({ total: 0, pages: 1 })
  const [positionsPage, setPositionsPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  
  // LP Connection Settings
  const [showLpSettings, setShowLpSettings] = useState(false)
  const [lpSettings, setLpSettings] = useState({
    lpApiKey: '',
    lpApiSecret: '',
    lpApiUrl: '',
    corecenWsUrl: ''
  })
  const [showSecrets, setShowSecrets] = useState({ key: false, secret: false })
  const [savingLpSettings, setSavingLpSettings] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [connectionMessage, setConnectionMessage] = useState('')
  const [lpConnected, setLpConnected] = useState(false)
  const [checkingLpStatus, setCheckingLpStatus] = useState(true)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  useEffect(() => {
    fetchStats()
    fetchLpSettings()
    checkLpConnectionStatus()
    if (activeTab === 'book-management') {
      fetchUsers()
    } else if (activeTab === 'a-book') {
      if (aBookSubTab === 'positions') {
        fetchPositions()
      } else {
        fetchHistory()
      }
    }
  }, [activeTab, aBookSubTab, currentPage, bookFilter, searchTerm, positionsPage, historyPage])

  // Check LP connection status
  const checkLpConnectionStatus = async () => {
    setCheckingLpStatus(true)
    try {
      const res = await fetch(`${API_URL}/book-management/lp-status`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      setLpConnected(data.connected === true)
    } catch (error) {
      console.error('Error checking LP status:', error)
      setLpConnected(false)
    }
    setCheckingLpStatus(false)
  }

  // Fetch LP settings
  const fetchLpSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/book-management/lp-settings`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (data.success && data.fullSettings) {
        setLpSettings({
          lpApiKey: data.fullSettings.lpApiKey || '',
          lpApiSecret: data.fullSettings.lpApiSecret || '',
          lpApiUrl: data.fullSettings.lpApiUrl || '',
          corecenWsUrl: data.fullSettings.corecenWsUrl || ''
        })
      }
    } catch (error) {
      console.error('Error fetching LP settings:', error)
    }
  }

  // Save LP settings
  const saveLpSettings = async () => {
    setSavingLpSettings(true)
    setConnectionStatus(null)
    try {
      const res = await fetch(`${API_URL}/book-management/lp-settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(lpSettings)
      })
      const data = await res.json()
      if (data.success) {
        setConnectionStatus('success')
        setConnectionMessage('LP settings saved successfully!')
        setTimeout(() => setConnectionStatus(null), 3000)
      } else {
        setConnectionStatus('error')
        setConnectionMessage(data.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving LP settings:', error)
      setConnectionStatus('error')
      setConnectionMessage('Error saving settings')
    }
    setSavingLpSettings(false)
  }

  // Test LP connection
  const testLpConnection = async () => {
    setTestingConnection(true)
    setConnectionStatus(null)
    try {
      const res = await fetch(`${API_URL}/book-management/test-lp-connection`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(lpSettings)
      })
      const data = await res.json()
      if (data.success) {
        setConnectionStatus('success')
        setConnectionMessage(data.message || 'Connection successful!')
        setLpConnected(true)
      } else {
        setConnectionStatus('error')
        setConnectionMessage(data.message || 'Connection failed')
        setLpConnected(false)
      }
    } catch (error) {
      console.error('Error testing LP connection:', error)
      setConnectionStatus('error')
      setConnectionMessage('Error testing connection')
      setLpConnected(false)
    }
    setTestingConnection(false)
  }

  useEffect(() => {
    const unsubscribe = priceStreamService.subscribe('adminBookManagement', (prices) => {
      if (prices && Object.keys(prices).length > 0) {
        setLivePrices(prev => ({ ...prev, ...prices }))
      }
    })
    return () => unsubscribe()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/book-management/stats`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...(searchTerm && { search: searchTerm }),
        ...(bookFilter && { bookType: bookFilter })
      })
      
      const res = await fetch(`${API_URL}/book-management/users?${params}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setUsers(data.users)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
    setLoading(false)
  }

  const fetchPositions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: positionsPage,
        limit: 100
      })
      
      const res = await fetch(`${API_URL}/book-management/a-book/positions?${params}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setPositions(data.positions)
        setPositionsSummary(data.summary)
        setPositionsPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching positions:', error)
    }
    setLoading(false)
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: historyPage,
        limit: 100
      })
      
      const res = await fetch(`${API_URL}/book-management/a-book/history?${params}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setHistory(data.history)
        setHistorySummary(data.summary)
        setHistoryPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    }
    setLoading(false)
  }

  const toggleUserBookType = async (userId, currentBookType) => {
    const newBookType = currentBookType === 'A' ? 'B' : 'A'
    
    // Optimistic UI update - instantly update the UI
    setUsers(prev => prev.map(user => 
      user._id === userId ? { ...user, bookType: newBookType } : user
    ))
    
    try {
      const res = await fetch(`${API_URL}/book-management/users/${userId}/book-type`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ bookType: newBookType })
      })
      const data = await res.json()
      if (data.success) {
        // Refresh stats in background
        fetchStats()
      } else {
        // Revert on failure
        setUsers(prev => prev.map(user => 
          user._id === userId ? { ...user, bookType: currentBookType } : user
        ))
      }
    } catch (error) {
      console.error('Error toggling book type:', error)
      // Revert on error
      setUsers(prev => prev.map(user => 
        user._id === userId ? { ...user, bookType: currentBookType } : user
      ))
    }
  }

  const bulkUpdateBookType = async (bookType) => {
    if (selectedUsers.length === 0) return
    
    // Store previous state for potential rollback
    const previousUsers = [...users]
    const updatedUserIds = [...selectedUsers]
    
    // Optimistic UI update
    setUsers(prev => prev.map(user => 
      updatedUserIds.includes(user._id) ? { ...user, bookType } : user
    ))
    setSelectedUsers([])
    
    try {
      const res = await fetch(`${API_URL}/book-management/users/bulk-book-type`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userIds: updatedUserIds, bookType })
      })
      const data = await res.json()
      if (data.success) {
        fetchStats()
      } else {
        // Revert on failure
        setUsers(previousUsers)
        setSelectedUsers(updatedUserIds)
      }
    } catch (error) {
      console.error('Error bulk updating book type:', error)
      // Revert on error
      setUsers(previousUsers)
      setSelectedUsers(updatedUserIds)
    }
  }

  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(u => u._id))
    }
  }

  const calculatePnl = (trade) => {
    const prices = livePrices[trade.symbol]
    if (!prices || trade.status !== 'OPEN') return trade.realizedPnl || 0
    
    const currentPrice = trade.side === 'BUY' ? prices.bid : prices.ask
    const pnl = trade.side === 'BUY'
      ? (currentPrice - trade.openPrice) * trade.quantity * trade.contractSize
      : (trade.openPrice - currentPrice) * trade.quantity * trade.contractSize
    return pnl - (trade.commission || 0) - (trade.swap || 0)
  }

  const renderBookManagement = () => (
    <div className="space-y-6">
      {/* LP Connection Status Banner */}
      <div className={`p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        checkingLpStatus 
          ? 'bg-yellow-500/10 border border-yellow-500/30' 
          : lpConnected 
            ? 'bg-green-500/10 border border-green-500/30' 
            : 'bg-red-500/10 border border-red-500/30'
      }`}>
        <div className="flex items-center gap-3">
          {checkingLpStatus ? (
            <RefreshCw size={20} className="text-yellow-500 animate-spin" />
          ) : lpConnected ? (
            <CheckCircle size={20} className="text-green-500" />
          ) : (
            <XCircle size={20} className="text-red-500" />
          )}
          <div>
            <p className={`font-medium ${checkingLpStatus ? 'text-yellow-400' : lpConnected ? 'text-green-400' : 'text-red-400'}`}>
              {checkingLpStatus ? 'Checking LP Connection...' : lpConnected ? 'LP Connected' : 'LP Not Connected'}
            </p>
            <p className="text-gray-500 text-sm">
              {checkingLpStatus 
                ? 'Verifying connection to Liquidity Provider' 
                : lpConnected 
                  ? 'A-Book trades will be routed to LP automatically' 
                  : 'Configure LP settings below to enable A-Book routing'}
            </p>
          </div>
        </div>
        <button
          onClick={checkLpConnectionStatus}
          disabled={checkingLpStatus}
          className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={checkingLpStatus ? 'animate-spin' : ''} />
          Check Status
        </button>
      </div>

      {/* Warning if LP not connected */}
      {!checkingLpStatus && !lpConnected && (
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center gap-3">
          <Info size={18} className="text-orange-500 flex-shrink-0" />
          <p className="text-orange-400 text-sm">
            <strong>Warning:</strong> Users cannot be moved to A-Book while LP is disconnected. Please configure and test the LP connection first.
          </p>
        </div>
      )}

      {/* LP Settings Toggle Button */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowLpSettings(!showLpSettings)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            lpConnected 
              ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30' 
              : 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30'
          }`}
        >
          <Settings size={16} />
          LP Connection Settings
          {showLpSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* LP Connection Settings Panel */}
      {showLpSettings && (
        <div className="bg-dark-800 rounded-xl p-6 border border-purple-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Wifi size={20} className="text-purple-500" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Liquidity Provider Connection</h3>
              <p className="text-gray-500 text-sm">Configure connection to Corecen LP for A-Book trade routing</p>
            </div>
          </div>

          {/* Connection Status Message */}
          {connectionStatus && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              connectionStatus === 'success' 
                ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
                : 'bg-red-500/20 border border-red-500/30 text-red-400'
            }`}>
              {connectionStatus === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
              <span>{connectionMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* LP API URL */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                <Link size={14} className="inline mr-2" />
                LP API URL
              </label>
              <input
                type="text"
                value={lpSettings.lpApiUrl}
                onChange={(e) => setLpSettings({ ...lpSettings, lpApiUrl: e.target.value })}
                placeholder="http://localhost:3001"
                className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* WebSocket URL */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                <Wifi size={14} className="inline mr-2" />
                WebSocket URL
              </label>
              <input
                type="text"
                value={lpSettings.corecenWsUrl}
                onChange={(e) => setLpSettings({ ...lpSettings, corecenWsUrl: e.target.value })}
                placeholder="http://localhost:3001"
                className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* LP API Key */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                <Key size={14} className="inline mr-2" />
                LP API Key
              </label>
              <div className="relative">
                <input
                  type={showSecrets.key ? 'text' : 'password'}
                  value={lpSettings.lpApiKey}
                  onChange={(e) => setLpSettings({ ...lpSettings, lpApiKey: e.target.value })}
                  placeholder="lpk_xxxxxxxxxxxxxxxx"
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets({ ...showSecrets, key: !showSecrets.key })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showSecrets.key ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* LP API Secret */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                <Key size={14} className="inline mr-2" />
                LP API Secret
              </label>
              <div className="relative">
                <input
                  type={showSecrets.secret ? 'text' : 'password'}
                  value={lpSettings.lpApiSecret}
                  onChange={(e) => setLpSettings({ ...lpSettings, lpApiSecret: e.target.value })}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets({ ...showSecrets, secret: !showSecrets.secret })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showSecrets.secret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={testLpConnection}
              disabled={testingConnection || !lpSettings.lpApiUrl}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingConnection ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Wifi size={16} />
              )}
              Test Connection
            </button>
            <button
              onClick={saveLpSettings}
              disabled={savingLpSettings}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingLpSettings ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Settings
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-dark-700 rounded-lg">
            <p className="text-gray-500 text-xs">
              <strong className="text-gray-400">Note:</strong> These settings configure the connection to your Corecen Liquidity Provider. 
              A-Book trades will be automatically routed to the LP using these credentials. 
              Make sure to test the connection before saving.
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-yellow-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-yellow-500 font-semibold mb-2">A Book vs B Book</h3>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• <strong className="text-white">A Book:</strong> Trades go to liquidity provider. Admin cannot modify trades. Only charges are deducted.</li>
              <li>• <strong className="text-white">B Book:</strong> Trades are managed internally. Admin has full control over trades, P&L, and modifications.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-xl p-4 border ${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>A-Book Users</p>
              <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.aBook?.users || 0}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-xl p-4 border ${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>B-Book Users</p>
              <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.bBook?.users || 0}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-xl p-4 border ${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>A-Book Open Trades</p>
              <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.aBook?.openTrades || 0}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-xl p-4 border ${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>B-Book Open Trades</p>
              <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.bBook?.openTrades || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            className={`w-full pl-10 pr-4 py-2 border rounded-lg placeholder-gray-500 focus:outline-none focus:border-accent-green ${isDarkMode ? 'bg-dark-700 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
          />
        </div>
        <select
          value={bookFilter}
          onChange={(e) => { setBookFilter(e.target.value); setCurrentPage(1) }}
          className={`px-4 py-2 border rounded-lg focus:outline-none focus:border-accent-green ${isDarkMode ? 'bg-dark-700 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
        >
          <option value="">All Books</option>
          <option value="A">A-Book Only</option>
          <option value="B">B-Book Only</option>
        </select>
        <button
          onClick={() => { fetchUsers(); fetchStats() }}
          className={`p-2 border rounded-lg transition-colors ${isDarkMode ? 'bg-dark-700 border-gray-700 text-gray-400 hover:text-white hover:border-accent-green' : 'bg-gray-100 border-gray-300 text-gray-600 hover:text-gray-900 hover:border-accent-green'}`}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 p-3 bg-dark-700 rounded-lg border border-gray-700">
          <span className="text-gray-400">{selectedUsers.length} users selected</span>
          <button
            onClick={() => bulkUpdateBookType('A')}
            disabled={!lpConnected}
            title={!lpConnected ? 'LP must be connected to move users to A-Book' : ''}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !lpConnected 
                ? 'bg-gray-500/20 text-gray-500 border border-gray-500/30 cursor-not-allowed' 
                : 'bg-green-500/20 hover:bg-green-500/30 text-green-500 border border-green-500/30'
            }`}
          >
            Move to A-Book
          </button>
          <button
            onClick={() => bulkUpdateBookType('B')}
            className="px-4 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 border border-blue-500/30 rounded-lg text-sm font-medium transition-colors"
          >
            Move to B-Book
          </button>
          <button
            onClick={() => setSelectedUsers([])}
            className="px-4 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={selectAllUsers}
                    className="w-4 h-4 rounded border-gray-600 bg-dark-600 text-accent-green focus:ring-accent-green"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Accounts</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Total Trades</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Open Trades</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Book Type</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-dark-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => toggleSelectUser(user._id)}
                        className="w-4 h-4 rounded border-gray-600 bg-dark-600 text-accent-green focus:ring-accent-green"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-green to-blue-500 flex items-center justify-center text-white font-medium text-sm">
                          {user.firstName?.charAt(0) || 'U'}
                        </div>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.firstName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{user.email}</td>
                    <td className={`px-4 py-3 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.accountCount || 0}</td>
                    <td className={`px-4 py-3 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.totalTrades || 0}</td>
                    <td className={`px-4 py-3 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.openTrades || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.bookType === 'A' 
                          ? 'bg-red-500/20 text-blue-400' 
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {user.bookType || 'B'}-Book
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleUserBookType(user._id, user.bookType || 'B')}
                        disabled={user.bookType !== 'A' && !lpConnected}
                        title={user.bookType !== 'A' && !lpConnected ? 'LP must be connected to move users to A-Book' : `Switch to ${user.bookType === 'A' ? 'B' : 'A'}-Book`}
                        className={`p-2 rounded-lg transition-colors ${
                          user.bookType === 'A'
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : !lpConnected
                              ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                        }`}
                      >
                        {user.bookType === 'A' ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className={`flex items-center justify-between px-4 py-3 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <span className="text-sm text-gray-400">
              Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, pagination.total)} of {pagination.total} users
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-dark-700 border-gray-700 text-gray-400 hover:text-white' : 'bg-gray-100 border-gray-300 text-gray-600 hover:text-gray-900'}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>Page {currentPage} of {pagination.pages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                disabled={currentPage === pagination.pages}
                className={`p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-dark-700 border-gray-700 text-gray-400 hover:text-white' : 'bg-gray-100 border-gray-300 text-gray-600 hover:text-gray-900'}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderABook = () => (
    <div className="space-y-6">
      {/* Sub-tabs for Positions and History */}
      <div className="flex gap-4 border-b border-gray-800">
        <button
          onClick={() => setABookSubTab('positions')}
          className={`pb-3 px-1 font-medium transition-colors relative ${
            aBookSubTab === 'positions' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          Positions ({positionsSummary.count || 0})
          {aBookSubTab === 'positions' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />}
        </button>
        <button
          onClick={() => setABookSubTab('history')}
          className={`pb-3 px-1 font-medium transition-colors relative ${
            aBookSubTab === 'history' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          History ({historySummary.count || 0})
          {aBookSubTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />}
        </button>
      </div>

      {aBookSubTab === 'positions' ? renderPositions() : renderHistory()}
    </div>
  )

  const renderPositions = () => (
    <div className="space-y-4">
      {/* Positions Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Open Positions</p>
              <p className="text-xl font-bold text-white">{positionsSummary.count || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Volume</p>
              <p className="text-xl font-bold text-white">{(positionsSummary.totalVolume || 0).toFixed(2)} lots</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Exposure</p>
              <p className="text-xl font-bold text-white">${(positionsSummary.totalExposure || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">A-Book Users</p>
              <p className="text-xl font-bold text-white">{stats.aBook?.users || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={fetchPositions}
          className="flex items-center gap-2 px-4 py-2 bg-dark-700 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-accent-green transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Positions Table */}
      <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-700">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase">ID</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase">Symbol</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase">Side</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase">Volume</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase">Open</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase">Current</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase">PnL</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase">SL/TP</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading positions...
                  </td>
                </tr>
              ) : positions.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-gray-400">
                    No open A-Book positions
                  </td>
                </tr>
              ) : (
                positions.map((pos) => {
                  const pnl = calculatePnl(pos)
                  const currentPrice = livePrices[pos.symbol]
                    ? (pos.side === 'BUY' ? livePrices[pos.symbol].bid : livePrices[pos.symbol].ask)
                    : pos.openPrice
                  
                  return (
                    <tr key={pos._id} className="hover:bg-dark-700/50 transition-colors">
                      <td className="px-3 py-2 text-white font-mono text-xs">{pos.tradeId}</td>
                      <td className="px-3 py-2">
                        <p className="text-white text-sm">{pos.userId?.firstName || 'Unknown'}</p>
                        <p className="text-gray-500 text-xs">{pos.userId?.email}</p>
                      </td>
                      <td className="px-3 py-2 text-white font-medium">{pos.symbol}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          pos.side === 'BUY' ? 'bg-red-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {pos.side}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-white">{pos.quantity}</td>
                      <td className="px-3 py-2 text-right text-white">{pos.openPrice?.toFixed(5)}</td>
                      <td className="px-3 py-2 text-right text-white">{currentPrice?.toFixed(5)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${pnl >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        <span className="text-red-400">{pos.stopLoss || '-'}</span>
                        <span className="text-gray-500"> / </span>
                        <span className="text-green-400">{pos.takeProfit || '-'}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs">
                        {new Date(pos.openedAt).toLocaleString()}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {positionsPagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-sm text-gray-400">
              Page {positionsPage} of {positionsPagination.pages} ({positionsPagination.total} positions)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPositionsPage(p => Math.max(1, p - 1))}
                disabled={positionsPage === 1}
                className="p-2 bg-dark-700 border border-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPositionsPage(p => Math.min(positionsPagination.pages, p + 1))}
                disabled={positionsPage === positionsPagination.pages}
                className="p-2 bg-dark-700 border border-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderHistory = () => (
    <div className="space-y-4">
      {/* History Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Trades</p>
              <p className="text-xl font-bold text-white">{historySummary.count || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${(historySummary.totalPnl || 0) >= 0 ? 'bg-red-500/20' : 'bg-red-500/20'}`}>
              <DollarSign className={`w-5 h-5 ${(historySummary.totalPnl || 0) >= 0 ? 'text-blue-400' : 'text-red-400'}`} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total PnL</p>
              <p className={`text-xl font-bold ${(historySummary.totalPnl || 0) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {(historySummary.totalPnl || 0) >= 0 ? '+' : ''}${(historySummary.totalPnl || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Volume</p>
              <p className="text-xl font-bold text-white">{(historySummary.totalVolume || 0).toFixed(2)} lots</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Wins</p>
              <p className="text-xl font-bold text-green-400">{historySummary.winCount || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Losses</p>
              <p className="text-xl font-bold text-red-400">{historySummary.lossCount || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={fetchHistory}
          className="flex items-center gap-2 px-4 py-2 bg-dark-700 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-accent-green transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* History Table */}
      <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-700">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase">ID</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase">Symbol</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase">Side</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase">Volume</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase">Open</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase">Close</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase">PnL</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase">Closed By</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase">Closed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading history...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-gray-400">
                    No A-Book trade history
                  </td>
                </tr>
              ) : (
                history.map((trade) => (
                  <tr key={trade._id} className="hover:bg-dark-700/50 transition-colors">
                    <td className="px-3 py-2 text-white font-mono text-xs">{trade.tradeId}</td>
                    <td className="px-3 py-2">
                      <p className="text-white text-sm">{trade.userId?.firstName || 'Unknown'}</p>
                      <p className="text-gray-500 text-xs">{trade.userId?.email}</p>
                    </td>
                    <td className="px-3 py-2 text-white font-medium">{trade.symbol}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        trade.side === 'BUY' ? 'bg-red-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-white">{trade.quantity}</td>
                    <td className="px-3 py-2 text-right text-white">{trade.openPrice?.toFixed(5)}</td>
                    <td className="px-3 py-2 text-right text-white">{trade.closePrice?.toFixed(5)}</td>
                    <td className={`px-3 py-2 text-right font-medium ${(trade.realizedPnl || 0) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {(trade.realizedPnl || 0) >= 0 ? '+' : ''}${(trade.realizedPnl || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        trade.closedBy === 'SL' ? 'bg-red-500/20 text-red-400' :
                        trade.closedBy === 'TP' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {trade.closedBy || 'USER'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs">
                      {new Date(trade.closedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {historyPagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-sm text-gray-400">
              Page {historyPage} of {historyPagination.pages} ({historyPagination.total} trades)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="p-2 bg-dark-700 border border-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setHistoryPage(p => Math.min(historyPagination.pages, p + 1))}
                disabled={historyPage === historyPagination.pages}
                className="p-2 bg-dark-700 border border-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-accent-green" />
            Book Management
          </h1>
          <p className="text-gray-400 mt-1">Manage A-Book and B-Book user assignments and view trades</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('book-management')}
            className={`pb-3 px-1 font-medium transition-colors relative ${
              activeTab === 'book-management'
                ? 'text-accent-green'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Book Management
            {activeTab === 'book-management' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-green" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('a-book')}
            className={`pb-3 px-1 font-medium transition-colors relative ${
              activeTab === 'a-book'
                ? 'text-accent-green'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            A-Book Trades
            {activeTab === 'a-book' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-green" />
            )}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'book-management' ? renderBookManagement() : renderABook()}
      </div>
    </AdminLayout>
  )
}

export default AdminBookManagement
