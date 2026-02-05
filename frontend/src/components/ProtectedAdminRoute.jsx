import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Protected Route Component for Admin Panel
 * Checks if user has permission to access the current route
 * Redirects to dashboard if unauthorized
 */
const ProtectedAdminRoute = ({ children, requiredPermission }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuthorization = () => {
      const adminToken = localStorage.getItem('adminToken')
      const adminUser = localStorage.getItem('adminUser')

      // No token - redirect to login
      if (!adminToken) {
        navigate('/admin')
        return
      }

      // No user data - redirect to login
      if (!adminUser) {
        navigate('/admin')
        return
      }

      const admin = JSON.parse(adminUser)

      // Super Admin has all permissions
      if (admin.role === 'SUPER_ADMIN') {
        setIsAuthorized(true)
        setIsLoading(false)
        return
      }

      // No required permission specified - allow access
      if (!requiredPermission) {
        setIsAuthorized(true)
        setIsLoading(false)
        return
      }

      // Check sidebar permissions for Admin role
      if (admin.sidebarPermissions && admin.sidebarPermissions[requiredPermission] === true) {
        setIsAuthorized(true)
        setIsLoading(false)
        return
      }

      // Check employee permissions (map sidebar keys to employee permissions)
      if (admin.permissions) {
        const p = admin.permissions
        const permissionMap = {
          'overviewDashboard': p.canViewDashboard,
          'userManagement': p.canViewUsers || p.canManageUsers,
          'tradeManagement': p.canViewTrades || p.canManageTrades,
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
          'employeeManagement': false, // Employees cannot manage other employees
          'kycVerification': p.canViewKYC || p.canApproveKYC,
          'supportTickets': p.canViewSupport || p.canManageSupport
        }

        if (permissionMap[requiredPermission] === true) {
          setIsAuthorized(true)
          setIsLoading(false)
          return
        }
      }

      // Not authorized - redirect to dashboard with error
      console.warn(`[RBAC] Unauthorized access attempt to ${location.pathname}`)
      navigate('/admin/dashboard', { 
        state: { 
          error: 'You do not have permission to access this page.' 
        } 
      })
    }

    checkAuthorization()
  }, [navigate, location.pathname, requiredPermission])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return children
}

export default ProtectedAdminRoute
