import { useState, useEffect } from 'react'
import { API_URL, API_BASE_URL } from '../config/api'
import defaultLogo from '../assets/suimfxLogo.png'

const LOGO_KEY = 'adminLogoUrl'
const BRAND_KEY = 'adminBrandName'

const useLogo = () => {
  const [logoImage, setLogoImage] = useState(() => {
    return localStorage.getItem(LOGO_KEY) || defaultLogo
  })

  const [brandName, setBrandName] = useState(() => {
    return localStorage.getItem(BRAND_KEY) || ''
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    // Always fetch from API to ensure branding is up-to-date
    fetch(`${API_URL}/auth/my-branding`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.branding && data.branding.logo) {
          const logoUrl = `${API_BASE_URL}${data.branding.logo}`
          localStorage.setItem(LOGO_KEY, logoUrl)
          localStorage.setItem(BRAND_KEY, data.branding.brandName || '')
          setLogoImage(logoUrl)
          setBrandName(data.branding.brandName || '')
        }
      })
      .catch(err => console.error('Failed to fetch branding:', err))
  }, [])

  return { logoImage, brandName }
}

// Reset cache on logout - call this when user logs out
export const resetLogoCache = () => {
  localStorage.removeItem(LOGO_KEY)
  localStorage.removeItem(BRAND_KEY)
}

export default useLogo
