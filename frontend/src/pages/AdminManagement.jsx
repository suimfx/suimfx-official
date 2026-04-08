import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Key,
  Calendar,
  X,
  Check,
  AlertCircle,
  Lock,
  UserCog,
  Briefcase,
  Link,
  Copy
} from 'lucide-react'
import { API_URL } from '../config/api'
import { getAdminHeaders } from '../utils/adminApi'

const ROLE_OPTIONS = ['SUPPORT', 'FINANCE', 'KYC_OFFICER', 'TRADE_MANAGER', 'MANAGER', 'CUSTOM']

const ROLE_COLORS = {
  SUPPORT: 'bg-blue-500/20 text-blue-500',
  FINANCE: 'bg-green-500/20 text-green-500',
  KYC_OFFICER: 'bg-yellow-500/20 text-yellow-500',
  TRADE_MANAGER: 'bg-purple-500/20 text-purple-500',
  MANAGER: 'bg-emerald-500/20 text-emerald-500',
  CUSTOM: 'bg-gray-500/20 text-gray-400'
}

const PERMISSION_GROUPS = [
  { title: 'Dashboard', keys: ['canViewDashboard'] },
  { title: 'Users', keys: ['canViewUsers', 'canManageUsers', 'canCreateUsers', 'canEditUsers', 'canDeleteUsers'] },
  { title: 'Accounts', keys: ['canViewAccounts', 'canManageAccounts', 'canCreateAccounts', 'canModifyLeverage'] },
  { title: 'Trades', keys: ['canViewTrades', 'canManageTrades', 'canCloseTrades', 'canModifyTrades'] },
  { title: 'Book Management', keys: ['canViewBookManagement', 'canManageBookManagement'] },
  { title: 'Deposits', keys: ['canViewDeposits', 'canApproveDeposits', 'canRejectDeposits'] },
  { title: 'Withdrawals', keys: ['canViewWithdrawals', 'canApproveWithdrawals', 'canRejectWithdrawals'] },
  { title: 'KYC', keys: ['canViewKYC', 'canApproveKYC', 'canRejectKYC'] },
  { title: 'IB', keys: ['canViewIB', 'canManageIB', 'canApproveIB'] },
  { title: 'Copy Trading', keys: ['canViewCopyTrading', 'canManageCopyTrading', 'canApproveMasters'] },
  { title: 'Prop Trading', keys: ['canViewPropTrading', 'canManagePropTrading'] },
  { title: 'Support', keys: ['canViewSupport', 'canManageSupport', 'canReplySupport'] },
  { title: 'Reports', keys: ['canViewReports', 'canExportReports'] },
  { title: 'Settings', keys: ['canViewSettings', 'canManageSettings', 'canManagePaymentMethods', 'canManageCharges', 'canManageTheme', 'canManageEmailTemplates', 'canManageBanners', 'canManageBonus'] },
]

const formatPermKey = (key) => key.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()

const AdminManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [employees, setEmployees] = useState([])
  const [roleTemplates, setRoleTemplates] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [adminProfile, setAdminProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('adminUser') || '{}') } catch { return {} }
  })

  useEffect(() => {
    fetch(`${API_URL}/admin-mgmt/my-profile`, { headers: getAdminHeaders() })
      .then(r => r.json())
      .then(data => { if (data.success && data.admin) setAdminProfile(data.admin) })
      .catch(() => {})
  }, [])

  const urlSlug = adminProfile.urlSlug || ''
  const customDomain = adminProfile.customDomain || ''
  
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'SUPPORT',
    permissions: {}
  })

  useEffect(() => {
    fetchEmployees()
    fetchRoleTemplates()
  }, [])

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employee-mgmt/employees`, { headers: getAdminHeaders() })
      const data = await res.json()
      if (data.success) {
        setEmployees(data.employees || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
    setLoading(false)
  }

  const fetchRoleTemplates = async () => {
    try {
      const res = await fetch(`${API_URL}/employee-mgmt/role-templates`, { headers: getAdminHeaders() })
      const data = await res.json()
      if (data.success) {
        setRoleTemplates(data.roleTemplates || {})
      }
    } catch (error) {
      console.error('Error fetching role templates:', error)
    }
  }

  const handleCreateEmployee = async () => {
    try {
      const res = await fetch(`${API_URL}/employee-mgmt/employees`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(newEmployee)
      })
      const data = await res.json()
      if (data.success) {
        alert('Employee created successfully!')
        setShowAddModal(false)
        setNewEmployee({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'SUPPORT', permissions: {} })
        fetchEmployees()
      } else {
        alert(data.message || 'Failed to create employee')
      }
    } catch (error) {
      alert('Error creating employee')
    }
  }

  const handleUpdateEmployee = async () => {
    try {
      const res = await fetch(`${API_URL}/employee-mgmt/employees/${selectedEmployee._id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          firstName: selectedEmployee.firstName,
          lastName: selectedEmployee.lastName,
          phone: selectedEmployee.phone,
          role: selectedEmployee.role,
          status: selectedEmployee.status
        })
      })
      const data = await res.json()
      if (data.success) {
        alert('Employee updated successfully!')
        setShowEditModal(false)
        fetchEmployees()
      } else {
        alert(data.message || 'Failed to update employee')
      }
    } catch (error) {
      alert('Error updating employee')
    }
  }

  const handleUpdatePermissions = async () => {
    try {
      const res = await fetch(`${API_URL}/employee-mgmt/employees/${selectedEmployee._id}/permissions`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ 
          permissions: selectedEmployee.permissions,
          role: selectedEmployee.role
        })
      })
      const data = await res.json()
      if (data.success) {
        alert('Permissions updated successfully!')
        setShowPermissionsModal(false)
        fetchEmployees()
      } else {
        alert(data.message || 'Failed to update permissions')
      }
    } catch (error) {
      alert('Error updating permissions')
    }
  }

  const handleToggleStatus = async (emp) => {
    const newStatus = emp.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    try {
      const res = await fetch(`${API_URL}/employee-mgmt/employees/${emp._id}/status`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json()
      if (data.success) fetchEmployees()
    } catch (error) {
      alert('Error updating status')
    }
  }

  const handleDeleteEmployee = async (emp) => {
    if (!confirm(`Are you sure you want to delete ${emp.firstName} ${emp.lastName}?`)) return
    try {
      const res = await fetch(`${API_URL}/employee-mgmt/employees/${emp._id}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      })
      const data = await res.json()
      if (data.success) {
        alert('Employee deleted successfully!')
        fetchEmployees()
      } else {
        alert(data.message || 'Failed to delete employee')
      }
    } catch (error) {
      alert('Error deleting employee')
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    try {
      const res = await fetch(`${API_URL}/employee-mgmt/employees/${selectedEmployee._id}/password`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ newPassword })
      })
      const data = await res.json()
      if (data.success) {
        alert('Password reset successfully!')
        setShowPasswordModal(false)
        setNewPassword('')
      } else {
        alert(data.message || 'Failed to reset password')
      }
    } catch (error) {
      alert('Error resetting password')
    }
  }

  const getPermissionCount = (perms) => {
    if (!perms) return 0
    return Object.values(perms).filter(v => v === true).length
  }

  const cleanDomain = customDomain ? customDomain.replace(/^https?:\/\//, '').replace(/\/$/, '') : ''
  const employeeLoginLink = cleanDomain
    ? `https://${cleanDomain}/employee-login`
    : urlSlug ? `${window.location.origin}/${urlSlug}/employee-login` : ''

  const handleCopyLoginLink = () => {
    if (!employeeLoginLink) return
    navigator.clipboard.writeText(employeeLoginLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const filteredEmployees = employees.filter(emp =>
    emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AdminLayout title="Employee Management" subtitle="Manage employees and their permissions">
      {/* Employee Login Link */}
      {employeeLoginLink && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Link size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white font-medium text-sm">Employee Login Link</p>
              <p className="text-blue-300 text-xs mt-0.5 break-all">{employeeLoginLink}</p>
              <p className="text-slate-500 text-xs mt-1">Share this link with your employees so they can login with your branding</p>
            </div>
          </div>
          <button
            onClick={handleCopyLoginLink}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
              linkCopied
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
            }`}
          >
            {linkCopied ? <Check size={16} /> : <Copy size={16} />}
            {linkCopied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Employees</p>
              <p className="text-white text-xl font-bold">{employees.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Check size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Active</p>
              <p className="text-white text-xl font-bold">{employees.filter(a => a.status === 'ACTIVE').length}</p>
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
              <p className="text-white text-xl font-bold">{employees.filter(a => a.status === 'SUSPENDED').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Briefcase size={20} className="text-purple-500" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Roles</p>
              <p className="text-white text-xl font-bold">{[...new Set(employees.map(e => e.role))].length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">Employees</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
              />
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <Plus size={16} />
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-8 text-center">
            <UserCog size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-500">No employees found</p>
            <p className="text-gray-600 text-sm mt-1">Create your first employee to get started</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden p-4 space-y-3">
              {filteredEmployees.map((emp) => (
                <div key={emp._id} className="bg-dark-700 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="text-blue-500 font-bold">{emp.firstName?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{emp.firstName} {emp.lastName}</p>
                        <p className="text-gray-500 text-sm">{emp.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      emp.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {emp.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Briefcase size={14} />
                      <span className={`px-2 py-0.5 rounded text-xs ${ROLE_COLORS[emp.role] || ROLE_COLORS.CUSTOM}`}>{emp.role}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Key size={14} />
                      <span>{getPermissionCount(emp.permissions)} permissions</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-600">
                    <button 
                      onClick={() => { setSelectedEmployee({...emp}); setShowPermissionsModal(true) }}
                      className="flex items-center justify-center gap-1 py-2 bg-purple-500/20 text-purple-500 rounded-lg text-xs"
                    >
                      <Key size={14} />
                    </button>
                    <button 
                      onClick={() => { setSelectedEmployee(emp); setShowPasswordModal(true) }}
                      className="flex items-center justify-center gap-1 py-2 bg-yellow-500/20 text-yellow-500 rounded-lg text-xs"
                    >
                      <Lock size={14} />
                    </button>
                    <button 
                      onClick={() => { setSelectedEmployee({...emp}); setShowEditModal(true) }}
                      className="flex items-center justify-center gap-1 py-2 bg-blue-500/20 text-blue-500 rounded-lg text-xs"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteEmployee(emp)}
                      className="flex items-center justify-center gap-1 py-2 bg-red-500/20 text-red-500 rounded-lg text-xs"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">EMPLOYEE</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">ROLE</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">PERMISSIONS</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">JOINED</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">STATUS</th>
                    <th className="text-right text-gray-500 text-sm font-medium py-3 px-4">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp._id} className="border-b border-gray-800 hover:bg-dark-700/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-blue-500 font-bold">{emp.firstName?.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{emp.firstName} {emp.lastName}</p>
                            <p className="text-gray-500 text-sm">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${ROLE_COLORS[emp.role] || ROLE_COLORS.CUSTOM}`}>{emp.role}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-400">{getPermissionCount(emp.permissions)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-400">{new Date(emp.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`px-3 py-1 rounded-full text-xs ${
                            emp.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                          }`}
                        >
                          {emp.status}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => { setSelectedEmployee({...emp}); setShowPermissionsModal(true) }}
                            className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-purple-500"
                            title="Permissions"
                          >
                            <Key size={16} />
                          </button>
                          <button 
                            onClick={() => { setSelectedEmployee(emp); setShowPasswordModal(true) }}
                            className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-yellow-500"
                            title="Reset Password"
                          >
                            <Lock size={16} />
                          </button>
                          <button 
                            onClick={() => { setSelectedEmployee({...emp}); setShowEditModal(true) }}
                            className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-blue-500"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteEmployee(emp)}
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
          </>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">Create New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">First Name *</label>
                  <input
                    type="text"
                    value={newEmployee.firstName}
                    onChange={(e) => setNewEmployee({...newEmployee, firstName: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Last Name</label>
                  <input
                    type="text"
                    value={newEmployee.lastName}
                    onChange={(e) => setNewEmployee({...newEmployee, lastName: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Email *</label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="employee@example.com"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Password *</label>
                <input
                  type="password"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Phone</label>
                <input
                  type="text"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Role *</label>
                <select
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <p className="text-gray-500 text-xs mt-1">Permissions will be auto-assigned based on role template (except CUSTOM)</p>
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
                onClick={handleCreateEmployee}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                Create Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">Edit Employee</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">First Name</label>
                  <input
                    type="text"
                    value={selectedEmployee.firstName}
                    onChange={(e) => setSelectedEmployee({...selectedEmployee, firstName: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Last Name</label>
                  <input
                    type="text"
                    value={selectedEmployee.lastName || ''}
                    onChange={(e) => setSelectedEmployee({...selectedEmployee, lastName: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Phone</label>
                <input
                  type="text"
                  value={selectedEmployee.phone || ''}
                  onChange={(e) => setSelectedEmployee({...selectedEmployee, phone: e.target.value})}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Role</label>
                <select
                  value={selectedEmployee.role}
                  onChange={(e) => setSelectedEmployee({...selectedEmployee, role: e.target.value})}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Status</label>
                <select
                  value={selectedEmployee.status}
                  onChange={(e) => setSelectedEmployee({...selectedEmployee, status: e.target.value})}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
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
                onClick={handleUpdateEmployee}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <div>
                <h3 className="text-white font-semibold text-lg">Employee Permissions</h3>
                <p className="text-gray-500 text-sm mt-1">{selectedEmployee.firstName} {selectedEmployee.lastName} — <span className={`px-2 py-0.5 rounded text-xs ${ROLE_COLORS[selectedEmployee.role] || ROLE_COLORS.CUSTOM}`}>{selectedEmployee.role}</span></p>
              </div>
              <button onClick={() => setShowPermissionsModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Quick role apply */}
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.filter(r => r !== 'CUSTOM').map(role => (
                  <button
                    key={role}
                    onClick={() => {
                      const tmpl = roleTemplates[role] || {}
                      setSelectedEmployee({...selectedEmployee, role, permissions: {...selectedEmployee.permissions, ...Object.fromEntries(Object.keys(selectedEmployee.permissions || {}).map(k => [k, false])), ...tmpl}})
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      selectedEmployee.role === role 
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' 
                        : 'bg-dark-700 text-gray-400 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {role.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              {/* Permission groups */}
              {PERMISSION_GROUPS.map(group => (
                <div key={group.title} className="bg-dark-700 rounded-lg p-3">
                  <p className="text-gray-300 text-sm font-medium mb-2">{group.title}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.keys.map(key => (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedEmployee.permissions?.[key] || false}
                          onChange={(e) => setSelectedEmployee({
                            ...selectedEmployee,
                            role: 'CUSTOM',
                            permissions: {...selectedEmployee.permissions, [key]: e.target.checked}
                          })}
                          className="rounded bg-dark-600 border-gray-600 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-gray-400">{formatPermKey(key)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="flex-1 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePermissions}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">Reset Password</h3>
              <button onClick={() => { setShowPasswordModal(false); setNewPassword('') }} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-dark-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Employee</p>
                <p className="text-white font-medium">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                <p className="text-gray-500 text-sm">{selectedEmployee.email}</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-500">
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">Warning</span>
                </div>
                <p className="text-yellow-500/80 text-sm mt-1">This will immediately change the employee's password.</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Enter new password (min 6 characters)"
                  minLength={6}
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => { setShowPasswordModal(false); setNewPassword('') }}
                className="flex-1 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={!newPassword || newPassword.length < 6}
                className="flex-1 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-600 disabled:opacity-50"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminManagement
