import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { API_URL, API_BASE_URL } from '../config/api'
import defaultLogo from '../assets/suimfxLogo.png'
import { buildWlSessionHash, originForCustomDomain } from '../utils/wlSessionHandoff'

const BrandingContext = createContext()

const DEFAULT_TITLE = 'Suimfx'
const DEFAULT_FAVICON = '/suimfxLogo.png'

export const useBranding = () => {
  const context = useContext(BrandingContext)
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider')
  }
  return context
}

function normalizeHost (h) {
  if (!h) return ''
  return h.replace(/^www\./i, '').toLowerCase()
}

/** Main platform hosts — white-label users with a custom domain are redirected off these. */
function isPlatformHost (hostname) {
  const h = hostname.toLowerCase()
  return h === 'suimfx.com' || h.endsWith('.suimfx.com')
}

/** Do not hard-redirect off platform while user is still on login/signup (avoids wrong URL before client navigate). */
function isUserAuthPath (pathname) {
  if (pathname.startsWith('/user/login') || pathname.startsWith('/user/signup') || pathname.startsWith('/user/forgot-password')) {
    return true
  }
  if (/^\/[^/]+\/(login|signup)$/.test(pathname)) return true
  return false
}

async function fetchMyBrandingAsUser () {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const res = await fetch(`${API_URL}/auth/my-branding`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (!data.success || !data.branding) return null
    const b = data.branding
    if (!b.brandName && !b.logo) return null
    return {
      brandName: b.brandName || '',
      logo: b.logo ? `${API_BASE_URL}${b.logo}` : null,
      adminSlug: b.urlSlug || '',
      customDomain: b.customDomain || null
    }
  } catch {
    return null
  }
}

function applyFavicon (href) {
  const rels = ['icon', 'shortcut icon']
  rels.forEach((rel) => {
    let link = document.querySelector(`link[rel="${rel}"]`)
    if (!link) {
      link = document.createElement('link')
      link.rel = rel
      link.type = 'image/png'
      document.head.appendChild(link)
    }
    link.href = href
  })
}

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(null)
  const [brandingLoaded, setBrandingLoaded] = useState(false)

  const loadBranding = useCallback(async () => {
    try {
      const hostname = window.location.hostname

      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const mb = await fetchMyBrandingAsUser()
        setBranding(mb || null)
        return
      }

      const res = await fetch(`${API_URL}/admin-mgmt/branding?domain=${encodeURIComponent(hostname)}`)
      const data = await res.json()

      if (data.success && data.brand) {
        const brand = {
          brandName: data.brand.brandName,
          logo: data.brand.logo ? `${API_BASE_URL}${data.brand.logo}` : null,
          adminSlug: data.brand.urlSlug,
          adminId: data.brand.adminId,
          customDomain: data.brand.customDomain
        }
        setBranding(brand)
        localStorage.setItem('adminSlug', brand.adminSlug)
        localStorage.setItem('adminId', brand.adminId)
      } else if (isPlatformHost(hostname)) {
        const mb = await fetchMyBrandingAsUser()
        setBranding(mb || null)
      } else {
        setBranding(null)
      }
    } catch (error) {
      console.error('Branding detection failed:', error)
      setBranding(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await loadBranding()
      if (!cancelled) setBrandingLoaded(true)
    })()
    return () => { cancelled = true }
  }, [loadBranding])

  /** Call after user login/signup so custom-domain redirect + title run with new token */
  const refreshBranding = useCallback(async () => {
    setBrandingLoaded(false)
    await loadBranding()
    setBrandingLoaded(true)
  }, [loadBranding])

  // Logged-in white-label users: leave *.suimfx.com and use their admin custom domain for all routes
  useEffect(() => {
    if (!brandingLoaded) return
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') return
    if (!isPlatformHost(hostname)) return
    const token = localStorage.getItem('token')
    if (!token) return
    if (window.location.pathname.startsWith('/admin')) return
    if (isUserAuthPath(window.location.pathname)) return

    const cd = branding?.customDomain?.trim()
    if (!cd) return
    if (normalizeHost(hostname) === normalizeHost(cd)) return

    const targetOrigin = originForCustomDomain(cd)
    if (!targetOrigin) return

    const wl = buildWlSessionHash()
    const url = `${targetOrigin}${window.location.pathname}${window.location.search}${wl}`
    window.location.replace(url)
  }, [brandingLoaded, branding])

  useEffect(() => {
    if (!brandingLoaded) return
    const name = (branding?.brandName || '').trim()
    if (name) {
      document.title = name
    } else if (branding && (branding.logo || branding.customDomain)) {
      document.title = 'Dashboard'
    } else {
      document.title = DEFAULT_TITLE
    }
    if (branding?.logo) {
      applyFavicon(branding.logo)
    } else {
      applyFavicon(DEFAULT_FAVICON)
    }
  }, [branding, brandingLoaded])

  const setBrandingFromSlug = (brandData) => {
    setBranding(brandData)
  }

  const clearBranding = () => {
    setBranding(null)
    localStorage.removeItem('adminSlug')
    localStorage.removeItem('adminId')
    document.title = DEFAULT_TITLE
    applyFavicon(DEFAULT_FAVICON)
  }

  return (
    <BrandingContext.Provider value={{ branding, brandingLoaded, defaultLogo, setBrandingFromSlug, clearBranding, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  )
}

export default BrandingContext
