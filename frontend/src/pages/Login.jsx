import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { login } from '../api/auth'
import { API_BASE_URL } from '../config/api'
import suimfxLogo from '../assets/suimfxLogo.png'
import { useBranding } from '../context/BrandingContext'
import InstallAppButton from '../components/InstallAppButton'

const Login = () => {
  const navigate = useNavigate()
  const { branding, refreshBranding } = useBranding()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-redirect to dashboard if a valid (non-expired) JWT is already stored.
  // This is what makes the installed PWA "open straight to dashboard" for 13 days.
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload?.exp && payload.exp * 1000 > Date.now()) {
        const target = window.innerWidth < 768 ? '/mobile' : '/dashboard'
        navigate(target, { replace: true })
      } else {
        // expired — clear stale state
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    } catch {
      localStorage.removeItem('token')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dynamic favicon & title from admin branding (custom domain)
  useEffect(() => {
    if (!branding) return

    const originalTitle = document.title
    const linkEl = document.querySelector("link[rel~='icon']")
    const originalFavicon = linkEl ? linkEl.href : '/suimfxLogo.png'

    if (branding.brandName) {
      document.title = `${branding.brandName} - Sign In`
    }

    if (branding.logo) {
      if (linkEl) {
        linkEl.href = branding.logo
      } else {
        const newLink = document.createElement('link')
        newLink.rel = 'icon'
        newLink.href = branding.logo
        document.head.appendChild(newLink)
      }
    }

    return () => {
      document.title = originalTitle
      if (linkEl) linkEl.href = originalFavicon
    }
  }, [branding])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const adminSlug = localStorage.getItem('adminSlug') || undefined
      const response = await login({ ...formData, adminSlug })
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      // Store admin branding for sidebar logo
      if (response.user.adminBranding && response.user.adminBranding.logo) {
        localStorage.setItem('adminLogoUrl', `${API_BASE_URL}${response.user.adminBranding.logo}`)
        localStorage.setItem('adminBrandName', response.user.adminBranding.brandName || '')
      }
      await refreshBranding()
      if (isMobile) {
        navigate('/mobile')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1e3a5f_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#312e81_0%,_transparent_50%)]" />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link to="/">
              <img src={branding?.logo || suimfxLogo} alt={branding?.brandName || 'Suimfx'} className="h-24 w-auto" />
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-slate-400">Sign in to continue trading</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link to="/user/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in...' : <>Sign In <ArrowRight size={18} /></>}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-900/80 text-slate-500">New to Suimfx?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link
            to="/user/signup"
            className="block w-full text-center py-3.5 rounded-xl border border-slate-700 text-white font-medium hover:bg-slate-800/50 transition-all"
          >
            Create an Account
          </Link>

          {/* PWA install — only renders when the browser supports it and app is not installed */}
          <div className="mt-4">
            <InstallAppButton
              brandName={branding?.brandName}
              logoUrl={branding?.logo}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
