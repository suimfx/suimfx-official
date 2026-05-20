import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

/**
 * InstallAppButton — shows a "Download App" button that triggers PWA install.
 *
 * Per-admin branding: when brandName/logoUrl are passed in, this component
 * generates a runtime manifest blob with that admin's name + logo and swaps
 * the page's <link rel="manifest"> to point at it. So the installed app on the
 * user's device shows the admin's name + icon (not the default Suimfx ones).
 *
 * The button only appears when:
 *   - The browser fires `beforeinstallprompt` (i.e., PWA criteria met)
 *   - The app is not already running standalone (i.e., not already installed)
 */
const InstallAppButton = ({ brandName, logoUrl, className = '' }) => {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)

  // Inject dynamic manifest with this admin's branding
  useEffect(() => {
    const linkEl = document.getElementById('pwa-manifest')
    if (!linkEl) return

    // If no brand info provided, leave the default /manifest.json in place
    if (!brandName && !logoUrl) return

    const name = (brandName && brandName.trim()) || 'Suimfx'
    const shortName = name.length > 12 ? name.slice(0, 12) : name

    const icon = logoUrl || '/suimfxLogo.png'

    const manifest = {
      name,
      short_name: shortName,
      description: `${name} — Trading platform`,
      start_url: '/dashboard',
      scope: '/',
      display: 'standalone',
      orientation: 'any',
      background_color: '#020617',
      theme_color: '#020617',
      icons: [
        { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: icon, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: icon, sizes: '192x192', type: 'image/png', purpose: 'maskable' }
      ]
    }

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
    const url = URL.createObjectURL(blob)
    const previousHref = linkEl.href
    linkEl.href = url

    return () => {
      // Restore default and free blob URL on unmount/branding change
      linkEl.href = previousHref
      URL.revokeObjectURL(url)
    }
  }, [brandName, logoUrl])

  // Detect install state + capture install prompt
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setInstalled(true)
    }

    const handlePrompt = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    try {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setInstalled(true)
      }
    } catch {
      // user dismissed — ignore
    }
    setInstallPrompt(null)
  }

  // Don't render anything if already installed or prompt not available
  if (installed) return null
  if (!installPrompt) return null

  const label = brandName ? `Download ${brandName} App` : 'Download App'

  return (
    <button
      type="button"
      onClick={handleInstall}
      className={
        className ||
        'w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl border border-emerald-500/30 text-emerald-400 font-medium hover:bg-emerald-500/10 transition-all text-sm sm:text-base mb-4'
      }
    >
      <Download size={18} />
      {label}
    </button>
  )
}

export default InstallAppButton
