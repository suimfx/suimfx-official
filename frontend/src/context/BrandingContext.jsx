import { createContext, useContext, useState, useEffect } from 'react'
import { API_URL, API_BASE_URL } from '../config/api'
import defaultLogo from '../assets/suimfxLogo.png'

const BrandingContext = createContext()

export const useBranding = () => {
  const context = useContext(BrandingContext)
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider')
  }
  return context
}

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(null)
  const [brandingLoaded, setBrandingLoaded] = useState(false)

  useEffect(() => {
    detectBranding()
  }, [])

  const detectBranding = async () => {
    try {
      const hostname = window.location.hostname

      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // On localhost: fetch branding from API if user is logged in
        const token = localStorage.getItem('token')
        console.log('[BrandingContext] localhost detected, token:', token ? 'YES' : 'NO')
        if (token) {
          try {
            const url = `${API_URL}/auth/my-branding`
            console.log('[BrandingContext] Fetching:', url)
            const res = await fetch(url, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            console.log('[BrandingContext] API response:', JSON.stringify(data))
            if (data.success && data.branding && data.branding.logo) {
              const brandObj = {
                brandName: data.branding.brandName || '',
                logo: `${API_BASE_URL}${data.branding.logo}`,
                adminSlug: data.branding.urlSlug || ''
              }
              console.log('[BrandingContext] Setting branding:', JSON.stringify(brandObj))
              setBranding(brandObj)
              setBrandingLoaded(true)
              return
            }
          } catch (e) {
            console.error('[BrandingContext] Branding API fetch failed:', e)
          }
        }
        setBrandingLoaded(true)
        return
      }

      // Production: detect branding via custom domain
      const res = await fetch(`${API_URL}/admin-mgmt/branding?domain=${hostname}`)
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
      }
    } catch (error) {
      console.error('Branding detection failed:', error)
    }
    setBrandingLoaded(true)
  }

  const setBrandingFromSlug = (brandData) => {
    setBranding(brandData)
  }

  const clearBranding = () => {
    setBranding(null)
    localStorage.removeItem('adminSlug')
    localStorage.removeItem('adminId')
  }

  return (
    <BrandingContext.Provider value={{ branding, brandingLoaded, defaultLogo, setBrandingFromSlug, clearBranding }}>
      {children}
    </BrandingContext.Provider>
  )
}

export default BrandingContext
