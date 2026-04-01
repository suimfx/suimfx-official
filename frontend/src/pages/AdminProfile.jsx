import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Link,
  Copy,
  Check,
  Save,
  Lock,
  Eye,
  EyeOff,
  Key,
  Upload,
  Globe,
  Image
} from 'lucide-react'
import { API_URL, API_BASE_URL } from '../config/api'

const AdminProfile = () => {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedLogin, setCopiedLogin] = useState(false)
  const [copiedDomain, setCopiedDomain] = useState(false)
  const [copiedDomainLogin, setCopiedDomainLogin] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    brandName: '',
    customDomain: ''
  })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (adminUser) {
      const parsed = JSON.parse(adminUser)
      setAdmin(parsed)
      setFormData({
        firstName: parsed.firstName || '',
        lastName: parsed.lastName || '',
        phone: parsed.phone || '',
        brandName: parsed.brandName || '',
        customDomain: parsed.customDomain || ''
      })
      if (parsed.logo) setLogoPreview(`${API_BASE_URL}${parsed.logo}`)
    }
    fetchFullProfile()
  }, [])

  const fetchFullProfile = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`${API_URL}/admin-mgmt/my-profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success && data.admin) {
        const a = data.admin
        setAdmin(prev => ({ ...prev, ...a }))
        setFormData({
          firstName: a.firstName || '',
          lastName: a.lastName || '',
          phone: a.phone || '',
          brandName: a.brandName || '',
          customDomain: a.customDomain || ''
        })
        if (a.logo) setLogoPreview(`${API_BASE_URL}${a.logo}`)
        localStorage.setItem('adminUser', JSON.stringify({ ...JSON.parse(localStorage.getItem('adminUser') || '{}'), ...a }))
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.firstName.trim()) {
      setError('First name is required')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`${API_URL}/admin-mgmt/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      const data = await res.json()

      if (data.success) {
        const updatedAdmin = { 
          ...admin, 
          firstName: formData.firstName, 
          lastName: formData.lastName, 
          phone: formData.phone,
          brandName: formData.brandName,
          customDomain: formData.customDomain,
          ...(data.admin || {})
        }
        localStorage.setItem('adminUser', JSON.stringify(updatedAdmin))
        setAdmin(updatedAdmin)
        setSuccess('Profile updated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to update profile')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
    }
    setLoading(false)
  }

  const copyLink = (link, setter) => {
    navigator.clipboard.writeText(link)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const handleLogoUpload = async () => {
    if (!logoFile) return
    setLogoUploading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const fd = new FormData()
      fd.append('logo', logoFile)
      const res = await fetch(`${API_URL}/admin-mgmt/upload-logo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        setLogoPreview(`${API_BASE_URL}${data.logo}`)
        const updatedAdmin = { ...admin, logo: data.logo }
        setAdmin(updatedAdmin)
        localStorage.setItem('adminUser', JSON.stringify(updatedAdmin))
        setLogoFile(null)
        setSuccess('Logo uploaded successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to upload logo')
      }
    } catch (err) {
      setError('Failed to upload logo')
    }
    setLogoUploading(false)
  }

  const handleLogoSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo must be less than 2MB')
        return
      }
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    setPasswordLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`${API_URL}/admin-mgmt/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })
      const data = await res.json()

      if (data.success) {
        setPasswordSuccess('Password changed successfully!')
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => setPasswordSuccess(''), 3000)
      } else {
        setPasswordError(data.message || 'Failed to change password')
      }
    } catch (err) {
      setPasswordError('Connection error. Please try again.')
    }
    setPasswordLoading(false)
  }

  const getInitials = () => {
    const first = admin?.firstName?.charAt(0) || ''
    const last = admin?.lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || 'AD'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <AdminLayout title="Admin Profile" subtitle="Manage your account settings">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-dark-800 rounded-xl border border-gray-800 p-6">
            {/* Avatar / Logo */}
            <div className="flex flex-col items-center">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-24 h-24 rounded-full object-cover border-2 border-gray-700 mb-4" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-3xl font-bold mb-4">
                  {getInitials()}
                </div>
              )}
              <h2 className="text-xl font-semibold text-white">
                {admin?.brandName || `${admin?.firstName} ${admin?.lastName}`}
              </h2>
              <p className="text-gray-400 text-sm">{admin?.email}</p>
              <span className={`mt-3 px-3 py-1 rounded-full text-xs font-medium ${
                admin?.role === 'SUPER_ADMIN' 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {admin?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 my-6"></div>

            {/* Info Items */}
            <div className="space-y-4">
              {admin?.brandName && (
                <div className="flex items-center gap-3 text-gray-400">
                  <Building2 size={18} />
                  <span>{admin.brandName}</span>
                </div>
              )}
              {admin?.customDomain && (
                <div className="flex items-center gap-3 text-gray-400">
                  <Globe size={18} />
                  <span>{admin.customDomain}</span>
                </div>
              )}
              {admin?.urlSlug && (
                <div className="flex items-center gap-3 text-gray-400">
                  <Link size={18} />
                  <span>/{admin.urlSlug}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-gray-400">
                <Calendar size={18} />
                <span>Joined {formatDate(admin?.createdAt)}</span>
              </div>
            </div>

            {/* User Links Section */}
            {admin?.urlSlug && (
              <>
                <div className="border-t border-gray-700 my-6"></div>
                <div className="space-y-4">
                  {/* Slug-based Links */}
                  <div className="bg-dark-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                      <Link size={16} />
                      <span className="font-medium">Branded Links</span>
                    </div>
                    <p className="text-gray-500 text-xs mb-3">
                      Share these links with users to register/login under your brand
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs w-14 shrink-0">Signup</span>
                        <input type="text" readOnly value={`${window.location.origin}/${admin.urlSlug}/signup`} className="flex-1 bg-dark-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 truncate" />
                        <button onClick={() => copyLink(`${window.location.origin}/${admin.urlSlug}/signup`, setCopied)} className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs w-14 shrink-0">Login</span>
                        <input type="text" readOnly value={`${window.location.origin}/${admin.urlSlug}/login`} className="flex-1 bg-dark-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 truncate" />
                        <button onClick={() => copyLink(`${window.location.origin}/${admin.urlSlug}/login`, setCopiedLogin)} className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors ${copiedLogin ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                          {copiedLogin ? <Check size={14} /> : <Copy size={14} />}
                          {copiedLogin ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Custom Domain Links */}
                  {admin?.customDomain && (
                    <div className="bg-dark-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <Globe size={16} />
                        <span className="font-medium">Custom Domain Links</span>
                      </div>
                      <p className="text-gray-500 text-xs mb-3">
                        Users can access your platform directly via your custom domain
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs w-14 shrink-0">Signup</span>
                          <input type="text" readOnly value={`https://${admin.customDomain}/user/signup`} className="flex-1 bg-dark-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 truncate" />
                          <button onClick={() => copyLink(`https://${admin.customDomain}/user/signup`, setCopiedDomain)} className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors ${copiedDomain ? 'bg-green-500 text-white' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                            {copiedDomain ? <Check size={14} /> : <Copy size={14} />}
                            {copiedDomain ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs w-14 shrink-0">Login</span>
                          <input type="text" readOnly value={`https://${admin.customDomain}/user/login`} className="flex-1 bg-dark-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 truncate" />
                          <button onClick={() => copyLink(`https://${admin.customDomain}/user/login`, setCopiedDomainLogin)} className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors ${copiedDomainLogin ? 'bg-green-500 text-white' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                            {copiedDomainLogin ? <Check size={14} /> : <Copy size={14} />}
                            {copiedDomainLogin ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <p className="text-yellow-500/70 text-xs mt-3 flex items-center gap-1">
                        ⚠️ Make sure your domain DNS is pointed to the server and SSL is configured
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column - Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-dark-800 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-2">
              <User size={20} className="text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Profile Details</h3>
            </div>
            <p className="text-gray-500 text-sm mb-6">Update your personal information</p>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">First Name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="First Name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Last Name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="Last Name"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={admin?.email || ''}
                    disabled
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-4 py-3 text-gray-400 cursor-not-allowed"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Phone</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              {/* Branding Section */}
              <div className="border-t border-gray-700 pt-5 mt-2">
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Image size={18} className="text-purple-400" /> Branding Settings
                </h4>

                {/* Logo Upload */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Logo</label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-gray-600" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-dark-700 border border-gray-600 flex items-center justify-center text-gray-500">
                        <Image size={24} />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-sm text-gray-300 hover:border-blue-500 cursor-pointer transition-colors"
                      >
                        <Upload size={16} /> Choose Logo
                      </label>
                      {logoFile && (
                        <button
                          type="button"
                          onClick={handleLogoUpload}
                          disabled={logoUploading}
                          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
                        >
                          {logoUploading ? 'Uploading...' : 'Upload'}
                        </button>
                      )}
                      <p className="text-gray-600 text-xs mt-1">Max 2MB. JPG, PNG, SVG, WebP</p>
                    </div>
                  </div>
                </div>

                {/* Brand Name */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Brand Name</label>
                  <div className="relative">
                    <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="Your Brand Name"
                    />
                  </div>
                </div>

                {/* Custom Domain */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Custom Domain</label>
                  <div className="relative">
                    <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={formData.customDomain}
                      onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. trading.yourdomain.com"
                    />
                  </div>
                  <p className="text-gray-600 text-xs mt-1">Point your domain's DNS CNAME to this server, then enter it here</p>
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}
              {success && (
                <p className="text-green-500 text-sm">{success}</p>
              )}

              {/* Save Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Change Password Section */}
          <div className="bg-dark-800 rounded-xl border border-gray-800 p-6 mt-6">
            <div className="flex items-center gap-3 mb-2">
              <Key size={20} className="text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Change Password</h3>
            </div>
            <p className="text-gray-500 text-sm mb-6">Update your account password</p>

            <form onSubmit={handleChangePassword} className="space-y-5">
              {/* Current Password */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Current Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-12 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">New Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-12 py-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="Enter new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Error/Success Messages */}
              {passwordError && (
                <p className="text-red-500 text-sm">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-green-500 text-sm">{passwordSuccess}</p>
              )}

              {/* Change Password Button */}
              <button
                type="submit"
                disabled={passwordLoading}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                <Key size={18} />
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminProfile
