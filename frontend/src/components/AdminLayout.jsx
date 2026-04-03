import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users,
  LogOut,
  TrendingUp,
  Wallet,
  Building2,
  UserCog,
  DollarSign,
  IndianRupee,
  Copy,
  Trophy,
  CreditCard,
  Shield,
  FileCheck,
  HeadphonesIcon,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Palette,
  Mail,
  Gift,
  Image,
  User,
  Bitcoin,
  BookOpen,
  Globe2
} from 'lucide-react'
import defaultLogo from '../assets/suimfxLogo.png'
import { API_BASE_URL } from '../config/api'

/** UI labels for header badge — staff under Super Admin = platform scope; under white-label Admin = tenant only */
function getSessionBadge (admin) {
  if (!admin) {
    return { title: 'Admin', subtitle: null, pillClass: 'bg-blue-500/20 text-blue-400', dotClass: 'bg-blue-500' }
  }
  const isRealSuperAdmin =
    admin.sessionKind === 'super_admin' ||
    (admin.role === 'SUPER_ADMIN' && !admin.permissions && admin.sessionKind !== 'employee')

  if (isRealSuperAdmin) {
    return {
      title: 'Super Admin',
      subtitle: 'Platform',
      pillClass: 'bg-red-500/20 text-red-400',
      dotClass: 'bg-red-500'
    }
  }

  if (admin.sessionKind === 'employee') {
    if (admin.employerRole === 'SUPER_ADMIN') {
      return {
        title: 'Platform staff',
        subtitle: 'Same data scope as Super Admin · permissions apply',
        pillClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
        dotClass: 'bg-amber-400'
      }
    }
    if (admin.employerRole === 'ADMIN') {
      const brand = (admin.brandName || '').trim()
      return {
        title: 'Partner staff',
        subtitle: brand ? `${brand} · white-label users only` : 'White-label users only',
        pillClass: 'bg-blue-500/20 text-blue-400',
        dotClass: 'bg-blue-500'
      }
    }
    return {
      title: 'Staff',
      subtitle: 'Limited permissions',
      pillClass: 'bg-slate-500/20 text-slate-400',
      dotClass: 'bg-slate-400'
    }
  }

  if (admin.sessionKind === 'admin' || admin.role === 'ADMIN') {
    const brand = (admin.brandName || '').trim()
    return {
      title: 'Admin',
      subtitle: brand || 'Partner dashboard',
      pillClass: 'bg-blue-500/20 text-blue-400',
      dotClass: 'bg-blue-500'
    }
  }

  if (admin.permissions) {
    return {
      title: 'Staff',
      subtitle: admin.employerRole === 'SUPER_ADMIN' ? 'Platform scope' : 'Partner scope',
      pillClass: 'bg-slate-500/20 text-slate-400',
      dotClass: 'bg-slate-400'
    }
  }

  return { title: 'Admin', subtitle: null, pillClass: 'bg-blue-500/20 text-blue-400', dotClass: 'bg-blue-500' }
}

const AdminLayout = ({ children, title, subtitle }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState({})
  const [admin, setAdmin] = useState(null)
  const [isImpersonating, setIsImpersonating] = useState(false)

  const [logoImage, setLogoImage] = useState(defaultLogo)

  // Get admin data from localStorage
  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (adminUser) {
      const parsed = JSON.parse(adminUser)
      setAdmin(parsed)
      if (parsed.logo) {
        setLogoImage(`${API_BASE_URL}${parsed.logo}`)
      }
    }
    setIsImpersonating(localStorage.getItem('isImpersonating') === 'true')
  }, [])

  // All menu items with sidebarPermission key
  const allMenuItems = [
    { name: 'Overview Dashboard', icon: LayoutDashboard, path: '/admin/dashboard', sidebarKey: 'overviewDashboard' },
    { name: 'User Management', icon: Users, path: '/admin/users', sidebarKey: 'userManagement' },
    { name: 'Trade Management', icon: TrendingUp, path: '/admin/trades', sidebarKey: 'tradeManagement' },
    { name: 'Book Management', icon: BookOpen, path: '/admin/book-management', sidebarKey: 'bookManagement' },
    { name: 'Fund Management', icon: Wallet, path: '/admin/funds', sidebarKey: 'fundManagement' },
    { name: 'Bank Settings', icon: Building2, path: '/admin/bank-settings', sidebarKey: 'bankSettings' },
    { name: 'Manual crypto', icon: Bitcoin, path: '/admin/manual-crypto', sidebarKey: 'bankSettings' },
    { name: 'IB Management', icon: UserCog, path: '/admin/ib-management', sidebarKey: 'ibManagement' },
    { name: 'Forex Charges', icon: DollarSign, path: '/admin/forex-charges', sidebarKey: 'forexCharges' },
    { name: 'Earnings Report', icon: TrendingUp, path: '/admin/earnings', sidebarKey: 'earningsReport' },
    { name: 'Copy Trade Management', icon: Copy, path: '/admin/copy-trade', sidebarKey: 'copyTrade' },
    { name: 'Prop Firm Challenges', icon: Trophy, path: '/admin/prop-firm', sidebarKey: 'propFirmChallenges' },
    { name: 'Account Types', icon: CreditCard, path: '/admin/account-types', sidebarKey: 'accountTypes' },
    { name: 'Theme Settings', icon: Palette, path: '/admin/theme', sidebarKey: 'themeSettings' },
    { name: 'Email Templates', icon: Mail, path: '/admin/email-templates', sidebarKey: 'emailTemplates' },
    { name: 'Bonus Management', icon: Gift, path: '/admin/bonus-management', sidebarKey: 'bonusManagement' },
    { name: 'Banner Management', icon: Image, path: '/admin/banners', sidebarKey: 'bonusManagement' },
    { name: 'Employee Management', icon: Shield, path: '/admin/admin-management', sidebarKey: 'employeeManagement' },
    { name: 'Super Admin Management', icon: Shield, path: '/admin/super-admin-management', sidebarKey: 'superAdminManagement' },
    { name: 'KYC Verification', icon: FileCheck, path: '/admin/kyc', sidebarKey: 'kycVerification' },
    { name: 'Support Tickets', icon: HeadphonesIcon, path: '/admin/support', sidebarKey: 'supportTickets' },
    { name: 'My Profile', icon: User, path: '/admin/profile', sidebarKey: 'myProfile' },
    { name: 'Connect Domain', icon: Globe2, path: '/admin/profile#domain', sidebarKey: 'myProfile', adminOnly: true },
  ]

  // Check if user has sidebar permission (SUPER_ADMIN has all permissions)
  const hasSidebarPermission = (sidebarKey) => {
    if (!admin) return false
    
    // Super Admin Management is ONLY for the real Super Admin account (not platform staff)
    if (sidebarKey === 'superAdminManagement') {
      const isRealSuperAdmin =
        admin.sessionKind === 'super_admin' ||
        (admin.role === 'SUPER_ADMIN' && !admin.permissions && admin.sessionKind !== 'employee')
      return isRealSuperAdmin
    }

    if (admin.sessionKind === 'super_admin' || (admin.role === 'SUPER_ADMIN' && !admin.permissions && admin.sessionKind !== 'employee')) {
      return true
    }
    if (sidebarKey === 'overviewDashboard') return true // Dashboard always visible
    if (sidebarKey === 'myProfile') return true // My Profile always visible
    
    // Check sidebarPermissions for Admin role
    if (admin.sidebarPermissions && admin.sidebarPermissions[sidebarKey] === true) {
      return true
    }
    
    // Check employee permissions (map sidebar keys to employee permissions)
    if (admin.permissions) {
      const p = admin.permissions
      const permissionMap = {
        'userManagement': p.canViewUsers || p.canManageUsers,
        'tradeManagement': p.canViewTrades || p.canManageTrades,
        'bookManagement': p.canViewTrades || p.canManageTrades,
        'fundManagement': p.canViewDeposits || p.canViewWithdrawals || p.canApproveDeposits || p.canApproveWithdrawals,
        'bankSettings': p.canManagePaymentMethods,
        'ibManagement': p.canViewIB || p.canManageIB,
        'forexCharges': p.canManageCharges,
        'earningsReport': p.canViewReports,
        'copyTrade': p.canViewCopyTrading || p.canManageCopyTrading,
        'propFirmChallenges': p.canViewPropTrading || p.canManagePropTrading,
        'accountTypes': p.canManageSettings,
        'themeSettings': p.canManageTheme,
        'emailTemplates': p.canManageEmailTemplates,
        'bonusManagement': p.canManageBonus,
        'bannerManagement': p.canManageBanners,
        'kycVerification': p.canViewKYC || p.canApproveKYC,
        'supportTickets': p.canViewSupport || p.canManageSupport
      }
      if (permissionMap[sidebarKey] === true) {
        return true
      }
    }
    
    return false
  }

  // Filter menu items based on sidebar permissions
  const menuItems = allMenuItems.filter(item => {
    // Connect Domain etc.: white-label admins + their staff only (not platform / Super Admin)
    if (item.adminOnly) {
      const tenantContext =
        admin?.sessionKind === 'admin' ||
        admin?.role === 'ADMIN' ||
        (admin?.sessionKind === 'employee' && admin?.employerRole === 'ADMIN')
      if (!tenantContext) return false
    }
    return hasSidebarPermission(item.sidebarKey)
  })

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) {
      navigate('/admin')
    }
  }, [navigate])

  const handleExitImpersonation = () => {
    const originalToken = localStorage.getItem('originalAdminToken')
    const originalUser = localStorage.getItem('originalAdminUser')
    if (originalToken && originalUser) {
      localStorage.setItem('adminToken', originalToken)
      localStorage.setItem('adminUser', originalUser)
      localStorage.removeItem('originalAdminToken')
      localStorage.removeItem('originalAdminUser')
      localStorage.removeItem('isImpersonating')
      window.location.href = '/admin/super-admin-management'
    }
  }

  const handleLogout = () => {
    const currentAdmin = admin
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    localStorage.removeItem('originalAdminToken')
    localStorage.removeItem('originalAdminUser')
    localStorage.removeItem('isImpersonating')
    const isSuperAdminPortalUser =
      currentAdmin?.sessionKind === 'super_admin' ||
      (currentAdmin?.role === 'SUPER_ADMIN' && !currentAdmin?.permissions && currentAdmin?.sessionKind !== 'employee')
    if (isSuperAdminPortalUser) {
      navigate('/admin')
    } else {
      navigate('/admin/login')
    }
  }

  const isActive = (path) => location.pathname === path

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${sidebarExpanded ? 'w-64' : 'w-16'} 
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          bg-dark-900 border-r border-gray-800 flex flex-col 
          transition-all duration-300 ease-in-out
        `}
      >
        {/* Logo */}
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="Suimfx" className="h-20 w-auto object-contain flex-shrink-0" />
          </div>
          <button 
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="hidden lg:block p-1 hover:bg-dark-700 rounded transition-colors"
          >
            <Menu size={18} className="text-gray-400" />
          </button>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 hover:bg-dark-700 rounded transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                navigate(item.path)
                setMobileMenuOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                isActive(item.path)
                  ? 'bg-red-500 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-dark-700'
              }`}
              title={!sidebarExpanded ? item.name : ''}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {sidebarExpanded && (
                <span className="text-sm font-medium whitespace-nowrap truncate">{item.name}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-gray-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-white hover:bg-dark-700 transition-colors rounded-lg"
            title={!sidebarExpanded ? 'Log Out' : ''}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {sidebarExpanded && <span className="text-sm font-medium whitespace-nowrap">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-dark-900/95 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <Menu size={20} className="text-gray-400" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-white">{title || 'Admin Dashboard'}</h1>
              {subtitle && <p className="text-gray-500 text-sm hidden sm:block">{subtitle}</p>}
            </div>
          </div>
          {(() => {
            const badge = getSessionBadge(admin)
            return (
              <div className={`flex flex-col items-end gap-0.5 max-w-[min(100%,14rem)] sm:max-w-xs`}>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm ${badge.pillClass}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${badge.dotClass}`} />
                  <span className="font-medium truncate">{badge.title}</span>
                </div>
                {badge.subtitle && (
                  <span className="text-[10px] sm:text-xs text-gray-500 text-right leading-tight line-clamp-2">
                    {badge.subtitle}
                  </span>
                )}
              </div>
            )
          })()}
        </header>

        {/* Impersonation Banner */}
        {isImpersonating && (
          <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 sm:px-6 py-2 flex items-center justify-between">
            <span className="text-yellow-400 text-sm font-medium">
              ⚠ You are impersonating <strong>{admin?.firstName} {admin?.lastName}</strong> ({admin?.role})
            </span>
            <button
              onClick={handleExitImpersonation}
              className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded hover:bg-yellow-400 transition-colors"
            >
              Exit Impersonation
            </button>
          </div>
        )}

        {/* Page Content */}
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export default AdminLayout
