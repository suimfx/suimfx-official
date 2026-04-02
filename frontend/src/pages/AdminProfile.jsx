import { useState, useEffect, useCallback } from 'react'
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
  Image,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Unlink,
  CheckCircle2,
  Clock,
  Wifi,
  Server,
  ChevronRight,
  ExternalLink,
  Info,
  XCircle
} from 'lucide-react'
import { API_URL, API_BASE_URL } from '../config/api'

// ─── Provider-specific DNS instructions ───────────────────────────────────────
const PROVIDER_INSTRUCTIONS = {
  GoDaddy: {
    color: '#00A651',
    steps: [
      'Log in at godaddy.com → Go to My Products',
      'Click DNS next to your domain',
      'Click Add in DNS Records section',
      'For A Record: Type = A, Host = @, Value = {IP}, TTL = 600',
      'For TXT Record: Type = TXT, Host = _suimfx-verify, Value = {TXT}',
      'Click Save → Wait for propagation (5–30 minutes typically)'
    ]
  },
  Namecheap: {
    color: '#DE3723',
    steps: [
      'Log in at namecheap.com → Domain List',
      'Click Manage next to your domain → Advanced DNS tab',
      'Click Add New Record',
      'For A Record: Type = A Record, Host = @, Value = {IP}, TTL = Automatic',
      'For TXT Record: Type = TXT Record, Host = _suimfx-verify, Value = {TXT}',
      'Click the Save All Changes button'
    ]
  },
  Cloudflare: {
    color: '#F48120',
    steps: [
      'Log in at dash.cloudflare.com → Select your site',
      'Click DNS in the left sidebar',
      'Click Add record',
      'For A Record: Type = A, Name = @, IPv4 = {IP}, Proxy status = DNS only (grey cloud)',
      'For TXT Record: Type = TXT, Name = _suimfx-verify, Content = {TXT}',
      '⚠️ Make sure to set Proxy status to DNS only (not proxied) for verification'
    ]
  },
  'Google Domains': {
    color: '#4285F4',
    steps: [
      'Log in at domains.google.com → Click your domain',
      'Click DNS → Custom records',
      'For A Record: Type = A, Host name = @, Data = {IP}, TTL = 3600',
      'For TXT Record: Type = TXT, Host name = _suimfx-verify, Data = {TXT}',
      'Click Save'
    ]
  },
  'AWS Route53': {
    color: '#FF9900',
    steps: [
      'Log in to AWS Console → Route 53 → Hosted zones',
      'Click your domain → Create record',
      'For A Record: Record name = (blank), Type = A, Value = {IP}',
      'For TXT Record: Record name = _suimfx-verify, Type = TXT, Value = "{TXT}"',
      'Click Create records'
    ]
  }
}

const DEFAULT_INSTRUCTIONS = [
  'Log in to your domain registrar/DNS provider',
  'Find the DNS Management or DNS Settings section',
  'For A Record: Type = A, Host = @, Value = {IP}',
  'For TXT Record: Type = TXT, Host = _suimfx-verify, Value = {TXT}',
  'Save changes and wait 5–30 minutes for DNS propagation'
]

// ─── Step Progress Bar ─────────────────────────────────────────────────────
const STEPS = ['Enter Domain', 'Add DNS Records', 'Instructions', 'Check DNS', 'Complete']

const StepBar = ({ current }) => (
  <div className="flex items-center w-full mb-6">
    {STEPS.map((label, i) => {
      const stepNum = i + 1
      const isDone = stepNum < current
      const isActive = stepNum === current
      return (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              isDone ? 'bg-emerald-500 text-white' :
              isActive ? 'bg-blue-500 text-white ring-4 ring-blue-500/25' :
              'bg-dark-700 text-gray-500 border border-gray-700'
            }`}>
              {isDone ? <Check size={13} /> : stepNum}
            </div>
            <span className={`text-xs mt-1 whitespace-nowrap hidden sm:block ${isActive ? 'text-blue-400' : isDone ? 'text-emerald-400' : 'text-gray-600'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-gray-700'}`} />
          )}
        </div>
      )
    })}
  </div>
)

// ─── DNS Record Row ────────────────────────────────────────────────────────
const DnsRow = ({ record, copiedKey, onCopy }) => {
  const typeColors = {
    A: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    CNAME: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    TXT: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  }
  return (
    <div className="rounded-lg border border-gray-700 bg-dark-800/60 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${typeColors[record.type] || 'bg-gray-700 text-gray-300'}`}>
          {record.type}
        </span>
        {record.missingPlatformTarget && (
          <span className="text-amber-500 text-xs flex items-center gap-1">
            <AlertTriangle size={12} /> Server IP not configured
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-gray-500 mb-1">Host / Name</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-dark-700 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 font-mono truncate block">
              {record.host || record.name}
            </code>
            <button onClick={() => onCopy(`h-${record.type}`, record.host || record.name)}
              className={`shrink-0 p-1.5 rounded text-xs transition-colors ${copiedKey === `h-${record.type}` ? 'bg-emerald-600 text-white' : 'bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500'}`}>
              {copiedKey === `h-${record.type}` ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Value / Points to</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-dark-700 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 font-mono truncate block">
              {record.value || '—'}
            </code>
            {record.value && (
              <button onClick={() => onCopy(`v-${record.type}`, record.value)}
                className={`shrink-0 p-1.5 rounded text-xs transition-colors ${copiedKey === `v-${record.type}` ? 'bg-emerald-600 text-white' : 'bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500'}`}>
                {copiedKey === `v-${record.type}` ? <Check size={12} /> : <Copy size={12} />}
              </button>
            )}
          </div>
        </div>
      </div>
      {record.hint && <p className="text-gray-600 text-xs">{record.hint}</p>}
    </div>
  )
}

// ─── Status Badge ──────────────────────────────────────────────────────────
const StatusBadge = ({ status, ssl_status }) => {
  const cfg = {
    pending_dns: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: <Clock size={13} />, label: 'Pending DNS' },
    dns_mismatch: { color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: <XCircle size={13} />, label: 'DNS Mismatch' },
    connected: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: <CheckCircle2 size={13} />, label: 'Connected' }
  }
  const c = cfg[status] || cfg.pending_dns
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${c.color}`}>
        {c.icon} {c.label}
      </span>
      {status === 'connected' && (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${
          ssl_status === 'active'
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
            : 'text-gray-400 bg-gray-500/10 border-gray-600'
        }`}>
          <Server size={13} /> SSL: {ssl_status === 'active' ? 'Active' : 'Pending (configure on server)'}
        </span>
      )}
    </div>
  )
}

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
    brandName: ''
  })

  // ── Domain wizard state ──────────────────────────────────────────────────
  const [domainInput, setDomainInput] = useState('')
  const [domainConn, setDomainConn] = useState(null)
  const [domainPlatform, setDomainPlatform] = useState({ cnameTarget: null, ipTarget: null })
  const [domainLoading, setDomainLoading] = useState(false)
  const [domainMsg, setDomainMsg] = useState({ type: '', text: '' })
  const [copiedDns, setCopiedDns] = useState(null)
  const [copiedUserSignup, setCopiedUserSignup] = useState(false)
  const [copiedUserLogin, setCopiedUserLogin] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [lastFlags, setLastFlags] = useState(null)
  // ─────────────────────────────────────────────────────────────────────────

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
        brandName: parsed.brandName || ''
      })
      if (parsed.logo) setLogoPreview(`${API_BASE_URL}${parsed.logo}`)
    }
    fetchFullProfile()
    fetchDomainConnection()
  }, [])

  // ── Derive wizard step from connection state ───────────────────────────────
  useEffect(() => {
    if (!domainConn) { setWizardStep(1); return }
    if (domainConn.status === 'connected') { setWizardStep(5); return }
    if (domainConn.requiredRecords?.length > 0) { setWizardStep(2); return }
    setWizardStep(1)
  }, [domainConn])

  const fetchDomainConnection = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`${API_URL}/custom-domain/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setDomainConn(data.connection)
        setDomainPlatform(data.platformHints || {})
        if (data.connection?.hostname) setDomainInput(data.connection.hostname)
        else if (data.adminCustomDomain) setDomainInput(data.adminCustomDomain)
        if (data.connection?.lastSnapshot?.flags) setLastFlags(data.connection.lastSnapshot.flags)
      }
    } catch (e) {
      console.error('custom-domain/me', e)
    }
  }

  const patchAdminLocal = (patch) => {
    const raw = localStorage.getItem('adminUser')
    const prev = raw ? JSON.parse(raw) : {}
    const next = { ...prev, ...patch }
    localStorage.setItem('adminUser', JSON.stringify(next))
    setAdmin((a) => (a ? { ...a, ...patch } : a))
  }

  const startDomain = async () => {
    setDomainMsg({ type: '', text: '' })
    const trimmed = domainInput.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
    if (!trimmed || !trimmed.includes('.')) {
      setDomainMsg({ type: 'err', text: 'Please enter a valid domain name (e.g. trade.yourbrand.com)' })
      return
    }
    setDomainLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`${API_URL}/custom-domain/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ domain: trimmed })
      })
      const data = await res.json()
      if (data.success) {
        setDomainConn(data.connection)
        setDomainPlatform(data.platformHints || {})
        setDomainMsg({ type: 'ok', text: 'DNS records generated! Add them in your domain registrar, then continue.' })
        setWizardStep(2)
      } else {
        setDomainMsg({ type: 'err', text: data.message || 'Failed to start setup' })
      }
    } catch (e) {
      setDomainMsg({ type: 'err', text: 'Network error. Please check your connection.' })
    }
    setDomainLoading(false)
  }

  const refreshDomainDns = async () => {
    setDomainMsg({ type: '', text: '' })
    setDomainLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`${API_URL}/custom-domain/refresh-dns`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setDomainConn(data.connection)
        setDomainPlatform(data.platformHints || {})
        // FIX: flags are at top-level data.flags OR inside lastSnapshot
        const flags = data.flags || data.connection?.lastSnapshot?.flags
        setLastFlags(flags)
        if (flags?.fullyOk) {
          setDomainMsg({ type: 'ok', text: '✅ DNS looks correct! Click "Verify & Connect" to finalize.' })
          setWizardStep(4)
        } else {
          const missing = []
          if (!flags?.txtOk) missing.push('TXT record')
          if (flags?.hasRoutingRule && !flags?.routingOk) missing.push('A/CNAME record')
          setDomainMsg({ type: 'warn', text: `⏳ Still waiting for: ${missing.join(', ')}. DNS propagation can take up to 24 hours.` })
          setWizardStep(4)
        }
      } else {
        setDomainMsg({ type: 'err', text: data.message || 'DNS check failed' })
      }
    } catch (e) {
      setDomainMsg({ type: 'err', text: 'Network error. Please check your connection.' })
    }
    setDomainLoading(false)
  }

  const verifyDomain = async () => {
    setDomainMsg({ type: '', text: '' })
    setDomainLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`${API_URL}/custom-domain/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        patchAdminLocal({ customDomain: data.admin?.customDomain })
        setDomainConn(data.connection)
        setLastFlags(data.flags || data.connection?.lastSnapshot?.flags)
        setDomainMsg({ type: 'ok', text: data.message || 'Domain connected successfully!' })
        setWizardStep(5)
        fetchFullProfile()
      } else {
        if (data.connection) setDomainConn(data.connection)
        if (data.flags) setLastFlags(data.flags)
        setDomainMsg({ type: 'err', text: data.message || 'Verification failed' })
      }
    } catch (e) {
      setDomainMsg({ type: 'err', text: 'Network error. Please check your connection.' })
    }
    setDomainLoading(false)
  }

  const disconnectDomain = async () => {
    if (!window.confirm('Remove this custom domain from your account?')) return
    setDomainLoading(true)
    setDomainMsg({ type: '', text: '' })
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`${API_URL}/custom-domain/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        patchAdminLocal({ customDomain: null })
        setDomainConn(null)
        setDomainInput('')
        setLastFlags(null)
        setWizardStep(1)
        setDomainMsg({ type: 'ok', text: 'Custom domain removed successfully.' })
        fetchFullProfile()
      } else {
        setDomainMsg({ type: 'err', text: data.message || 'Failed to disconnect' })
      }
    } catch (e) {
      setDomainMsg({ type: 'err', text: 'Network error. Please check your connection.' })
    }
    setDomainLoading(false)
  }

  const copyDns = (key, text) => {
    navigator.clipboard.writeText(text)
    setCopiedDns(key)
    setTimeout(() => setCopiedDns(null), 2000)
  }

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
          brandName: a.brandName || ''
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          brandName: formData.brandName
        })
      })
      const data = await res.json()

      if (data.success) {
        const updatedAdmin = { 
          ...admin, 
          firstName: formData.firstName, 
          lastName: formData.lastName, 
          phone: formData.phone,
          brandName: formData.brandName,
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }

  // ── Derived domain values ────────────────────────────────────────────────
  const wizardConnected = domainConn?.status === 'connected'
  const legacyDomainOnly = !!(admin?.customDomain) && !domainConn
  const connectedHostname = domainConn?.hostname || admin?.customDomain || ''
  const snapFlags = lastFlags || domainConn?.lastSnapshot?.flags || null

  const normalizeHostInput = (s) => {
    if (!s || typeof s !== 'string') return ''
    return s.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0].replace(/\.$/, '')
  }

  const displayHostForUsers = (domainConn?.hostname || admin?.customDomain || normalizeHostInput(domainInput) || '').trim()
  const userLinksAreLive = !!(admin?.customDomain || wizardConnected)
  const userSignupUrl = displayHostForUsers
    ? `https://${displayHostForUsers}/user/signup${admin?.referralCode ? `?ref=${encodeURIComponent(admin.referralCode)}` : ''}`
    : ''
  const userLoginUrl = displayHostForUsers ? `https://${displayHostForUsers}/user/login` : ''

  // Provider info
  const providerName = domainConn?.detectedProvider || ''
  const providerInfo = PROVIDER_INSTRUCTIONS[providerName] || null

  // Build instructions substituting actual values
  const ipTarget = domainPlatform?.ipTarget || ''
  const txtRecord = domainConn?.requiredRecords?.find(r => r.type === 'TXT')?.value || ''
  const getInstructions = () => {
    const template = (providerInfo?.steps || DEFAULT_INSTRUCTIONS)
    return template.map(s => s.replace('{IP}', ipTarget || 'YOUR_SERVER_IP').replace('{TXT}', txtRecord || 'your-txt-value'))
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


                {/* ═══════════════════════════════════════════════════════════ */}
                {/* CUSTOM DOMAIN — SHOPIFY-STYLE WIZARD                       */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <div className="rounded-xl border border-gray-700 bg-gradient-to-br from-dark-800 to-dark-700/50 p-5 space-y-5 mt-4">
                  {/* Header */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-white font-semibold text-base">
                        <Globe size={18} className="text-blue-400" />
                        Connect Custom Domain
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Point your domain to this platform — like Shopify does
                      </p>
                    </div>
                    {domainConn && (
                      <StatusBadge status={domainConn.status} ssl_status={domainConn.ssl_status} />
                    )}
                  </div>

                  {/* Step Progress Bar */}
                  <StepBar current={wizardStep} />

                  {/* Server IP warning */}
                  {(!domainPlatform?.cnameTarget && !domainPlatform?.ipTarget) && (
                    <div className="flex items-start gap-2 text-amber-400/90 bg-amber-500/8 border border-amber-500/20 rounded-lg p-3 text-xs">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <span>
                        <strong>Dev Mode:</strong> Server IP/CNAME not configured in backend .env (set <code className="font-mono">CUSTOM_DOMAIN_TARGET_IP</code> or <code className="font-mono">CUSTOM_DOMAIN_CNAME_TARGET</code>). Only TXT ownership check runs until then.
                      </span>
                    </div>
                  )}

                  {/* ── STEP 5: CONNECTED ─────────────────────────────────── */}
                  {wizardConnected && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                        <CheckCircle2 size={28} className="text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-emerald-400 font-semibold">Domain Connected!</div>
                          <div className="text-gray-400 text-sm font-mono">{connectedHostname}</div>
                          <div className="text-gray-500 text-xs mt-0.5">
                            {domainConn?.connectedAt && `Connected on ${new Date(domainConn.connectedAt).toLocaleDateString()}`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={disconnectDomain}
                          disabled={domainLoading}
                          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs hover:bg-red-500/25 border border-red-500/20 disabled:opacity-50"
                        >
                          <Unlink size={13} /> Disconnect
                        </button>
                      </div>

                      {/* SSL Note */}
                      {domainConn?.ssl_status !== 'active' && (
                        <div className="flex items-start gap-2 bg-blue-500/8 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300/80">
                          <Server size={14} className="shrink-0 mt-0.5" />
                          <span>
                            <strong>Next: Enable SSL (HTTPS)</strong> — Configure Nginx + Certbot on your server to add SSL for <code className="font-mono">{connectedHostname}</code>. See your <code className="font-mono">DEPLOYMENT.md</code> for instructions.
                          </span>
                        </div>
                      )}

                      {/* User links */}
                      {userSignupUrl && (
                        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 space-y-2">
                          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                            <Link size={15} /> Share with your users
                          </div>
                          {[['Signup', userSignupUrl, copiedUserSignup, setCopiedUserSignup],
                            ['Login', userLoginUrl, copiedUserLogin, setCopiedUserLogin]].map(([label, url, isCopied, setter]) => (
                            <div key={label} className="flex items-center gap-2">
                              <span className="text-gray-500 text-xs w-14 shrink-0">{label}</span>
                              <input readOnly value={url} className="flex-1 min-w-0 bg-dark-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-300 font-mono truncate" />
                              <button type="button" onClick={() => copyLink(url, setter)}
                                className={`shrink-0 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${isCopied ? 'bg-emerald-600 text-white' : 'bg-dark-600 border border-gray-700 text-gray-300 hover:text-white'}`}>
                                {isCopied ? <Check size={13} /> : <Copy size={13} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── STEPS 1-4: SETUP WIZARD ───────────────────────────── */}
                  {!wizardConnected && (
                    <div className="space-y-4">
                      {/* Legacy domain notice */}
                      {legacyDomainOnly && (
                        <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 p-3 flex items-start gap-2">
                          <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-amber-300 text-sm font-medium">Domain on file: {admin.customDomain}</p>
                            <p className="text-amber-500/80 text-xs mt-0.5">Run the guided setup below to verify DNS records for this domain.</p>
                          </div>
                          <button type="button" onClick={disconnectDomain} disabled={domainLoading}
                            className="shrink-0 px-2 py-1 rounded bg-red-500/15 text-red-400 text-xs hover:bg-red-500/25 border border-red-500/20 disabled:opacity-50">
                            Remove
                          </button>
                        </div>
                      )}

                      {/* STEP 1: Enter domain */}
                      <div>
                        <label className="block text-xs text-gray-400 font-medium mb-1.5">
                          Step 1 — Enter your domain name
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative flex-1">
                            <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                              type="text"
                              value={domainInput}
                              onChange={(e) => setDomainInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && !domainLoading && domainInput.trim() && startDomain()}
                              disabled={domainLoading}
                              className="w-full bg-dark-800 border border-gray-600 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 font-mono"
                              placeholder="trade.yourbrand.com"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={startDomain}
                            disabled={domainLoading || !domainInput.trim()}
                            className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors whitespace-nowrap"
                          >
                            {domainLoading ? <RefreshCw size={15} className="animate-spin inline" /> : null}
                            {' '}{domainConn ? 'Update' : 'Continue'}
                          </button>
                        </div>
                        {domainConn?.detectedProvider && domainConn.detectedProvider !== 'Unknown' && (
                          <p className="text-blue-400 text-xs mt-1.5 flex items-center gap-1">
                            <ShieldCheck size={12} /> Detected registrar: <strong>{domainConn.detectedProvider}</strong>
                            {domainConn.nameservers?.length > 0 && ` (${domainConn.nameservers.slice(0, 2).join(', ')})`}
                          </p>
                        )}
                      </div>

                      {/* STEP 2 + 3: DNS Records + Instructions */}
                      {domainConn?.requiredRecords?.length > 0 && (
                        <div className="space-y-4">
                          {/* DNS Records */}
                          <div>
                            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                              <Server size={12} /> Step 2 — Add these DNS records to your domain
                            </div>
                            <div className="space-y-2">
                              {domainConn.requiredRecords.map((r, i) => (
                                <DnsRow key={i} record={r} copiedKey={copiedDns} onCopy={copyDns} />
                              ))}
                            </div>
                          </div>

                          {/* TTL hint */}
                          <div className="flex items-start gap-2 bg-dark-800/70 border border-gray-700/60 rounded-lg p-3 text-xs text-gray-400">
                            <Clock size={13} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-amber-400 font-medium">DNS Propagation Warning</span>: After adding records, changes can take <strong>5 minutes to 24 hours</strong> to propagate worldwide. Click "Check DNS" to see current status.
                            </div>
                          </div>

                          {/* Step 3: Provider-specific instructions */}
                          <div>
                            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                              <Info size={12} /> Step 3 — How to add records
                              {providerName && providerName !== 'Unknown' && (
                                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
                                  {providerName}
                                </span>
                              )}
                            </div>
                            <div className="rounded-lg border border-gray-700 bg-dark-800/50 p-3 space-y-1.5">
                              {getInstructions().map((step, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                                  <span className="shrink-0 w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold text-xs mt-0.5">{i + 1}</span>
                                  <span>{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* STEP 4: DNS Check */}
                          <div>
                            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                              <Wifi size={12} /> Step 4 — Verify DNS propagation
                            </div>

                            {/* Last DNS snapshot */}
                            {domainConn.lastSnapshot && (
                              <div className="rounded-lg border border-gray-700 bg-dark-800/50 p-3 mb-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Last checked: {new Date(domainConn.lastSnapshot.checkedAt).toLocaleTimeString()}</span>
                                  <div className="flex gap-3 text-xs">
                                    <span className={snapFlags?.routingOk ? 'text-emerald-400' : 'text-amber-400'}>
                                      {snapFlags?.routingOk ? '✅' : '⏳'} A/CNAME
                                    </span>
                                    <span className={snapFlags?.txtOk ? 'text-emerald-400' : 'text-amber-400'}>
                                      {snapFlags?.txtOk ? '✅' : '⏳'} TXT
                                    </span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs font-mono text-gray-500">
                                  <div>A: {(domainConn.lastSnapshot.aRecords || []).join(', ') || '—'}</div>
                                  <div>CNAME: {(domainConn.lastSnapshot.cnameRecords || []).join(', ') || '—'}</div>
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={refreshDomainDns} disabled={domainLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-dark-800 border border-gray-600 rounded-lg text-sm text-white hover:border-blue-500 disabled:opacity-50 transition-colors">
                                <RefreshCw size={15} className={domainLoading ? 'animate-spin' : ''} />
                                Check DNS
                              </button>
                              <button type="button" onClick={verifyDomain} disabled={domainLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors">
                                <ShieldCheck size={15} />
                                Verify &amp; Connect
                              </button>
                              <button type="button" onClick={disconnectDomain} disabled={domainLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-800 border border-gray-700 text-gray-400 text-sm hover:text-red-400 hover:border-red-500/30 disabled:opacity-50 transition-colors">
                                <Unlink size={14} /> Reset
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status message */}
                  {domainMsg.text && (
                    <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
                      domainMsg.type === 'ok' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400' :
                      domainMsg.type === 'warn' ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400' :
                      domainMsg.type === 'err' ? 'bg-red-500/10 border border-red-500/25 text-red-400' :
                      'bg-gray-700/30 text-gray-400'
                    }`}>
                      {domainMsg.type === 'ok' && <CheckCircle2 size={16} className="shrink-0 mt-0.5" />}
                      {domainMsg.type === 'warn' && <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                      {domainMsg.type === 'err' && <XCircle size={16} className="shrink-0 mt-0.5" />}
                      <span>{domainMsg.text}</span>
                    </div>
                  )}
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
