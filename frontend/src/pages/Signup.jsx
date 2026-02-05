import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, ChevronDown, Search, Eye, EyeOff, RefreshCw, ArrowLeft, User, Phone, ArrowRight } from 'lucide-react'
import { signup } from '../api/auth'
import { API_URL } from '../config/api'
import suimfxLogo from '../assets/suimfxLogo.png'

const countries = [
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+7', name: 'Russia', flag: '🇷🇺' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', name: 'Nepal', flag: '🇳🇵' },
]

const Signup = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const referralCode = searchParams.get('ref')
  const [activeTab, setActiveTab] = useState('signup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(countries[3])
  const dropdownRef = useRef(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [otpRequired, setOtpRequired] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpVerified, setOtpVerified] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    phone: '',
    countryCode: '+91',
    password: ''
  })
  
  // Detect mobile view
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCountryDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.includes(countrySearch)
  )

  const handleCountrySelect = (country) => {
    setSelectedCountry(country)
    setFormData({ ...formData, countryCode: country.code })
    setShowCountryDropdown(false)
    setCountrySearch('')
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  // Check if OTP is required on mount
  useEffect(() => {
    const checkOtpSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/otp-settings`)
        const data = await res.json()
        if (data.success) {
          setOtpRequired(data.otpEnabled)
        }
      } catch (error) {
        console.error('Error checking OTP settings:', error)
      }
    }
    checkOtpSettings()
  }, [])

  // Send OTP
  const handleSendOtp = async () => {
    if (!formData.email || !formData.firstName) {
      setError('Please enter your name and email first')
      return
    }

    setSendingOtp(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, firstName: formData.firstName })
      })
      const data = await res.json()

      if (data.success) {
        if (data.otpRequired) {
          setOtpStep(true)
          setOtpSent(true)
        } else {
          // OTP not required, proceed with signup
          setOtpVerified(true)
        }
      } else {
        setError(data.message || 'Failed to send OTP')
      }
    } catch (error) {
      setError('Error sending OTP')
    }
    setSendingOtp(false)
  }

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    setVerifyingOtp(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp })
      })
      const data = await res.json()

      if (data.success) {
        setOtpVerified(true)
        setOtpStep(false)
      } else {
        setError(data.message || 'Invalid OTP')
      }
    } catch (error) {
      setError('Error verifying OTP')
    }
    setVerifyingOtp(false)
  }

  // Resend OTP
  const handleResendOtp = async () => {
    setOtp('')
    await handleSendOtp()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      // If OTP is required and not verified, send OTP and show verification screen
      if (otpRequired && !otpVerified) {
        // Validate form first
        if (!formData.firstName || !formData.email || !formData.phone || !formData.password) {
          setError('Please fill in all fields')
          setLoading(false)
          return
        }
        
        // Send OTP
        const res = await fetch(`${API_URL}/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, firstName: formData.firstName })
        })
        const data = await res.json()
        
        if (data.success) {
          setOtpStep(true)
          setOtpSent(true)
        } else {
          setError(data.message || 'Failed to send OTP')
        }
        setLoading(false)
        return
      }

      // Create account (OTP verified or not required)
      const signupData = {
        ...formData,
        referralCode: referralCode || undefined,
        otpVerified: otpVerified
      }
      
      const response = await signup(signupData)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      // Also call register-referral API for backward compatibility
      if (referralCode && response.user?._id) {
        try {
          await fetch(`${API_URL}/ib/register-referral`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: response.user._id,
              referralCode: referralCode
            })
          })
          console.log('Referral registered:', referralCode)
        } catch (refError) {
          console.error('Error registering referral:', refError)
        }
      }
      
      // Redirect to mobile view on mobile devices
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

  // After OTP is verified, auto-submit the form
  useEffect(() => {
    if (otpVerified && otpStep === false) {
      // Trigger form submission
      const submitForm = async () => {
        setLoading(true)
        try {
          const signupData = {
            ...formData,
            referralCode: referralCode || undefined,
            otpVerified: true
          }
          
          const response = await signup(signupData)
          localStorage.setItem('token', response.token)
          localStorage.setItem('user', JSON.stringify(response.user))
          
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
      submitForm()
    }
  }, [otpVerified])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1e3a5f_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#312e81_0%,_transparent_50%)]" />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>
      
      {/* Signup Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Link to="/">
              <img src={suimfxLogo} alt="Suimfx" className="h-16 w-auto" />
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              {otpStep ? 'Verify Your Email' : 'Create Account'}
            </h1>
            <p className="text-slate-400">
              {otpStep ? 'Enter the code sent to your email' : 'Start your trading journey today'}
            </p>
          </div>

          {/* OTP Verification Step */}
          {otpStep ? (
            <div className="space-y-5">
              <button
                onClick={() => { setOtpStep(false); setOtp(''); setError('') }}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={18} /> Back
              </button>

              <p className="text-slate-400 text-sm">
                We've sent a 6-digit OTP to <span className="text-white font-medium">{formData.email}</span>
              </p>

              <input
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                maxLength={6}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-4 text-white text-center text-2xl tracking-[0.5em] placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || otp.length !== 6}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifyingOtp ? <><RefreshCw size={16} className="animate-spin" /> Verifying...</> : 'Verify OTP'}
              </button>

              <button
                onClick={handleResendOtp}
                disabled={sendingOtp}
                className="w-full text-slate-400 hover:text-white text-sm transition-colors flex items-center justify-center gap-2"
              >
                {sendingOtp ? <><RefreshCw size={14} className="animate-spin" /> Sending...</> : "Didn't receive? Resend OTP"}
              </button>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    name="firstName"
                    placeholder="John Doe"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Email field */}
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

              {/* Phone field with country selector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                <div className="flex relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="flex items-center gap-1 sm:gap-2 bg-slate-800/50 border border-slate-700 rounded-l-xl px-3 py-3.5 border-r-0 hover:bg-slate-700/50 transition-colors min-w-[80px]"
                  >
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="text-slate-400 text-sm">{selectedCountry.code}</span>
                    <ChevronDown size={14} className="text-slate-500" />
                  </button>
                  
                  {/* Country Dropdown */}
                  {showCountryDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 max-h-64 overflow-hidden">
                      <div className="p-2 border-b border-slate-700">
                        <div className="relative">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="text"
                            placeholder="Search country..."
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredCountries.map((country, index) => (
                          <button
                            key={`${country.code}-${index}`}
                            type="button"
                            onClick={() => handleCountrySelect(country)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700 transition-colors text-left"
                          >
                            <span className="text-lg">{country.flag}</span>
                            <span className="text-white text-sm flex-1">{country.name}</span>
                            <span className="text-slate-500 text-sm">{country.code}</span>
                          </button>
                        ))}
                        {filteredCountries.length === 0 && (
                          <p className="text-slate-500 text-sm text-center py-3">No countries found</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    className="flex-1 bg-slate-800/50 border border-slate-700 rounded-r-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-w-0"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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

              {/* Error message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Creating account...' : <>Create Account <ArrowRight size={18} /></>}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-900/80 text-slate-500">Already have an account?</span>
            </div>
          </div>

          {/* Sign In Link */}
          <Link
            to="/user/login"
            className="block w-full text-center py-3.5 rounded-xl border border-slate-700 text-white font-medium hover:bg-slate-800/50 transition-all"
          >
            Sign In
          </Link>

          {/* Terms */}
          <p className="text-center text-slate-500 text-xs mt-6">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-blue-400 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup
