import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  Shield,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Check,
  Users,
  DollarSign,
  LogIn,
  X,
  AlertCircle,
  Lock,
  BarChart3,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet
} from 'lucide-react'
import { API_URL } from '../config/api'
import { getAdminHeaders } from '../utils/adminApi'

const SuperAdminManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summaryData, setSummaryData] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [totalCommission, setTotalCommission] = useState(0)
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [copiedCode, setCopiedCode] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    commissionRate: 0,
    customDomain: '',
    sidebarPermissions: {
      overviewDashboard: true,
      userManagement: true,
      tradeManagement: true,
      bookManagement: true,
      fundManagement: true,
      bankSettings: true,
      ibManagement: true,
      forexCharges: true,
      earningsReport: true,
      copyTrade: true,
      propFirmChallenges: true,
      accountTypes: true,
      themeSettings: true,
      emailTemplates: true,
      bonusManagement: true,
      bannerManagement: true,
      employeeManagement: true,
      kycVerification: true,
      supportTickets: true
    }
  })

  useEffect(() => {
    fetchAdmins()
    fetchSuperAdminStats()
  }, [])

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/admins`, { headers: getAdminHeaders() })
      const data = await res.json()
      if (data.success) {
        setAdmins(data.admins || [])
      }
    } catch (error) {
      console.error('Error fetching admins:', error)
    }
    setLoading(false)
  }

  const fetchSuperAdminStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/super-admin-stats`, { headers: getAdminHeaders() })
      const data = await res.json()
      if (data.success) {
        setTotalCommission(data.totalCommission || 0)
      }
    } catch (error) {
      console.error('Error fetching super admin stats:', error)
    }
  }

  const handleCreateAdmin = async () => {
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/admins`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(newAdmin)
      })
      const data = await res.json()
      if (data.success) {
        alert('Admin created successfully!')
        setShowAddModal(false)
        setNewAdmin({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          phone: '',
          commissionRate: 0,
          customDomain: '',
          sidebarPermissions: {
            overviewDashboard: true,
            userManagement: true,
            tradeManagement: true,
            bookManagement: true,
            fundManagement: true,
            bankSettings: true,
            ibManagement: true,
            forexCharges: true,
            earningsReport: true,
            copyTrade: true,
            propFirmChallenges: true,
            accountTypes: true,
            themeSettings: true,
            emailTemplates: true,
            bonusManagement: true,
            bannerManagement: true,
            employeeManagement: true,
            kycVerification: true,
            supportTickets: true
          }
        })
        fetchAdmins()
      } else {
        alert(data.message || 'Failed to create admin')
      }
    } catch (error) {
      alert('Error creating admin')
    }
  }

  const handleUpdateAdmin = async () => {
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/admins/${selectedAdmin._id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify(newAdmin)
      })
      const data = await res.json()
      if (data.success) {
        alert('Admin updated successfully!')
        setShowEditModal(false)
        setSelectedAdmin(null)
        fetchAdmins()
      } else {
        alert(data.message || 'Failed to update admin')
      }
    } catch (error) {
      alert('Error updating admin')
    }
  }

  const handleDeleteAdmin = async (admin) => {
    if (!confirm(`Are you sure you want to delete ${admin.firstName} ${admin.lastName}?`)) return
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/admins/${admin._id}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      })
      const data = await res.json()
      if (data.success) {
        alert('Admin deleted successfully!')
        fetchAdmins()
      } else {
        alert(data.message || 'Failed to delete admin')
      }
    } catch (error) {
      alert('Error deleting admin')
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/admins/${selectedAdmin._id}/reset-password`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ newPassword })
      })
      const data = await res.json()
      if (data.success) {
        alert('Password reset successfully!')
        setShowPasswordModal(false)
        setNewPassword('')
        setSelectedAdmin(null)
      } else {
        alert(data.message || 'Failed to reset password')
      }
    } catch (error) {
      alert('Error resetting password')
    }
  }

  const handleImpersonateAdmin = async (adminId) => {
    try {
      // Always use the original Super Admin token for impersonation requests
      const originalToken = localStorage.getItem('originalAdminToken') || localStorage.getItem('adminToken')
      const res = await fetch(`${API_URL}/impersonate/admin/${adminId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${originalToken}`
        }
      })
      const data = await res.json()
      if (data.success) {
        // Save original Super Admin token & data before replacing
        if (!localStorage.getItem('originalAdminToken')) {
          localStorage.setItem('originalAdminToken', localStorage.getItem('adminToken'))
          localStorage.setItem('originalAdminUser', localStorage.getItem('adminUser'))
        }
        localStorage.setItem('adminToken', data.token)
        localStorage.setItem('adminUser', JSON.stringify(data.admin))
        localStorage.setItem('isImpersonating', 'true')
        window.location.href = '/admin/dashboard'
      } else {
        alert(data.message || 'Error impersonating admin')
        console.error('Impersonation error:', data)
      }
    } catch (error) {
      console.error('Impersonation error:', error)
      alert('Error impersonating admin: ' + error.message)
    }
  }

  const fetchAdminSummary = async (admin) => {
    setSummaryLoading(true)
    setSummaryData(null)
    setSelectedAdmin(admin)
    setShowSummaryModal(true)
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/admin-summary/${admin._id}`, { headers: getAdminHeaders() })
      const data = await res.json()
      if (data.success) {
        setSummaryData(data.summary)
      } else {
        alert(data.message || 'Failed to fetch summary')
        setShowSummaryModal(false)
      }
    } catch (error) {
      console.error('Error fetching admin summary:', error)
      alert('Error fetching admin summary')
      setShowSummaryModal(false)
    }
    setSummaryLoading(false)
  }

  const copyProfileLink = (urlSlug) => {
    const link = `${window.location.origin}/${urlSlug}/signup`
    navigator.clipboard.writeText(link)
    setCopiedCode(urlSlug)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const copyAdminLoginLink = (email) => {
    const link = `${window.location.origin}/subadmin/login`
    navigator.clipboard.writeText(link)
    alert(`Admin Login Link copied!\n\nURL: ${link}\nEmail: ${email}`)
  }

  const openEditModal = (admin) => {
    setSelectedAdmin(admin)
    setNewAdmin({
      email: admin.email || '',
      firstName: admin.firstName,
      lastName: admin.lastName,
      phone: admin.phone || '',
      commissionRate: admin.commissionRate || 0,
      customDomain: admin.customDomain || '',
      sidebarPermissions: admin.sidebarPermissions || {
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
        employeeManagement: true,
        kycVerification: false,
        supportTickets: false
      }
    })
    setShowEditModal(true)
  }

  const filteredAdmins = admins.filter(admin => 
    admin.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AdminLayout title="Admin Management" subtitle="Manage sub-admins and their permissions">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Admins</p>
              <p className="text-white text-xl font-bold">{admins.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Check size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Active Admins</p>
              <p className="text-white text-xl font-bold">{admins.filter(a => a.status === 'ACTIVE').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Suspended</p>
              <p className="text-white text-xl font-bold">{admins.filter(a => a.status === 'SUSPENDED').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-yellow-500" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Your Commission</p>
              <p className="text-white text-xl font-bold">${totalCommission.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header with Search and Add Button */}
      <div className="bg-dark-800 rounded-xl p-4 mb-6 border border-gray-800">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-white font-semibold text-lg">Admins</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search admins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
            >
              <Plus size={18} />
              Add Admin
            </button>
          </div>
        </div>
      </div>

      {/* Admins Table/Cards */}
      {loading ? (
        <div className="bg-dark-800 rounded-xl p-12 border border-gray-800 text-center">
          <div className="text-gray-500">Loading admins...</div>
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="bg-dark-800 rounded-xl p-12 border border-gray-800 text-center">
          <Shield size={48} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-500">No admins found</p>
          <p className="text-gray-600 text-sm mt-1">Create your first admin to get started</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-dark-700 border-b border-gray-800">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">ADMIN</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">PROFILE URL</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">LOGIN LINK</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">COMMISSION</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">USERS</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">STATUS</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredAdmins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-dark-700 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-blue-500 font-semibold text-sm">
                            {admin.firstName?.[0]}{admin.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{admin.firstName} {admin.lastName}</p>
                          <p className="text-gray-500 text-xs">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-dark-700 px-2 py-1 rounded text-gray-300">
                          {admin.urlSlug ? `/${admin.urlSlug}/signup` : 'N/A'}
                        </code>
                        {admin.urlSlug && (
                          <button
                            onClick={() => copyProfileLink(admin.urlSlug)}
                            className="text-blue-500 hover:text-blue-400"
                            title="Copy profile link"
                          >
                            {copiedCode === admin.urlSlug ? (
                              <Check size={14} className="text-green-500" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => copyAdminLoginLink(admin.email)}
                        className="text-xs bg-blue-500/20 text-blue-500 px-2 py-1 rounded hover:bg-blue-500/30 flex items-center gap-1"
                        title="Copy admin login link"
                      >
                        <Copy size={12} />
                        /subadmin/login
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-300 text-sm">{admin.commissionRate || 0}%</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-300 text-sm">{admin.userCount || 0}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        admin.status === 'ACTIVE' 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-red-500/20 text-red-500'
                      }`}>
                        {admin.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => fetchAdminSummary(admin)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-emerald-500"
                          title="View Summary"
                        >
                          <BarChart3 size={16} />
                        </button>
                        <button
                          onClick={() => handleImpersonateAdmin(admin._id)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-purple-500"
                          title="Login as admin"
                        >
                          <LogIn size={16} />
                        </button>
                        <button
                          onClick={() => { setSelectedAdmin(admin); setShowPasswordModal(true) }}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-yellow-500"
                          title="Reset password"
                        >
                          <Lock size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(admin)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-blue-500"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteAdmin(admin)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {filteredAdmins.map((admin) => (
              <div key={admin._id} className="bg-dark-800 rounded-xl p-4 border border-gray-800">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-blue-500 font-semibold">
                        {admin.firstName?.[0]}{admin.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{admin.firstName} {admin.lastName}</p>
                      <p className="text-gray-500 text-sm">{admin.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    admin.status === 'ACTIVE' 
                      ? 'bg-green-500/20 text-green-500' 
                      : 'bg-red-500/20 text-red-500'
                  }`}>
                    {admin.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Profile URL</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-dark-700 px-2 py-1 rounded text-gray-300">
                        {admin.urlSlug ? `/${admin.urlSlug}/signup` : 'N/A'}
                      </code>
                      {admin.urlSlug && (
                        <button
                          onClick={() => copyProfileLink(admin.urlSlug)}
                          className="text-blue-500 hover:text-blue-400"
                          title="Copy profile link"
                        >
                          {copiedCode === admin.urlSlug ? (
                            <Check size={10} className="text-green-500" />
                          ) : (
                            <Copy size={10} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Commission</p>
                    <p className="text-white text-sm">{admin.commissionRate || 0}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Users</p>
                    <p className="text-white text-sm">{admin.userCount || 0}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-700">
                  <button
                    onClick={() => fetchAdminSummary(admin)}
                    className="py-2 bg-emerald-500/20 text-emerald-500 rounded-lg text-sm hover:bg-emerald-500/30"
                  >
                    <BarChart3 size={14} className="inline mr-1" />
                    Summary
                  </button>
                  <button
                    onClick={() => handleImpersonateAdmin(admin._id)}
                    className="py-2 bg-purple-500/20 text-purple-500 rounded-lg text-sm hover:bg-purple-500/30"
                  >
                    <LogIn size={14} className="inline mr-1" />
                    Login
                  </button>
                  <button
                    onClick={() => { setSelectedAdmin(admin); setShowPasswordModal(true) }}
                    className="py-2 bg-yellow-500/20 text-yellow-500 rounded-lg text-sm hover:bg-yellow-500/30"
                  >
                    <Lock size={14} className="inline mr-1" />
                    Password
                  </button>
                  <button
                    onClick={() => openEditModal(admin)}
                    className="py-2 bg-blue-500/20 text-blue-500 rounded-lg text-sm hover:bg-blue-500/30"
                  >
                    <Edit size={14} className="inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAdmin(admin)}
                    className="py-2 bg-red-500/20 text-red-500 rounded-lg text-sm hover:bg-red-500/30"
                  >
                    <Trash2 size={14} className="inline mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">Create Admin</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">First Name *</label>
                <input
                  type="text"
                  required
                  value={newAdmin.firstName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Last Name *</label>
                <input
                  type="text"
                  required
                  value={newAdmin.lastName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Password *</label>
                <input
                  type="password"
                  required
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Phone</label>
                <input
                  type="text"
                  value={newAdmin.phone}
                  onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Commission Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={newAdmin.commissionRate}
                  onChange={(e) => setNewAdmin({ ...newAdmin, commissionRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-gray-500 text-xs mt-1">Percentage you take from this admin's profit</p>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Custom Domain (Optional)</label>
                <input
                  type="text"
                  placeholder="broker.example.com"
                  value={newAdmin.customDomain}
                  onChange={(e) => setNewAdmin({ ...newAdmin, customDomain: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="border-t border-gray-700 pt-4 mt-4">
                <label className="block text-gray-400 text-sm mb-3 font-semibold">Section Permissions</label>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {[
                    { key: 'userManagement', label: 'User Management' },
                    { key: 'tradeManagement', label: 'Trade Management' },
                    { key: 'bookManagement', label: 'Book Management' },
                    { key: 'fundManagement', label: 'Fund Management' },
                    { key: 'bankSettings', label: 'Bank Settings' },
                    { key: 'ibManagement', label: 'IB Management' },
                    { key: 'forexCharges', label: 'Forex Charges' },
                    { key: 'earningsReport', label: 'Earnings Report' },
                    { key: 'copyTrade', label: 'Copy Trade' },
                    { key: 'propFirmChallenges', label: 'Prop Firm' },
                    { key: 'accountTypes', label: 'Account Types' },
                    { key: 'themeSettings', label: 'Theme Settings' },
                    { key: 'emailTemplates', label: 'Email Templates' },
                    { key: 'bonusManagement', label: 'Bonus Management' },
                    { key: 'bannerManagement', label: 'Banner Management' },
                    { key: 'employeeManagement', label: 'Employee Management' },
                    { key: 'kycVerification', label: 'KYC Verification' },
                    { key: 'supportTickets', label: 'Support Tickets' }
                  ].map(section => (
                    <label key={section.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAdmin.sidebarPermissions[section.key]}
                        onChange={(e) => setNewAdmin({
                          ...newAdmin,
                          sidebarPermissions: {
                            ...newAdmin.sidebarPermissions,
                            [section.key]: e.target.checked
                          }
                        })}
                        className="w-4 h-4 rounded border-gray-600 bg-dark-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="text-gray-300 text-sm">{section.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-gray-500 text-xs mt-2">Select which sections this admin can access</p>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAdmin}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                Create Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">Reset Password</h3>
              <button onClick={() => { setShowPasswordModal(false); setNewPassword(''); setSelectedAdmin(null) }} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-gray-400 text-sm mb-4">
                Reset password for <span className="text-white font-medium">{selectedAdmin.firstName} {selectedAdmin.lastName}</span>
              </p>
              <div>
                <label className="block text-gray-400 text-sm mb-2">New Password *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => { setShowPasswordModal(false); setNewPassword(''); setSelectedAdmin(null) }}
                className="flex-1 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">Edit Admin</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">First Name</label>
                <input
                  type="text"
                  value={newAdmin.firstName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Last Name</label>
                <input
                  type="text"
                  value={newAdmin.lastName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Phone</label>
                <input
                  type="text"
                  value={newAdmin.phone}
                  onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Commission Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={newAdmin.commissionRate}
                  onChange={(e) => setNewAdmin({ ...newAdmin, commissionRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Custom Domain</label>
                <input
                  type="text"
                  placeholder="broker.example.com"
                  value={newAdmin.customDomain}
                  onChange={(e) => setNewAdmin({ ...newAdmin, customDomain: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="border-t border-gray-700 pt-4 mt-4">
                <label className="block text-gray-400 text-sm mb-3 font-semibold">Section Permissions</label>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {[
                    { key: 'userManagement', label: 'User Management' },
                    { key: 'tradeManagement', label: 'Trade Management' },
                    { key: 'bookManagement', label: 'Book Management' },
                    { key: 'fundManagement', label: 'Fund Management' },
                    { key: 'bankSettings', label: 'Bank Settings' },
                    { key: 'ibManagement', label: 'IB Management' },
                    { key: 'forexCharges', label: 'Forex Charges' },
                    { key: 'earningsReport', label: 'Earnings Report' },
                    { key: 'copyTrade', label: 'Copy Trade' },
                    { key: 'propFirmChallenges', label: 'Prop Firm' },
                    { key: 'accountTypes', label: 'Account Types' },
                    { key: 'themeSettings', label: 'Theme Settings' },
                    { key: 'emailTemplates', label: 'Email Templates' },
                    { key: 'bonusManagement', label: 'Bonus Management' },
                    { key: 'bannerManagement', label: 'Banner Management' },
                    { key: 'employeeManagement', label: 'Employee Management' },
                    { key: 'kycVerification', label: 'KYC Verification' },
                    { key: 'supportTickets', label: 'Support Tickets' }
                  ].map(section => (
                    <label key={section.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAdmin.sidebarPermissions?.[section.key] || false}
                        onChange={(e) => setNewAdmin({
                          ...newAdmin,
                          sidebarPermissions: {
                            ...newAdmin.sidebarPermissions,
                            [section.key]: e.target.checked
                          }
                        })}
                        className="w-4 h-4 rounded border-gray-600 bg-dark-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="text-gray-300 text-sm">{section.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-gray-500 text-xs mt-2">Select which sections this admin can access</p>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAdmin}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                Update Admin
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Admin Summary Modal */}
      {showSummaryModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <div>
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  <BarChart3 size={20} className="text-emerald-500" />
                  Admin Summary
                </h3>
                <p className="text-gray-500 text-sm mt-1">{selectedAdmin.firstName} {selectedAdmin.lastName} ({selectedAdmin.email})</p>
              </div>
              <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {summaryLoading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500 mx-auto mb-3"></div>
                Loading summary...
              </div>
            ) : summaryData ? (
              <div className="p-5 space-y-4">
                {/* Users & Wallet */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-dark-700 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={16} className="text-blue-400" />
                      <span className="text-gray-400 text-sm">Total Users</span>
                    </div>
                    <p className="text-white text-2xl font-bold">{summaryData.users.total}</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet size={16} className="text-purple-400" />
                      <span className="text-gray-400 text-sm">Wallet Balance</span>
                    </div>
                    <p className="text-white text-2xl font-bold">${summaryData.wallet.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign size={16} className="text-yellow-400" />
                      <span className="text-gray-400 text-sm">Commission Rate</span>
                    </div>
                    <p className="text-white text-2xl font-bold">{summaryData.admin.commissionRate}%</p>
                  </div>
                </div>

                {/* Wallet Transactions */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-dark-700 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDownCircle size={16} className="text-blue-400" />
                      <span className="text-gray-400 text-sm">Received from Super Admin</span>
                    </div>
                    <p className="text-blue-400 text-xl font-bold">${(summaryData.wallet.totalReceived || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    <p className="text-gray-500 text-xs mt-1">{summaryData.wallet.receivedCount || 0} transfers</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpCircle size={16} className="text-orange-400" />
                      <span className="text-gray-400 text-sm">Given to Users</span>
                    </div>
                    <p className="text-orange-400 text-xl font-bold">${(summaryData.wallet.totalGivenToUsers || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    <p className="text-gray-500 text-xs mt-1">{summaryData.wallet.givenCount || 0} transfers</p>
                  </div>
                </div>

                {/* Deposits & Withdrawals */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-dark-700 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDownCircle size={16} className="text-green-400" />
                      <span className="text-gray-400 text-sm">Total Deposits</span>
                    </div>
                    <p className="text-green-400 text-2xl font-bold">${summaryData.deposits.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    <p className="text-gray-500 text-xs mt-1">{summaryData.deposits.count} transactions</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpCircle size={16} className="text-red-400" />
                      <span className="text-gray-400 text-sm">Total Withdrawals</span>
                    </div>
                    <p className="text-red-400 text-2xl font-bold">${summaryData.withdrawals.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    <p className="text-gray-500 text-xs mt-1">{summaryData.withdrawals.count} approved, {summaryData.withdrawals.pending} pending</p>
                  </div>
                </div>

                {/* Trade Stats */}
                <div className="bg-dark-700 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={16} className="text-blue-400" />
                    <span className="text-gray-400 text-sm font-medium">Trade Statistics</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-gray-500 text-xs">Total Trades</p>
                      <p className="text-white font-bold">{summaryData.trades.totalTrades}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Closed Trades</p>
                      <p className="text-white font-bold">{summaryData.trades.closedTrades}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Total Volume</p>
                      <p className="text-white font-bold">{summaryData.trades.totalVolume.toFixed(2)} lots</p>
                    </div>
                  </div>
                </div>

                {/* Earnings Breakdown */}
                <div className="bg-dark-700 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign size={16} className="text-emerald-400" />
                    <span className="text-gray-400 text-sm font-medium">Earnings Breakdown</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Commission Profit</span>
                      <span className="text-white font-medium">${summaryData.earnings.commission.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Spread Profit</span>
                      <span className="text-white font-medium">${summaryData.earnings.spread.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Swap Profit</span>
                      <span className="text-white font-medium">${summaryData.earnings.swap.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-600">
                      <span className="text-white text-sm font-medium">Total Earnings</span>
                      <span className="text-emerald-400 font-bold text-lg">${summaryData.earnings.totalEarnings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>

                {/* Super Admin Commission */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={16} className="text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-medium">Your Commission from this Admin</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Rate: <span className="text-white font-medium">{summaryData.superAdminCommission.rate}%</span></span>
                    <span className="text-emerald-400 font-bold text-xl">${summaryData.superAdminCommission.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">Based on {summaryData.superAdminCommission.rate}% of total earnings (${summaryData.earnings.totalEarnings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})</p>
                </div>
              </div>
            ) : null}

            <div className="flex gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default SuperAdminManagement
