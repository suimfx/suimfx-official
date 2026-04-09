// TradingView Advanced Chart Component using self-hosted charting library
import { useEffect, useRef } from 'react'
import SuimfxDatafeed from '../services/suimfxDatafeed'
import priceStreamService from '../services/priceStream'

// Global script loading state to prevent duplicate <script> tags in 4-charts mode
let _scriptLoadPromise = null
function loadTradingViewScript() {
  if (window.TradingView) return Promise.resolve()
  if (_scriptLoadPromise) return _scriptLoadPromise
  _scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/charting_library/charting_library.standalone.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load charting_library.standalone.js'))
    document.head.appendChild(script)
  })
  return _scriptLoadPromise
}

const TradingViewChart = ({ symbol, interval = '5', isDarkMode = true, containerId, style }) => {
  const widgetRef = useRef(null)
  const datafeedRef = useRef(null)
  const mountedRef = useRef(true)
  const chartId = containerId || 'tv_chart_container'

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false

    const createWidget = () => {
      if (cancelled || !mountedRef.current) return
      const el = document.getElementById(chartId)
      if (!window.TradingView || !el) return

      if (widgetRef.current) {
        try { widgetRef.current.remove() } catch (_) {}
        widgetRef.current = null
      }
      if (datafeedRef.current) {
        datafeedRef.current.destroy()
        datafeedRef.current = null
      }

      const datafeed = new SuimfxDatafeed()
      datafeedRef.current = datafeed

      const chartSymbol = symbol ? symbol.replace('SUIMFX:', '').toUpperCase() : 'XAUUSD'

      try {
        const widget = new window.TradingView.widget({
          symbol: chartSymbol,
          interval: interval,
          container: chartId,
          datafeed: datafeed,
          library_path: '/charting_library/',
          locale: 'en',
          fullscreen: false,
          autosize: true,
          theme: isDarkMode ? 'dark' : 'light',
          timezone: 'Etc/UTC',
          debug: false,

          disabled_features: [
            'use_localstorage_for_settings',
            'header_symbol_search',
            'header_compare',
            'display_market_status',
            'popup_hints',
          ],
          enabled_features: [
            'study_templates',
            'hide_left_toolbar_by_default',
          ],

          overrides: {
            'mainSeriesProperties.candleStyle.upColor': '#26a69a',
            'mainSeriesProperties.candleStyle.downColor': '#ef5350',
            'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
            'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
            'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350',
            'paneProperties.background': isDarkMode ? '#0d0d0d' : '#ffffff',
            'paneProperties.backgroundType': 'solid',
            'scalesProperties.textColor': isDarkMode ? '#aaaaaa' : '#555555',
          },

          loading_screen: {
            backgroundColor: isDarkMode ? '#0d0d0d' : '#ffffff',
            foregroundColor: '#2962FF',
          },

          custom_css_url: '',
        })

        widgetRef.current = widget

        widget.onChartReady(() => {
          if (cancelled) return
          const chart = widget.activeChart()
          try {
            const price = priceStreamService.getPrice(chartSymbol)
            if (price && price.bid && price.ask) {
              chart.createShape(
                { price: price.bid },
                {
                  shape: 'horizontal_line',
                  overrides: { linecolor: '#2196F3', linewidth: 1, linestyle: 2 },
                  text: `Bid: ${price.bid}`,
                }
              )
              chart.createShape(
                { price: price.ask },
                {
                  shape: 'horizontal_line',
                  overrides: { linecolor: '#FF5722', linewidth: 1, linestyle: 2 },
                  text: `Ask: ${price.ask}`,
                }
              )
            }
          } catch (_) {
            // Shapes are optional enhancement
          }
        })
      } catch (error) {
        console.error('[TradingViewChart] Error creating widget:', error)
      }
    }

    loadTradingViewScript()
      .then(createWidget)
      .catch(err => console.error('[TradingViewChart]', err))

    return () => {
      cancelled = true
      mountedRef.current = false
      if (widgetRef.current) {
        try { widgetRef.current.remove() } catch (_) {}
        widgetRef.current = null
      }
      if (datafeedRef.current) {
        datafeedRef.current.destroy()
        datafeedRef.current = null
      }
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
