import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import MobileTradingApp from './pages/MobileTradingApp'
import Account from './pages/Account'
import WalletPage from './pages/WalletPage'
import OrderBook from './pages/OrderBook'
import TradingPage from './pages/TradingPage'
import CopyTradePage from './pages/CopyTradePage'
import IBPage from './pages/IBPage'
import ProfilePage from './pages/ProfilePage'
import SupportPage from './pages/SupportPage'
import InstructionsPage from './pages/InstructionsPage'
import AdminLogin from './pages/AdminLogin'
import AdminOverview from './pages/AdminOverview'
import AdminUserManagement from './pages/AdminUserManagement'
import AdminAccounts from './pages/AdminAccounts'
import AdminAccountTypes from './pages/AdminAccountTypes'
import AdminTransactions from './pages/AdminTransactions'
import AdminPaymentMethods from './pages/AdminPaymentMethods'
import AdminTradeManagement from './pages/AdminTradeManagement'
import AdminFundManagement from './pages/AdminFundManagement'
import AdminBankSettings from './pages/AdminBankSettings'
import AdminIBManagement from './pages/AdminIBManagement'
import AdminForexCharges from './pages/AdminForexCharges'
import AdminIndianCharges from './pages/AdminIndianCharges'
import AdminCopyTrade from './pages/AdminCopyTrade'
import AdminPropFirm from './pages/AdminPropFirm'
import AdminManagement from './pages/AdminManagement'
import AdminKYC from './pages/AdminKYC'
import AdminSupport from './pages/AdminSupport'
import BuyChallengePage from './pages/BuyChallengePage'
import ChallengeDashboardPage from './pages/ChallengeDashboardPage'
import AdminPropTrading from './pages/AdminPropTrading'
import AdminEarnings from './pages/AdminEarnings'
import ForgotPassword from './pages/ForgotPassword'
import AdminThemeSettings from './pages/AdminThemeSettings'
import BrandedLogin from './pages/BrandedLogin'
import BrandedSignup from './pages/BrandedSignup'
import AdminEmailTemplates from './pages/AdminEmailTemplates'
import AdminBonusManagement from './pages/AdminBonusManagement'
import AdminBannerManagement from './pages/AdminBannerManagement'
import LandingPage from './pages/LandingPage'
import EmployeeLogin from './pages/EmployeeLogin'
import AdminProfile from './pages/AdminProfile'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Navigate to="/user/login" replace />} />
        <Route path="/signup" element={<Navigate to="/user/signup" replace />} />
        <Route path="/user/signup" element={<Signup />} />
        <Route path="/user/login" element={<Login />} />
        <Route path="/user/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/mobile" element={<MobileTradingApp />} />
        <Route path="/account" element={<Account />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/orders" element={<OrderBook />} />
        <Route path="/trade/:accountId" element={<TradingPage />} />
        <Route path="/copytrade" element={<CopyTradePage />} />
        <Route path="/ib" element={<IBPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/instructions" element={<InstructionsPage />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<ProtectedAdminRoute requiredPermission="overviewDashboard"><AdminOverview /></ProtectedAdminRoute>} />
        <Route path="/admin/users" element={<ProtectedAdminRoute requiredPermission="userManagement"><AdminUserManagement /></ProtectedAdminRoute>} />
        <Route path="/admin/accounts" element={<ProtectedAdminRoute requiredPermission="userManagement"><AdminAccounts /></ProtectedAdminRoute>} />
        <Route path="/admin/account-types" element={<ProtectedAdminRoute requiredPermission="accountTypes"><AdminAccountTypes /></ProtectedAdminRoute>} />
        <Route path="/admin/transactions" element={<ProtectedAdminRoute requiredPermission="fundManagement"><AdminTransactions /></ProtectedAdminRoute>} />
        <Route path="/admin/payment-methods" element={<ProtectedAdminRoute requiredPermission="bankSettings"><AdminPaymentMethods /></ProtectedAdminRoute>} />
        <Route path="/admin/trades" element={<ProtectedAdminRoute requiredPermission="tradeManagement"><AdminTradeManagement /></ProtectedAdminRoute>} />
        <Route path="/admin/funds" element={<ProtectedAdminRoute requiredPermission="fundManagement"><AdminFundManagement /></ProtectedAdminRoute>} />
        <Route path="/admin/bank-settings" element={<ProtectedAdminRoute requiredPermission="bankSettings"><AdminBankSettings /></ProtectedAdminRoute>} />
        <Route path="/admin/ib-management" element={<ProtectedAdminRoute requiredPermission="ibManagement"><AdminIBManagement /></ProtectedAdminRoute>} />
        <Route path="/admin/forex-charges" element={<ProtectedAdminRoute requiredPermission="forexCharges"><AdminForexCharges /></ProtectedAdminRoute>} />
        <Route path="/admin/indian-charges" element={<ProtectedAdminRoute requiredPermission="forexCharges"><AdminIndianCharges /></ProtectedAdminRoute>} />
        <Route path="/admin/copy-trade" element={<ProtectedAdminRoute requiredPermission="copyTrade"><AdminCopyTrade /></ProtectedAdminRoute>} />
        <Route path="/admin/prop-firm" element={<ProtectedAdminRoute requiredPermission="propFirmChallenges"><AdminPropFirm /></ProtectedAdminRoute>} />
        <Route path="/admin/admin-management" element={<ProtectedAdminRoute requiredPermission="employeeManagement"><AdminManagement /></ProtectedAdminRoute>} />
        <Route path="/admin/kyc" element={<ProtectedAdminRoute requiredPermission="kycVerification"><AdminKYC /></ProtectedAdminRoute>} />
        <Route path="/admin/support" element={<ProtectedAdminRoute requiredPermission="supportTickets"><AdminSupport /></ProtectedAdminRoute>} />
        <Route path="/admin/prop-trading" element={<ProtectedAdminRoute requiredPermission="propFirmChallenges"><AdminPropTrading /></ProtectedAdminRoute>} />
        <Route path="/admin/earnings" element={<ProtectedAdminRoute requiredPermission="earningsReport"><AdminEarnings /></ProtectedAdminRoute>} />
        <Route path="/admin/theme" element={<ProtectedAdminRoute requiredPermission="themeSettings"><AdminThemeSettings /></ProtectedAdminRoute>} />
        <Route path="/admin/email-templates" element={<ProtectedAdminRoute requiredPermission="emailTemplates"><AdminEmailTemplates /></ProtectedAdminRoute>} />
        <Route path="/admin/bonus-management" element={<ProtectedAdminRoute requiredPermission="bonusManagement"><AdminBonusManagement /></ProtectedAdminRoute>} />
        <Route path="/admin/banners" element={<ProtectedAdminRoute requiredPermission="bonusManagement"><AdminBannerManagement /></ProtectedAdminRoute>} />
        <Route path="/admin/profile" element={<ProtectedAdminRoute><AdminProfile /></ProtectedAdminRoute>} />
        <Route path="/admin/login" element={<EmployeeLogin />} />
        <Route path="/buy-challenge" element={<BuyChallengePage />} />
        <Route path="/challenge-dashboard" element={<ChallengeDashboardPage />} />
        <Route path="/:slug/login" element={<BrandedLogin />} />
        <Route path="/:slug/signup" element={<BrandedSignup />} />
      </Routes>
    </Router>
  )
}

export default App
