import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Shield, ArrowRight, AlertCircle } from 'lucide-react'
import { API_URL, API_BASE_URL } from '../config/api'

const BrandedEmployeeLogin = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [brandInfo, setBrandInfo] = useState(null)
  const [brandLoading, setBrandLoading] = useState(true)
  const [brandError, setBrandError] = useState('')
  const [formData, setFormData] = useState({ email: '', password: '' })

  useEffect(() => {
    fetchBrandInfo()
  }, [slug])

  // Dynamic favicon & title from admin brand
  useEffect(() => {
    if (!brandInfo) return
    const originalTitle = document.title
    const linkEl = document.querySelector("link[rel~='icon']")
    const originalFavicon = linkEl ? linkEl.href : '/suimfxLogo.png'

    if (brandInfo.brandName) document.title = `${brandInfo.brandName} - Staff Login`
    if (brandInfo.logo) {
      const faviconUrl = `${API_BASE_URL}${brandInfo.logo}`
      if (linkEl) linkEl.href = faviconUrl
      else {
        const newLink = document.createElement('link')
        newLink.rel = 'icon'
        newLink.href = faviconUrl
        document.head.appendChild(newLink)
      }
    }

    return () => {
      document.title = originalTitle
      if (linkEl) linkEl.href = originalFavicon
    }
  }, [brandInfo])

  const fetchBrandInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/brand/${slug}`)
      const data = await res.json()
      if (data.success) {
        setBrandInfo(data.brand)
      } else {
        setBrandError(data.message || 'Brand not found')
      }
    } catch {
      setBrandError('Failed to load brand information')
    }
    setBrandLoading(false)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/admin-mgmt/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, adminSlug: slug })
      })
      const data = await res.json()

      if (data.success) {
        localStorage.setItem('adminToken', data.token)
        localStorage.setItem('adminUser', JSON.stringify(data.admin))
        navigate('/admin/dashboard')
      } else {
        setError(data.message || 'Invalid credentials')
      }
    } catch {
      setError('Connection error. Please try again.')
    }
    setLoading(false)
  }

  if (brandLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (brandError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <p className="text-white text-lg font-semibold mb-2">Invalid Login Link</p>
          <p className="text-slate-400">{brandError}</p>
        </div>
      </div>
    )
  }

  const logoUrl = brandInfo?.logo ? `${API_BASE_URL}${brandInfo.logo}` : null
  const brandName = brandInfo?.brandName || 'Admin Portal'

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1e3a5f_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#312e81_0%,_transparent_50%)]" />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 p-5 sm:p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-20 w-auto object-contain" />
            ) : (
              <div className="h-20 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">{brandName}</span>
              </div>
            )}
          </div>

          {/* Staff Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Shield size={14} />
              Staff Portal · {brandName}
            </span>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Staff Login</h1>
            <p className="text-slate-400 text-sm">Login with your staff credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

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
                  required
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in...' : <> Sign In <ArrowRight size={18} /> </>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default BrandedEmployeeLogin
