// TradingView Chart Component using public TradingView widget (same as mobile APK)
import { useEffect, useRef } from 'react'

// Symbol mapping - identical to mobile APK
const getSymbolForTradingView = (symbol) => {
  const symbolMap = {
    // Forex & Metals - OANDA
    'EURUSD': 'OANDA:EURUSD', 'GBPUSD': 'OANDA:GBPUSD', 'USDJPY': 'OANDA:USDJPY',
    'USDCHF': 'OANDA:USDCHF', 'AUDUSD': 'OANDA:AUDUSD', 'NZDUSD': 'OANDA:NZDUSD',
    'USDCAD': 'OANDA:USDCAD', 'EURGBP': 'OANDA:EURGBP', 'EURJPY': 'OANDA:EURJPY',
    'GBPJPY': 'OANDA:GBPJPY', 'AUDJPY': 'OANDA:AUDJPY', 'NZDJPY': 'OANDA:NZDJPY',
    'EURAUD': 'OANDA:EURAUD', 'EURNZD': 'OANDA:EURNZD', 'EURCHF': 'OANDA:EURCHF',
    'GBPAUD': 'OANDA:GBPAUD', 'GBPNZD': 'OANDA:GBPNZD', 'GBPCHF': 'OANDA:GBPCHF',
    'GBPCAD': 'OANDA:GBPCAD', 'AUDNZD': 'OANDA:AUDNZD', 'AUDCAD': 'OANDA:AUDCAD',
    'AUDCHF': 'OANDA:AUDCHF', 'NZDCAD': 'OANDA:NZDCAD', 'NZDCHF': 'OANDA:NZDCHF',
    'CADCHF': 'OANDA:CADCHF', 'CADJPY': 'OANDA:CADJPY', 'CHFJPY': 'OANDA:CHFJPY',
    'EURCAD': 'OANDA:EURCAD',
    // Metals
    'XAUUSD': 'OANDA:XAUUSD', 'XAGUSD': 'OANDA:XAGUSD',
    'XPTUSD': 'OANDA:XPTUSD', 'XPDUSD': 'OANDA:XPDUSD',
    'XAUEUR': 'OANDA:XAUEUR', 'XAUAUD': 'OANDA:XAUAUD',
    'XAUGBP': 'OANDA:XAUGBP', 'XAUCHF': 'OANDA:XAUCHF',
    'XAUJPY': 'OANDA:XAUJPY', 'XAGEUR': 'OANDA:XAGEUR',
    // Crypto - COINBASE / BINANCE
    'BTCUSD': 'COINBASE:BTCUSD', 'ETHUSD': 'COINBASE:ETHUSD', 'LTCUSD': 'COINBASE:LTCUSD',
    'XRPUSD': 'BITSTAMP:XRPUSD', 'BNBUSD': 'BINANCE:BNBUSDT', 'SOLUSD': 'COINBASE:SOLUSD',
    'ADAUSD': 'COINBASE:ADAUSD', 'DOGEUSD': 'BINANCE:DOGEUSDT', 'DOTUSD': 'COINBASE:DOTUSD',
    'MATICUSD': 'COINBASE:MATICUSD', 'AVAXUSD': 'COINBASE:AVAXUSD', 'LINKUSD': 'COINBASE:LINKUSD',
    'BCHUSD': 'BINANCE:BCHUSDT', 'SHIBUSD': 'BINANCE:SHIBUSDT', 'XLMUSD': 'BINANCE:XLMUSDT',
    'TRXUSD': 'BINANCE:TRXUSDT', 'UNIUSD': 'BINANCE:UNIUSDT', 'ATOMUSD': 'BINANCE:ATOMUSDT',
    'ETCUSD': 'BINANCE:ETCUSDT', 'FILUSD': 'BINANCE:FILUSDT', 'ICPUSD': 'BINANCE:ICPUSDT',
    'VETUSD': 'BINANCE:VETUSDT', 'NEARUSD': 'BINANCE:NEARUSDT', 'GRTUSD': 'BINANCE:GRTUSDT',
    'AAVEUSD': 'BINANCE:AAVEUSDT', 'MKRUSD': 'BINANCE:MKRUSDT', 'ALGOUSD': 'BINANCE:ALGOUSDT',
    'FTMUSD': 'BINANCE:FTMUSDT', 'SANDUSD': 'BINANCE:SANDUSDT', 'MANAUSD': 'BINANCE:MANAUSDT',
    'AXSUSD': 'BINANCE:AXSUSDT', 'THETAUSD': 'BINANCE:THETAUSDT', 'XMRUSD': 'BINANCE:XMRUSDT',
    'SNXUSD': 'BINANCE:SNXUSDT', 'EOSUSD': 'BINANCE:EOSUSDT', 'CHZUSD': 'BINANCE:CHZUSDT',
    'ENJUSD': 'BINANCE:ENJUSDT', 'PEPEUSD': 'BINANCE:PEPEUSDT', 'ARBUSD': 'BINANCE:ARBUSDT',
    'OPUSD': 'BINANCE:OPUSDT', 'SUIUSD': 'BINANCE:SUIUSDT', 'APTUSD': 'BINANCE:APTUSDT',
    'INJUSD': 'BINANCE:INJUSDT', 'TONUSD': 'BINANCE:TONUSDT', 'HBARUSD': 'BINANCE:HBARUSDT',
  }
  return symbolMap[symbol] || `OANDA:${symbol}`
}

// Global script loading state to prevent duplicate <script> tags
let _tvScriptLoadPromise = null
function loadTradingViewScript() {
  if (window.TradingView && window.TradingView.widget) return Promise.resolve()
  if (_tvScriptLoadPromise) return _tvScriptLoadPromise
  _tvScriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load TradingView tv.js'))
    document.head.appendChild(script)
  })
  return _tvScriptLoadPromise
}

const TradingViewChart = ({ symbol, interval = '5', isDarkMode = true, containerId, style }) => {
  const chartId = containerId || 'tv_chart_container'
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false

    const createWidget = () => {
      if (cancelled || !mountedRef.current) return
      const el = document.getElementById(chartId)
      if (!window.TradingView || !el) return

      // Clear previous widget content
      el.innerHTML = ''

      // Create inner container for widget
      const innerDiv = document.createElement('div')
      innerDiv.id = `${chartId}_inner`
      innerDiv.style.height = '100%'
      innerDiv.style.width = '100%'
      el.appendChild(innerDiv)

      const tvSymbol = getSymbolForTradingView(symbol || 'XAUUSD')
      const theme = isDarkMode ? 'dark' : 'light'
      const chartBg = isDarkMode ? '#0a0a0a' : '#ffffff'

      try {
        new window.TradingView.widget({
          "autosize": true,
          "symbol": tvSymbol,
          "interval": interval,
          "timezone": "Etc/UTC",
          "theme": theme,
          "style": "1",
          "locale": "en",
          "toolbar_bg": chartBg,
          "enable_publishing": false,
          "hide_top_toolbar": false,
          "hide_legend": false,
          "hide_side_toolbar": false,
          "save_image": false,
          "container_id": `${chartId}_inner`,
          "backgroundColor": chartBg,
          "withdateranges": true,
          "allow_symbol_change": false,
          "details": true,
          "hotlist": false,
          "calendar": false,
          "show_popup_button": true,
          "popup_width": "1000",
          "popup_height": "650",
          "studies": [],
          "studies_overrides": {},
          "overrides": {
            "mainSeriesProperties.showPriceLine": true,
            "mainSeriesProperties.highLowAvgPrice.highLowPriceLinesVisible": true,
            "scalesProperties.showSeriesLastValue": true,
            "scalesProperties.showStudyLastValue": true,
            "paneProperties.legendProperties.showLegend": true,
            "paneProperties.legendProperties.showSeriesTitle": true,
            "paneProperties.legendProperties.showSeriesOHLC": true,
            "paneProperties.legendProperties.showBarChange": true,
          },
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
