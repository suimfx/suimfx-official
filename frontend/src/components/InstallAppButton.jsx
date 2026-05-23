import { useEffect, useState } from 'react'
import { Download, X, Share, Plus, MoreVertical } from 'lucide-react'

/**
 * InstallAppButton — shows a "Download App" button that installs the PWA.
 *
 * Cross-browser behavior:
 *   - Chrome / Edge / Samsung (Android & desktop): uses native `beforeinstallprompt`
 *   - iOS Safari: shows a modal with "Tap Share → Add to Home Screen" instructions
 *     (iOS Safari does NOT support beforeinstallprompt — manual flow is the only option)
 *   - Firefox / in-app browsers (WhatsApp, Instagram): shows "Open in Chrome/Safari" hint
 *
 * Per-admin branding: when brandName/logoUrl are passed, generates a runtime manifest
 * with that admin's name + logo and swaps the page's <link rel="manifest"> to it.
 */
const InstallAppButton = ({ brandName, logoUrl, className = '' }) => {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)

  // Detect platform — used to decide which install flow to show
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
  const isAndroid = /Android/.test(ua)
  const isInAppBrowser = /FBAN|FBAV|Instagram|Line|WhatsApp|MicroMessenger/i.test(ua)
  const isSafariOnIOS = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)

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
      // Open to / (root). App will route to dashboard if logged-in, login if not.
      // Was '/dashboard' previously — broke for newly-installed users who aren't logged in yet.
      start_url: '/',
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

  // Detect install state + capture native install prompt
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
      setShowHelpModal(false)
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const handleClick = async () => {
    // If native prompt available, use it (Chrome/Edge/Samsung)
    if (installPrompt) {
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
      return
    }

    // No native prompt — show platform-specific instructions modal
    setShowHelpModal(true)
  }

  // Don't render anything once installed
  if (installed) return null

  const label = brandName ? `Download ${brandName} App` : 'Download App'

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ||
          'w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl border border-emerald-500/30 text-emerald-400 font-medium hover:bg-emerald-500/10 transition-all text-sm sm:text-base mb-4'
        }
      >
        <Download size={18} />
        {label}
      </button>

      {showHelpModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">
                Install {brandName || 'App'}
              </h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {isInAppBrowser ? (
              <div className="text-slate-300 text-sm space-y-3">
                <p className="text-amber-400 font-medium">
                  You're in a chat/social app browser.
                </p>
                <p>
                  Tap the <strong>three-dot menu</strong> at the top right, then choose{' '}
                  <strong>"Open in Chrome"</strong> (Android) or <strong>"Open in Safari"</strong>{' '}
                  (iPhone). Then come back and tap the install button again.
                </p>
              </div>
            ) : isSafariOnIOS ? (
              <div className="text-slate-300 text-sm space-y-4">
                <p>Install this app on your iPhone in 3 quick steps:</p>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="bg-emerald-500/20 text-emerald-400 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      1
                    </span>
                    <span>
                      Tap the <strong>Share</strong> icon{' '}
                      <Share size={14} className="inline -mt-1" /> at the bottom of Safari
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-emerald-500/20 text-emerald-400 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      2
                    </span>
                    <span>
                      Scroll down and tap <strong>"Add to Home Screen"</strong>{' '}
                      <Plus size={14} className="inline -mt-1" />
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-emerald-500/20 text-emerald-400 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      3
                    </span>
                    <span>
                      Tap <strong>"Add"</strong> at the top right
                    </span>
                  </li>
                </ol>
              </div>
            ) : isIOS ? (
              <div className="text-slate-300 text-sm space-y-3">
                <p className="text-amber-400 font-medium">
                  Please open this page in <strong>Safari</strong> first.
                </p>
                <p>
                  Chrome and other browsers on iPhone cannot install web apps. Copy this page's
                  URL, open Safari, paste the URL, then tap the install button.
                </p>
              </div>
            ) : isAndroid ? (
              <div className="text-slate-300 text-sm space-y-3">
                <p>To install the app:</p>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="bg-emerald-500/20 text-emerald-400 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      1
                    </span>
                    <span>
                      Tap the <strong>three-dot menu</strong>{' '}
                      <MoreVertical size={14} className="inline -mt-1" /> at the top right
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-emerald-500/20 text-emerald-400 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      2
                    </span>
                    <span>
                      Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>
                    </span>
                  </li>
                </ol>
                <p className="text-slate-500 text-xs mt-3">
                  Don't see the option? Make sure you're using Chrome — Firefox and other browsers
                  on Android don't support app install.
                </p>
              </div>
            ) : (
              <div className="text-slate-300 text-sm space-y-3">
                <p>To install the app on your computer:</p>
                <ol className="space-y-2">
                  <li>
                    1. Open this page in <strong>Chrome</strong> or <strong>Edge</strong>
                  </li>
                  <li>
                    2. Look for the install icon{' '}
                    <Download size={14} className="inline -mt-1" /> in the address bar
                  </li>
                  <li>3. Click it and confirm "Install"</li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default InstallAppButton
