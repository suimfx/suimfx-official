// Chart backed by the broker's OWN feed (suimfxDatafeed → /api/prices/bars for
// history + live LP price stream) via the vendored Advanced Charts library, so the
// chart price matches the trade panel's bid/ask. The old build used the public
// TradingView widget (OANDA/Binance/etc.), a different venue that showed a different
// price — that mismatch was the bug.
import { useEffect, useRef } from 'react'
import SuimfxDatafeed from '../services/suimfxDatafeed'

// Load the vendored charting library once (served from /public/charting_library).
let _libPromise = null
function loadLibrary() {
  if (window.TradingView && window.TradingView.widget) return Promise.resolve()
  if (_libPromise) return _libPromise
  _libPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = '/charting_library/charting_library.standalone.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load charting_library'))
    document.head.appendChild(s)
  })
  return _libPromise
}

const TradingViewChart = ({ symbol, interval = '5', isDarkMode = true, containerId, style }) => {
  const chartId = containerId || 'tv_chart_container'
  const widgetRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    loadLibrary().then(() => {
      if (cancelled) return
      const el = document.getElementById(chartId)
      if (!window.TradingView || !window.TradingView.widget || !el) return
      el.innerHTML = ''

      const theme = isDarkMode ? 'dark' : 'light'
      const bg = isDarkMode ? '#0a0a0a' : '#ffffff'

      try {
        widgetRef.current = new window.TradingView.widget({
          symbol: (symbol || 'XAUUSD').toUpperCase(),
          interval: String(interval),
          container: el,
          library_path: '/charting_library/',
          datafeed: new SuimfxDatafeed(),
          locale: 'en',
          timezone: 'Etc/UTC',
          theme,
          autosize: true,
          fullscreen: false,
          toolbar_bg: bg,
          disabled_features: ['header_symbol_search', 'symbol_search_hot_key', 'header_compare'],
          overrides: {
            'paneProperties.background': bg,
            'paneProperties.backgroundType': 'solid',
          },
          loading_screen: { backgroundColor: bg },
        })
      } catch (error) {
        console.error('[TradingViewChart] Error creating widget:', error)
      }
    }).catch(err => console.error('[TradingViewChart]', err))

    return () => {
      cancelled = true
      // remove() is only valid once the widget is ready; guard it.
      try { widgetRef.current?.remove?.() } catch { /* not ready yet */ }
      widgetRef.current = null
      const el = document.getElementById(chartId)
      if (el) el.innerHTML = ''
    }
  }, [symbol, interval, isDarkMode, chartId])

  return (
    <div
      id={chartId}
      style={style || { width: '100%', height: '100%' }}
    />
  )
}

export default TradingViewChart
