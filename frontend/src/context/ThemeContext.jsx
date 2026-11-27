import { createContext, useContext, useState, useEffect } from 'react'
import { API_URL } from '../config/api'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Dark mode colors
const darkColors = {
  bgPrimary: '#000000',
  bgSecondary: '#0D0D0D',
  bgCard: '#1A1A1A',
  bgHover: '#262626',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#374151',
  borderLight: '#4B5563',
}

// Light mode colors
const lightColors = {
  bgPrimary: '#F9FAFB',
  bgSecondary: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgHover: '#F3F4F6',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#D1D5DB',
}

// The public pages (landing, login, signup) paint from semantic tokens whose
// defaults in index.css ARE the slate palette those pages were written in. A
// broker still on the platform's theme therefore renders exactly as before;
// only a tenant that set up a theme of its own repaints them. Three surfaces,
// four ink levels and three hairlines is all those pages use.
const UI_TOKENS = {
  '--ui-surface': 'bgPrimary',
  '--ui-surface-2': 'bgSecondary',
  '--ui-surface-3': 'bgHover',
  '--ui-surface-4': 'bgCard',
  '--ui-ink': 'textPrimary',
  '--ui-ink-1': 'textPrimary',
  '--ui-ink-2': 'textSecondary',
  '--ui-ink-3': 'textMuted',
  '--ui-hair': 'border',
  '--ui-hair-soft': 'border',
  '--ui-hair-strong': 'borderLight',
  '--ui-brand': 'primary',
  '--ui-brand-2': 'primaryHover',
  '--ui-brand-soft': 'accent',
  '--ui-accent-a': 'success',
  '--ui-accent-b': 'secondary',
  '--ui-accent-c': 'warning',
  '--ui-danger': 'error',
}

// Tailwind composes these with <alpha-value>, so they have to be channels
// ("37 99 235") rather than hex, or bg-surface/50 emits invalid CSS.
const rgbChannels = (hex) => {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || '').trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

/** Perceived brightness, so a white-ish page background can be told from a
 *  dark one. Weighted the usual way — green reads far brighter than blue. */
const isLightHex = (hex) => {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || '').trim())
  if (!m) return false
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved !== null ? JSON.parse(saved) : true // Default to dark mode
  })

  const fetchTheme = async () => {
    try {
      const res = await fetch(`${API_URL}/theme/active`)
      const data = await res.json()
      if (data.success && data.theme) {
        setTheme(data.theme)
        // adminId is null on the platform default that brokers fall back to.
        applyTheme(data.theme.colors, Boolean(data.theme.adminId))
      }
    } catch (error) {
      console.error('Error fetching theme:', error)
    }
    setLoading(false)
  }

  const applyTheme = (colors, tenantOwned = false) => {
    if (!colors) return
    
    const root = document.documentElement
    
    // Only a tenant's own theme drives the public pages. Falling back to the
    // platform default must leave them on index.css's defaults, otherwise
    // every broker's landing page would follow the operator's colours.
    if (tenantOwned) {
      Object.entries(UI_TOKENS).forEach(([cssVar, key]) => {
        const channels = rgbChannels(colors[key])
        if (channels) root.style.setProperty(cssVar, channels)
      })

      // The hero glows are a wash, not a fill, so they follow the brand at a
      // tenth of its strength and the grid is ruled in the ink colour.
      const wash = (hex, alpha) => {
        const channels = rgbChannels(hex)
        return channels ? `rgb(${channels} / ${alpha})` : null
      }
      const glows = {
        '--ui-glow-1': wash(colors.primary, 0.1),
        '--ui-glow-2': wash(colors.accent, 0.1),
        '--ui-grid': wash(colors.textPrimary, 0.05),
      }
      Object.entries(glows).forEach(([cssVar, value]) => {
        if (value) root.style.setProperty(cssVar, value)
      })
    }

    // Most screens still hardcode text-white and text-gray-300/400 over
    // backgrounds that DO follow the theme (bg-dark-* is bound to --theme-bg*).
    // Give a tenant a white page and the text stayed white on it, so whole
    // screens went blank. index.css carries a shim keyed on this flag; it is a
    // bridge until those pages use the ink tokens, and it costs dark themes
    // nothing because the attribute is simply absent for them.
    if (isLightHex(colors.bgPrimary)) {
      root.setAttribute('data-brand-light', '')
    } else {
      root.removeAttribute('data-brand-light')
    }

    // Apply CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(`--theme-${key}`, value)
      }
    })

    // Also set some commonly used Tailwind-compatible classes
    root.style.setProperty('--color-primary', colors.primary || '#3B82F6')
    root.style.setProperty('--color-secondary', colors.secondary || '#10B981')
    root.style.setProperty('--color-accent', colors.accent || '#F59E0B')
    root.style.setProperty('--color-bg-primary', colors.bgPrimary || '#000000')
    root.style.setProperty('--color-bg-secondary', colors.bgSecondary || '#0D0D0D')
    root.style.setProperty('--color-bg-card', colors.bgCard || '#1A1A1A')
    root.style.setProperty('--color-text-primary', colors.textPrimary || '#FFFFFF')
    root.style.setProperty('--color-text-secondary', colors.textSecondary || '#9CA3AF')
    root.style.setProperty('--color-border', colors.border || '#374151')
    root.style.setProperty('--color-success', colors.success || '#10B981')
    root.style.setProperty('--color-error', colors.error || '#EF4444')
    root.style.setProperty('--color-buy', colors.buyColor || '#3B82F6')
    root.style.setProperty('--color-sell', colors.sellColor || '#EF4444')
    root.style.setProperty('--color-profit', colors.profitColor || '#10B981')
    root.style.setProperty('--color-loss', colors.lossColor || '#EF4444')
  }

  // Apply dark/light mode classes
  useEffect(() => {
    const root = document.documentElement
    const modeColors = isDarkMode ? darkColors : lightColors
    
    // Apply mode-specific colors
    Object.entries(modeColors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })
    
    // Toggle dark class on html element
    if (isDarkMode) {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
    
    // Save preference
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
  }, [isDarkMode])

  useEffect(() => {
    fetchTheme()
    
    // Refresh theme every 30 seconds to catch admin changes
    const interval = setInterval(fetchTheme, 30000)
    return () => clearInterval(interval)
  }, [])

  const refreshTheme = () => {
    fetchTheme()
  }

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev)
  }

  // Get current mode colors
  const modeColors = isDarkMode ? darkColors : lightColors

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      loading, 
      refreshTheme, 
      applyTheme, 
      isDarkMode, 
      toggleDarkMode,
      modeColors,
      darkColors,
      lightColors
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeContext
