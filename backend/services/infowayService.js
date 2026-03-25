/**

 * Infoway.io Real-Time Market Data Service

 * Production-grade WebSocket integration for Forex, Crypto, Metals, Energy, Stocks

 * 

 * Premium Plan Features:

 * - 2 WebSocket connections

 * - 600 symbols per connection (800 total)

 * - 60 requests/minute rate limit

 * - Real-time tick data with millisecond latency

 * 

 * Docs: https://docs.infoway.io/en-docs

 */



import WebSocket from 'ws'

import dotenv from 'dotenv'



dotenv.config()



// ============================================================================

// CONFIGURATION

// ============================================================================



const INFOWAY_API_KEY = process.env.INFOWAY_API_KEY || ''

const API_BASE_URL = 'https://data.infoway.io'



// WebSocket endpoints by business type

const WS_ENDPOINTS = {

  stock: 'wss://data.infoway.io/ws',

  crypto: 'wss://data.infoway.io/ws',

  common: 'wss://data.infoway.io/ws' // Forex, Metals, Energy, Futures

}



// Protocol codes per Infoway documentation

const PROTOCOL = {

  // Trade subscription

  SUBSCRIBE_TRADE: 10000,

  TRADE_RESPONSE: 10001,

  TRADE_PUSH: 10002,

  // Depth (order book) subscription

  SUBSCRIBE_DEPTH: 10003,

  DEPTH_RESPONSE: 10004,

  DEPTH_PUSH: 10005,

  // Candlestick subscription

  SUBSCRIBE_KLINE: 10006,

  KLINE_RESPONSE: 10007,

  KLINE_PUSH: 10008,

  // Heartbeat

  HEARTBEAT: 10010,

  HEARTBEAT_RESPONSE: 10011

}



// Reconnection settings

const RECONNECT_CONFIG = {

  initialDelay: 1000,      // 1 second

  maxDelay: 30000,         // 30 seconds max

  multiplier: 1.5,         // Exponential backoff multiplier

  maxAttempts: Infinity    // Never stop trying

}



// Heartbeat interval (30 seconds as per docs)

const HEARTBEAT_INTERVAL = 30000



// ============================================================================

// STATE MANAGEMENT

// ============================================================================



// In-memory price cache - Map<symbol, PriceData>

const priceCache = new Map()



// Connection state per business type

const connectionState = {

  common: { ws: null, connected: false, reconnectAttempts: 0, reconnectTimer: null },

  crypto: { ws: null, connected: false, reconnectAttempts: 0, reconnectTimer: null },

  stock: { ws: null, connected: false, reconnectAttempts: 0, reconnectTimer: null }

}



// Heartbeat timers

const heartbeatTimers = {}



// Callbacks for external consumers

let onPriceUpdate = null

let onConnectionChange = null



// Global connection status

let isConnected = false



// Symbol lists (populated from API or fallback)

let dynamicSymbols = {

  forex: [],

  crypto: [],

  stocks: [],

  metals: [],

  energy: []

}



// Symbol name mappings

const symbolNames = {}



// Symbol mapping for internal <-> Infoway format conversion

let SYMBOL_MAP = {}

let ALL_SYMBOLS = []

const CRYPTO_INTERNAL_TO_INFOWAY = {}

const CRYPTO_INFOWAY_TO_INTERNAL = {}



// ============================================================================

// FALLBACK SYMBOL LISTS

// ============================================================================



const FOREX_SYMBOLS = [

  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',

  'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'EURAUD', 'EURCAD', 'AUDCAD',

  'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY', 'AUDNZD', 'CADCHF', 'GBPCHF',

  'GBPNZD', 'EURNZD', 'NZDCAD', 'NZDCHF', 'AUDCHF', 'GBPAUD', 'GBPCAD',

  'USDSGD', 'USDHKD', 'USDZAR', 'USDTRY', 'USDMXN', 'USDPLN', 'USDSEK',

  'USDNOK', 'USDDKK', 'USDCNH', 'EURPLN', 'EURSEK', 'EURNOK', 'EURDKK',

  'GBPSEK', 'GBPNOK', 'CHFSEK', 'SEKJPY', 'NOKJPY', 'SGDJPY', 'ZARJPY'

]



const CRYPTO_SYMBOLS = [

  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT',

  'TRXUSDT', 'LINKUSDT', 'MATICUSDT', 'DOTUSDT', 'SHIBUSDT', 'LTCUSDT', 'BCHUSDT',

  'AVAXUSDT', 'XLMUSDT', 'UNIUSDT', 'ATOMUSDT', 'ETCUSDT', 'FILUSDT', 'ICPUSDT',

  'VETUSDT', 'NEARUSDT', 'GRTUSDT', 'AAVEUSDT', 'MKRUSDT', 'ALGOUSDT', 'FTMUSDT',

  'SANDUSDT', 'MANAUSDT', 'AXSUSDT', 'THETAUSDT', 'FLOWUSDT', 'SNXUSDT', 'EOSUSDT',

  'CHZUSDT', 'ENJUSDT', 'PEPEUSDT', 'ARBUSDT', 'OPUSDT', 'SUIUSDT', 'APTUSDT',

  'INJUSDT', 'TONUSDT', 'HBARUSDT', 'NEOUSDT', 'FETUSDT', 'RNDRUSDT', 'WLDUSDT',

  'SEIUSDT', 'TIAUSDT', 'BLURUSDT', '1INCHUSDT', 'BONKUSDT', 'FLOKIUSDT', 'ORDIUSDT'

]



const STOCK_SYMBOLS = [

  'AAPL.US', 'MSFT.US', 'GOOGL.US', 'AMZN.US', 'NVDA.US', 'META.US', 'TSLA.US',

  'BRK-B.US', 'JPM.US', 'V.US', 'JNJ.US', 'WMT.US', 'PG.US', 'MA.US', 'UNH.US',

  'HD.US', 'DIS.US', 'BAC.US', 'ADBE.US', 'CRM.US', 'NFLX.US', 'CSCO.US',

  'PFE.US', 'TMO.US', 'ABT.US', 'COST.US', 'PEP.US', 'AVGO.US', 'NKE.US',

  'MRK.US', 'ABBV.US', 'KO.US', 'LLY.US', 'CVX.US', 'MCD.US', 'WFC.US',

  'DHR.US', 'ACN.US', 'NEE.US', 'TXN.US', 'PM.US', 'BMY.US', 'UPS.US',

  'QCOM.US', 'RTX.US', 'HON.US', 'INTC.US', 'AMD.US', 'PYPL.US', 'SBUX.US'

]



const METAL_SYMBOLS = [

  'XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD', 'XAUEUR', 'XAUAUD', 'XAUGBP',

  'XAUCHF', 'XAUJPY', 'XAGEUR', 'XAGAUD', 'XAGGBP'

]



const ENERGY_SYMBOLS = [

  'USOIL', 'UKOIL', 'NGAS', 'BRENT', 'WTI', 'GASOLINE', 'HEATING'

]



// ============================================================================

// UTILITY FUNCTIONS

// ============================================================================



/**

 * Generate unique trace ID for request tracking

 */

function generateTraceId() {

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {

    const r = Math.random() * 16 | 0

    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)

  })

}



/**

 * Calculate reconnection delay with exponential backoff

 */

function getReconnectDelay(attempts) {

  const delay = Math.min(

    RECONNECT_CONFIG.initialDelay * Math.pow(RECONNECT_CONFIG.multiplier, attempts),

    RECONNECT_CONFIG.maxDelay

  )

  return delay + Math.random() * 1000 // Add jitter

}



/**

 * Log with timestamp

 */

function log(level, message, ...args) {

  const timestamp = new Date().toISOString()

  const prefix = `[${timestamp}] [Infoway]`

  if (level === 'error') {

    console.error(prefix, message, ...args)

  } else if (level === 'warn') {

    console.warn(prefix, message, ...args)

  } else {

    console.log(prefix, message, ...args)

  }

}



// ============================================================================

// SYMBOL MANAGEMENT

// ============================================================================



/**

 * Fetch symbols from Infoway REST API

 */

async function fetchSymbolsFromAPI(type) {

  try {

    const url = `${API_BASE_URL}/common/basic/symbols?type=${type}&apikey=${INFOWAY_API_KEY}`

    const response = await fetch(url, { timeout: 10000 })

    

    if (!response.ok) {

      throw new Error(`HTTP ${response.status}`)

    }

    

    const data = await response.json()

    

    if (data.ret === 200 && Array.isArray(data.data)) {

      return data.data.map(item => ({

        symbol: item.symbol,

        name: item.name_en || item.name || item.symbol

      }))

    }

    

    return []

  } catch (error) {

    log('warn', `Failed to fetch ${type} symbols:`, error.message)

    return []

  }

}



/**

 * Initialize all symbol lists from API with fallback

 */

async function initializeSymbols() {

  log('info', 'Fetching symbols from API...')

  

  const [forex, crypto, stocks, metals, energy] = await Promise.all([

    fetchSymbolsFromAPI('FOREX'),

    fetchSymbolsFromAPI('CRYPTO'),

    fetchSymbolsFromAPI('STOCK_US'),

    fetchSymbolsFromAPI('METAL'),

    fetchSymbolsFromAPI('ENERGY')

  ])

  

  // Use API data or fallback to static lists

  dynamicSymbols.forex = forex.length > 0 ? forex.map(s => s.symbol) : FOREX_SYMBOLS

  dynamicSymbols.crypto = crypto.length > 0 ? crypto.map(s => s.symbol) : CRYPTO_SYMBOLS

  dynamicSymbols.stocks = stocks.length > 0 ? stocks.map(s => s.symbol) : STOCK_SYMBOLS

  dynamicSymbols.metals = metals.length > 0 ? metals.map(s => s.symbol) : METAL_SYMBOLS

  dynamicSymbols.energy = energy.length > 0 ? energy.map(s => s.symbol) : ENERGY_SYMBOLS

  

  // Store symbol names for display

  const allItems = [...forex, ...crypto, ...stocks, ...metals, ...energy]

  allItems.forEach(item => {

    if (item.symbol && item.name) {

      symbolNames[item.symbol] = item.name

    }

  })

  

  // Build crypto symbol mappings (BTCUSDT <-> BTCUSD)

  dynamicSymbols.crypto.forEach(s => {

    if (s.endsWith('USDT')) {

      const internal = s.replace('USDT', 'USD')

      CRYPTO_INTERNAL_TO_INFOWAY[internal] = s

      CRYPTO_INFOWAY_TO_INTERNAL[s] = internal

    }

  })

  

  // Build unified symbol map

  const allSymbols = new Set()

  

  // Forex - direct mapping

  dynamicSymbols.forex.forEach(s => {

    allSymbols.add(s)

    SYMBOL_MAP[s] = s

  })

  

  // Crypto - convert USDT to USD for internal use

  dynamicSymbols.crypto.forEach(s => {

    const internal = s.endsWith('USDT') ? s.replace('USDT', 'USD') : s

    allSymbols.add(internal)

    SYMBOL_MAP[internal] = s

  })

  

  // Stocks - remove .US suffix for internal use

  dynamicSymbols.stocks.forEach(s => {

    const internal = s.replace('.US', '')

    allSymbols.add(internal)

    SYMBOL_MAP[internal] = s

  })

  

  // Metals - direct mapping

  dynamicSymbols.metals.forEach(s => {

    allSymbols.add(s)

    SYMBOL_MAP[s] = s

  })

  

  // Energy - direct mapping

  dynamicSymbols.energy.forEach(s => {

    allSymbols.add(s)

    SYMBOL_MAP[s] = s

  })

  

  ALL_SYMBOLS = Array.from(allSymbols)

  

  log('info', `Symbols loaded - Forex: ${dynamicSymbols.forex.length}, Crypto: ${dynamicSymbols.crypto.length}, Stocks: ${dynamicSymbols.stocks.length}, Metals: ${dynamicSymbols.metals.length}, Energy: ${dynamicSymbols.energy.length}`)

  log('info', `Total tradeable symbols: ${ALL_SYMBOLS.length}`)

}



// ============================================================================

// PRICE DATA PROCESSING

// ============================================================================



/**

 * Normalize and store price data from depth (order book) push

 * Format: { s: symbol, a: [[price, volume], ...], b: [[price, volume], ...], t: timestamp }

 */

function processDepthData(data) {

  const { s: symbol, a: asks, b: bids, t: timestamp } = data

  

  if (!symbol || !asks?.length || !bids?.length) return null

  

  // Best ask = lowest ask price (first in sorted array)

  // Best bid = highest bid price (first in sorted array)

  const bestAsk = parseFloat(asks[0]?.[0])

  const bestBid = parseFloat(bids[0]?.[0])

  const askVolume = parseFloat(asks[0]?.[1]) || 0

  const bidVolume = parseFloat(bids[0]?.[1]) || 0

  

  if (isNaN(bestAsk) || isNaN(bestBid) || bestAsk <= 0 || bestBid <= 0) return null

  

  // Convert to internal symbol format

  let internalSymbol = symbol

  if (CRYPTO_INFOWAY_TO_INTERNAL[symbol]) {

    internalSymbol = CRYPTO_INFOWAY_TO_INTERNAL[symbol]

  }

  

  const priceData = {

    symbol: internalSymbol,

    bid: bestBid,

    ask: bestAsk,

    mid: (bestBid + bestAsk) / 2,

    spread: bestAsk - bestBid,

    bidVolume,

    askVolume,

    timestamp: timestamp || Date.now(),

    source: 'depth'

  }

  

  // Update cache

  priceCache.set(internalSymbol, priceData)

  

  return priceData

}



/**

 * Normalize and store price data from trade push

 * Format: { s: symbol, p: price, v: volume, vw: value, t: timestamp, td: direction }

 */

function processTradeData(data) {

  const { s: symbol, p: price, v: volume, t: timestamp, td: direction } = data

  

  if (!symbol || !price) return null

  

  const priceValue = parseFloat(price)

  if (isNaN(priceValue) || priceValue <= 0) return null

  

  // Convert to internal symbol format

  let internalSymbol = symbol

  if (CRYPTO_INFOWAY_TO_INTERNAL[symbol]) {

    internalSymbol = CRYPTO_INFOWAY_TO_INTERNAL[symbol]

  }

  

  // Check if we already have depth data (more accurate)

  const existing = priceCache.get(internalSymbol)

  if (existing && existing.source === 'depth') {

    // Update last trade info but keep bid/ask from depth

    existing.lastPrice = priceValue

    existing.lastVolume = parseFloat(volume) || 0

    existing.lastDirection = direction // 1=buy, 2=sell

    existing.timestamp = timestamp || Date.now()

    return existing

  }

  

  // No depth data, use trade price for bid/ask estimate

  const priceData = {

    symbol: internalSymbol,

    bid: priceValue,

    ask: priceValue,

    mid: priceValue,

    spread: 0,

    lastPrice: priceValue,

    lastVolume: parseFloat(volume) || 0,

    lastDirection: direction,

    timestamp: timestamp || Date.now(),

    source: 'trade'

  }

  

  priceCache.set(internalSymbol, priceData)

  

  return priceData

}



// ============================================================================

// WEBSOCKET CONNECTION MANAGEMENT

// ============================================================================



/**

 * Build WebSocket URL with authentication

 */

function buildWsUrl(businessType) {

  return `${WS_ENDPOINTS[businessType]}?business=${businessType}&apikey=${INFOWAY_API_KEY}`

}



/**

 * Send subscription request for symbols

 */

function sendSubscription(ws, businessType, symbols, subscriptionType = 'depth') {

  if (ws.readyState !== WebSocket.OPEN) {

    log('warn', `Cannot subscribe ${businessType} - connection not open`)

    return false

  }

  

  const code = subscriptionType === 'trade' ? PROTOCOL.SUBSCRIBE_TRADE : PROTOCOL.SUBSCRIBE_DEPTH

  

  const message = {

    code,

    trace: generateTraceId(),

    data: {

      codes: symbols.join(',')

    }

  }

  

  try {

    ws.send(JSON.stringify(message))

    log('info', `${businessType}: Subscribed to ${symbols.length} symbols (${subscriptionType})`)

    return true

  } catch (error) {

    log('error', `${businessType}: Subscription failed -`, error.message)

    return false

  }

}



/**

 * Send heartbeat to keep connection alive

 */

function sendHeartbeat(ws, businessType) {

  if (ws.readyState !== WebSocket.OPEN) return

  

  const message = {

    code: PROTOCOL.HEARTBEAT,

    trace: generateTraceId()

  }

  

  try {

    ws.send(JSON.stringify(message))

  } catch (error) {

    log('warn', `${businessType}: Heartbeat failed -`, error.message)

  }

}



/**

 * Start heartbeat timer for a connection

 */

function startHeartbeat(businessType) {

  stopHeartbeat(businessType)

  

  const state = connectionState[businessType]

  if (!state?.ws) return

  

  heartbeatTimers[businessType] = setInterval(() => {

    sendHeartbeat(state.ws, businessType)

  }, HEARTBEAT_INTERVAL)

}



/**

 * Stop heartbeat timer

 */

function stopHeartbeat(businessType) {

  if (heartbeatTimers[businessType]) {

    clearInterval(heartbeatTimers[businessType])

    delete heartbeatTimers[businessType]

  }

}



/**

 * Handle WebSocket message

 */

function handleMessage(businessType, rawData) {

  try {

    const dataStr = rawData.toString()

    

    // Skip non-JSON messages (welcome text, etc.)

    if (!dataStr.startsWith('{')) return

    

    const message = JSON.parse(dataStr)

    const { code, data, msg } = message

    

    switch (code) {

      case PROTOCOL.DEPTH_PUSH:

        if (data) {

          const priceData = processDepthData(data)

          if (priceData && onPriceUpdate) {

            onPriceUpdate(priceData.symbol, priceData)

          }

        }

        break

        

      case PROTOCOL.TRADE_PUSH:

        if (data) {

          const priceData = processTradeData(data)

          if (priceData && onPriceUpdate) {

            onPriceUpdate(priceData.symbol, priceData)

          }

        }

        break

        

      case PROTOCOL.DEPTH_RESPONSE:

      case PROTOCOL.TRADE_RESPONSE:

        if (msg === 'ok') {

          log('info', `${businessType}: Subscription confirmed`)

        } else {

          log('warn', `${businessType}: Subscription response - ${msg}`)

        }

        break

        

      case PROTOCOL.HEARTBEAT_RESPONSE:

        // Heartbeat acknowledged - connection is healthy

        break

        

      default:

        // Unknown message type - log for debugging

        if (code) {

          log('debug', `${businessType}: Unknown message code ${code}`)

        }

    }

  } catch (error) {

    log('error', `${businessType}: Message parse error -`, error.message)

  }

}



/**

 * Create and manage WebSocket connection for a business type

 */

function createConnection(businessType, symbols) {

  const state = connectionState[businessType]

  

  // Clear any pending reconnect

  if (state.reconnectTimer) {

    clearTimeout(state.reconnectTimer)

    state.reconnectTimer = null

  }

  

  // Close existing connection if any

  if (state.ws) {

    try {

      state.ws.terminate()

    } catch (e) {}

    state.ws = null

  }

  

  if (!INFOWAY_API_KEY) {

    log('error', `${businessType}: Cannot connect - missing API key`)

    return null

  }

  

  const wsUrl = buildWsUrl(businessType)

  log('info', `${businessType}: Connecting...`)

  

  const ws = new WebSocket(wsUrl)

  state.ws = ws

  

  // Connection opened

  ws.on('open', () => {

    log('info', `${businessType}: Connected`)

    state.connected = true

    state.reconnectAttempts = 0

    

    // Subscribe to depth data (provides bid/ask)

    sendSubscription(ws, businessType, symbols, 'depth')

    

    // Also subscribe to trade data for last price

    setTimeout(() => {

      sendSubscription(ws, businessType, symbols, 'trade')

    }, 2000) // Delay to avoid rate limit

    

    // Start heartbeat

    startHeartbeat(businessType)

    

    // Update global connection status

    updateGlobalConnectionStatus()

  })

  

  // Message received

  ws.on('message', (data) => {

    handleMessage(businessType, data)

  })

  

  // Error occurred

  ws.on('error', (error) => {

    log('error', `${businessType}: WebSocket error -`, error.message)

  })

  

  // Connection closed

  ws.on('close', (code, reason) => {

    const reasonStr = reason?.toString() || 'unknown'

    log('warn', `${businessType}: Disconnected (code: ${code}, reason: ${reasonStr})`)

    

    state.connected = false

    state.ws = null

    stopHeartbeat(businessType)

    

    // Update global connection status

    updateGlobalConnectionStatus()

    

    // Schedule reconnection with exponential backoff

    scheduleReconnect(businessType, symbols)

  })

  

  return ws

}



/**

 * Schedule reconnection with exponential backoff

 */

function scheduleReconnect(businessType, symbols) {

  const state = connectionState[businessType]

  

  if (state.reconnectTimer) return // Already scheduled

  

  state.reconnectAttempts++

  const delay = getReconnectDelay(state.reconnectAttempts)

  

  log('info', `${businessType}: Reconnecting in ${Math.round(delay / 1000)}s (attempt ${state.reconnectAttempts})`)

  

  state.reconnectTimer = setTimeout(() => {

    state.reconnectTimer = null

    createConnection(businessType, symbols)

  }, delay)

}



/**

 * Update global connection status based on all connections

 */

function updateGlobalConnectionStatus() {

  const wasConnected = isConnected

  isConnected = Object.values(connectionState).some(state => state.connected)

  

  if (wasConnected !== isConnected && onConnectionChange) {

    onConnectionChange(isConnected)

  }

}



// ============================================================================

// PUBLIC API

// ============================================================================



/**

 * Initialize and connect to Infoway WebSocket feeds

 * Falls back to REST API polling if WebSocket fails

 */

async function connect() {

  log('info', '='.repeat(60))

  log('info', 'Price Service - Initializing...')

  log('info', '='.repeat(60))

  

  // Initialize symbol lists (use fallback lists)

  await initializeSymbols()

  

  // First REST pass completes before returning so prices exist on cold start

  await startRestPolling()



  // WebSocket: opt-in (INFOWAY_WEBSOCKET=1) so invalid/expired keys do not spam 401 reconnects

  if (INFOWAY_API_KEY && process.env.INFOWAY_WEBSOCKET === '1') {

    try {

      const forexPart = (dynamicSymbols.forex.length ? dynamicSymbols.forex : FOREX_SYMBOLS).slice(0, 60)

      const metalPart = dynamicSymbols.metals.length ? dynamicSymbols.metals : METAL_SYMBOLS

      const energyPart = (dynamicSymbols.energy.length ? dynamicSymbols.energy : ENERGY_SYMBOLS).slice(0, 12)

      const commonList = [...new Set([...forexPart, ...metalPart, ...energyPart])].filter(Boolean)

      const cryptoList = (dynamicSymbols.crypto.length ? dynamicSymbols.crypto : CRYPTO_SYMBOLS).slice(0, 80)

      const stockList = (dynamicSymbols.stocks.length ? dynamicSymbols.stocks : STOCK_SYMBOLS).slice(0, 50)



      if (commonList.length) createConnection('common', commonList)

      setTimeout(() => {

        if (cryptoList.length) createConnection('crypto', cryptoList)

      }, 600)

      setTimeout(() => {

        if (stockList.length) createConnection('stock', stockList)

      }, 1200)

      log('info', 'Infoway WebSocket enabled (INFOWAY_WEBSOCKET=1); REST polling also active')

    } catch (e) {

      log('warn', 'Infoway WebSocket failed to start:', e.message)

    }

  } else if (INFOWAY_API_KEY) {

    log('info', 'INFOWAY_API_KEY set — set INFOWAY_WEBSOCKET=1 to enable live WS (REST polling active)')

  } else {

    log('info', 'No INFOWAY_API_KEY — prices via REST polling (Binance + Yahoo + exchangerate)')

  }



  setTimeout(() => {

    log('info', `Price cache: ${priceCache.size} symbols`)

  }, 5000)

}



// REST API polling interval

let restPollingInterval = null



/**

 * Start REST API polling for price updates

 */

async function startRestPolling() {

  await fetchAllPricesREST()



  restPollingInterval = setInterval(() => {

    fetchAllPricesREST().catch(err => log('warn', 'REST poll tick:', err.message))

  }, 3000)



  log('info', 'REST API polling started (3s interval)')

}



/**

 * Fetch all prices via REST APIs

 */

async function fetchAllPricesREST() {

  try {

    // Fetch crypto prices from Binance

    const cryptoSymbols = ['BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD', 'DOTUSD', 'MATICUSD', 'LTCUSD', 'AVAXUSD', 'LINKUSD', 'SHIBUSD', 'UNIUSD', 'ATOMUSD']

    

    const response = await fetch('https://api.binance.com/api/v3/ticker/bookTicker', { timeout: 5000 })

    if (response.ok) {

      const allTickers = await response.json()

      const tickerMap = new Map(allTickers.map(t => [t.symbol.toLowerCase(), t]))

      

      for (const symbol of cryptoSymbols) {

        const binanceSymbol = symbol.replace('USD', 'USDT').toLowerCase()

        const ticker = tickerMap.get(binanceSymbol)

        if (ticker) {

          const priceData = {

            symbol,

            bid: parseFloat(ticker.bidPrice),

            ask: parseFloat(ticker.askPrice),

            mid: (parseFloat(ticker.bidPrice) + parseFloat(ticker.askPrice)) / 2,

            spread: parseFloat(ticker.askPrice) - parseFloat(ticker.bidPrice),

            timestamp: Date.now(),

            source: 'binance'

          }

          priceCache.set(symbol, priceData)

          

          // Notify subscribers

          if (onPriceUpdate) {

            onPriceUpdate(symbol, priceData)

          }

        }

      }

    }

    

    // Forex, metals, energy (REST fallbacks; metals no longer use exchangerate XAU/XAG)

    const forexSymbols = [

      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',

      'EURGBP', 'EURJPY', 'GBPJPY',

      'XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD',

      'USOIL', 'UKOIL', 'NGAS', 'BRENT', 'WTI'

    ]

    await Promise.all(

      forexSymbols.map(async (symbol) => {

        try {

          const price = await fetchPriceREST(symbol)

          if (price && onPriceUpdate) onPriceUpdate(symbol, price)

        } catch (e) {

          log('warn', `REST poll ${symbol}:`, e.message)

        }

      })

    )

    

    // Update connection status

    if (priceCache.size > 0 && !isConnected) {

      isConnected = true

      if (onConnectionChange) {

        onConnectionChange(true)

      }

    }

  } catch (error) {

    log('warn', 'REST polling error:', error.message)

  }

}



/**

 * Disconnect all WebSocket connections

 */

function disconnect() {

  log('info', 'Disconnecting all connections...')

  

  // Stop REST polling

  if (restPollingInterval) {

    clearInterval(restPollingInterval)

    restPollingInterval = null

  }

  

  // Stop all heartbeats

  Object.keys(heartbeatTimers).forEach(stopHeartbeat)

  

  // Close all connections

  Object.entries(connectionState).forEach(([type, state]) => {

    if (state.reconnectTimer) {

      clearTimeout(state.reconnectTimer)

      state.reconnectTimer = null

    }

    if (state.ws) {

      try {

        state.ws.close(1000, 'Client disconnect')

      } catch (e) {}

      state.ws = null

    }

    state.connected = false

    state.reconnectAttempts = 0

  })

  

  isConnected = false

  log('info', 'All connections closed')

}



/**

 * Get price for a single symbol

 */

function getPrice(symbol) {

  return priceCache.get(symbol) || null

}



/**

 * Get all cached prices

 */

function getAllPrices() {

  return Object.fromEntries(priceCache)

}



/**

 * Get the price cache Map directly

 */

function getPriceCache() {

  return priceCache

}



/** ISO precious-metal codes: exchangerate "USD base + rates.XAU" is NOT spot USD/oz — caused ~4412 for XAUUSD */

const PRECIOUS_THREE_LETTER = new Set(['XAU', 'XAG', 'XPT', 'XPD'])



/**

 * Yahoo Finance chart mid (futures / spot proxies). Used when REST-only mode has no Infoway ticks.

 */

async function fetchYahooChartMidPrice(chartSymbol) {

  try {

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(chartSymbol)}?range=1d&interval=5m`

    const response = await fetch(url, {

      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SuimFX-PriceBot/1.0)' },

      timeout: 8000

    })

    if (!response.ok) return null

    const json = await response.json()

    const meta = json.chart?.result?.[0]?.meta

    const p = meta?.regularMarketPrice ?? meta?.previousClose

    if (typeof p === 'number' && p > 0 && Number.isFinite(p)) return p

  } catch (e) {

    log('warn', `Yahoo chart ${chartSymbol}:`, e.message)

  }

  return null

}



function storeBidAsk(symbol, bid, ask, source) {

  const priceData = {

    symbol,

    bid,

    ask,

    mid: (bid + ask) / 2,

    spread: ask - bid,

    timestamp: Date.now(),

    source

  }

  priceCache.set(symbol, priceData)

  return priceData

}



function storeMidSpread(symbol, mid, spreadAbs, source) {

  const half = spreadAbs / 2

  return storeBidAsk(symbol, mid - half, mid + half, source)

}



/**

 * Fetch price via REST API (fallback) - Uses Binance for crypto; metals/energy never use fiat XAU/XAG rates

 */

async function fetchPriceREST(symbol) {

  // Check cache first

  const cached = priceCache.get(symbol)

  if (cached && Date.now() - cached.timestamp < 5000) {

    return cached

  }

  

  try {

    const category = categorizeSymbol(symbol)

    

    if (category === 'Crypto') {

      // Use Binance API for crypto (free, no auth required)

      const binanceSymbol = symbol.replace('USD', 'USDT')

      const response = await fetch(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${binanceSymbol}`, { timeout: 5000 })

      if (response.ok) {

        const data = await response.json()

        const priceData = {

          symbol,

          bid: parseFloat(data.bidPrice),

          ask: parseFloat(data.askPrice),

          mid: (parseFloat(data.bidPrice) + parseFloat(data.askPrice)) / 2,

          spread: parseFloat(data.askPrice) - parseFloat(data.bidPrice),

          timestamp: Date.now(),

          source: 'binance'

        }

        priceCache.set(symbol, priceData)

        return priceData

      }

    } else if (category === 'Metals') {

      // Spot proxies: never use exchangerate-api 6-char math for XAU*/XAG* (wrong ~4412 for gold).

      const GOLD_MIN = 800

      const GOLD_MAX = 12000

      const SILVER_MIN = 8

      const SILVER_MAX = 80



      if (symbol === 'XAUUSD') {

        let mid = await fetchYahooChartMidPrice('GC=F')

        if (mid == null || mid < GOLD_MIN || mid > GOLD_MAX) {

          mid = await fetchYahooChartMidPrice('FX_IDC:XAUUSD')

        }

        if (mid == null || mid < GOLD_MIN || mid > GOLD_MAX) {

          mid = await fetchYahooChartMidPrice('XAUUSD=X')

        }

        if (mid != null && mid >= GOLD_MIN && mid <= GOLD_MAX) {

          return storeMidSpread(symbol, mid, Math.max(mid * 0.00008, 0.25), 'yahoo-gold')

        }

        try {

          const r = await fetch('https://api.binance.com/api/v3/ticker/bookTicker?symbol=PAXGUSDT', { timeout: 5000 })

          if (r.ok) {

            const d = await r.json()

            const bid = parseFloat(d.bidPrice)

            const ask = parseFloat(d.askPrice)

            const paxgMid = (bid + ask) / 2

            if (bid > 0 && ask > 0 && paxgMid >= GOLD_MIN && paxgMid <= GOLD_MAX) {

              return storeBidAsk(symbol, bid, ask, 'binance-paxg')

            }

          }

        } catch (_) { /* fall through */ }

        return storeMidSpread(symbol, 2650, 0.5, 'fallback-static')

      }

      if (symbol === 'XAGUSD') {

        // SI=F often mis-resolves (~69); prefer FX spot IDs

        let mid = await fetchYahooChartMidPrice('FX_IDC:XAGUSD')

        if (mid == null || mid < SILVER_MIN || mid > SILVER_MAX) {

          mid = await fetchYahooChartMidPrice('XAGUSD=X')

        }

        if (mid != null && mid >= SILVER_MIN && mid <= SILVER_MAX) {

          return storeMidSpread(symbol, mid, Math.max(mid * 0.00012, 0.02), 'yahoo-silver')

        }

        return storeMidSpread(symbol, 31.5, 0.04, 'fallback-static')

      }

      if (symbol === 'XPTUSD') {

        const mid = await fetchYahooChartMidPrice('PL=F')

        if (mid) return storeMidSpread(symbol, mid, Math.max(mid * 0.00015, 0.5), 'yahoo-pl')

      }

      if (symbol === 'XPDUSD') {

        const mid = await fetchYahooChartMidPrice('PA=F')

        if (mid) return storeMidSpread(symbol, mid, Math.max(mid * 0.00015, 0.5), 'yahoo-pa')

      }

      return priceCache.get(symbol) || null

    } else if (category === 'Energy') {

      const yahooMap = {

        USOIL: 'CL=F', WTI: 'CL=F', UKOIL: 'BZ=F', BRENT: 'BZ=F', NGAS: 'NG=F',

        GASOLINE: 'RB=F', HEATING: 'HO=F'

      }

      const ySym = yahooMap[symbol]

      if (ySym) {

        const mid = await fetchYahooChartMidPrice(ySym)

        if (mid) return storeMidSpread(symbol, mid, Math.max(Math.abs(mid) * 0.0002, 0.03), 'yahoo-energy')

      }

      return priceCache.get(symbol) || null

    } else if (category === 'Forex') {

      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`, { timeout: 5000 })

      if (response.ok) {

        const data = await response.json()

        if (symbol.length === 6) {

          const base = symbol.substring(0, 3)

          const quote = symbol.substring(3, 6)

          if (PRECIOUS_THREE_LETTER.has(base) || PRECIOUS_THREE_LETTER.has(quote)) {

            return priceCache.get(symbol) || null

          }

          if (quote === 'USD' && data.rates[base]) {

            const rate = 1 / data.rates[base]

            const spread = rate * 0.0001 // ~1 pip

            const priceData = {

              symbol,

              bid: rate - spread / 2,

              ask: rate + spread / 2,

              mid: rate,

              spread,

              timestamp: Date.now(),

              source: 'exchangerate'

            }

            priceCache.set(symbol, priceData)

            return priceData

          }

          if (base === 'USD' && data.rates[quote]) {

            const rate = data.rates[quote]

            const spread = rate * 0.0001

            const priceData = {

              symbol,

              bid: rate - spread / 2,

              ask: rate + spread / 2,

              mid: rate,

              spread,

              timestamp: Date.now(),

              source: 'exchangerate'

            }

            priceCache.set(symbol, priceData)

            return priceData

          }

        }

      }

    }

  } catch (error) {

    log('warn', `fetchPriceREST error for ${symbol}:`, error.message)

  }

  

  return priceCache.get(symbol) || null

}



/**

 * Fetch multiple prices via REST API (fallback)

 */

async function fetchBatchPricesREST(symbols) {

  const prices = {}

  

  // Separate symbols by type

  const cryptoSymbols = symbols.filter(s => categorizeSymbol(s) === 'Crypto')

  const otherSymbols = symbols.filter(s => categorizeSymbol(s) !== 'Crypto')

  

  // Fetch crypto prices from Binance in batch

  if (cryptoSymbols.length > 0) {

    try {

      const response = await fetch('https://api.binance.com/api/v3/ticker/bookTicker', { timeout: 5000 })

      if (response.ok) {

        const allTickers = await response.json()

        const tickerMap = new Map(allTickers.map(t => [t.symbol.toLowerCase(), t]))

        

        for (const symbol of cryptoSymbols) {

          const binanceSymbol = symbol.replace('USD', 'USDT').toLowerCase()

          const ticker = tickerMap.get(binanceSymbol)

          if (ticker) {

            const priceData = {

              symbol,

              bid: parseFloat(ticker.bidPrice),

              ask: parseFloat(ticker.askPrice),

              mid: (parseFloat(ticker.bidPrice) + parseFloat(ticker.askPrice)) / 2,

              spread: parseFloat(ticker.askPrice) - parseFloat(ticker.bidPrice),

              timestamp: Date.now(),

              source: 'binance'

            }

            prices[symbol] = priceData

            priceCache.set(symbol, priceData)

          }

        }

      }

    } catch (error) {

      log('warn', 'Binance batch fetch error:', error.message)

    }

  }

  

  // Fetch other symbols individually

  for (const symbol of otherSymbols) {

    const cached = priceCache.get(symbol)

    if (cached && Date.now() - cached.timestamp < 10000) {

      prices[symbol] = cached

    } else {

      const price = await fetchPriceREST(symbol)

      if (price) prices[symbol] = price

    }

  }

  

  return prices

}



/**

 * Set callback for price updates

 */

function setOnPriceUpdate(callback) {

  onPriceUpdate = callback

}



/**

 * Set callback for connection status changes

 */

function setOnConnectionChange(callback) {

  onConnectionChange = callback

}



/**

 * Check if WebSocket is connected

 */

function isWebSocketConnected() {

  return isConnected

}



/**

 * Get detailed connection status

 */

function getConnectionStatus() {

  return {

    isConnected,

    connections: Object.entries(connectionState).map(([type, state]) => ({

      type,

      connected: state.connected,

      reconnectAttempts: state.reconnectAttempts

    })),

    priceCount: priceCache.size,

    symbolCounts: {

      forex: dynamicSymbols.forex.length,

      crypto: dynamicSymbols.crypto.length,

      stocks: dynamicSymbols.stocks.length,

      metals: dynamicSymbols.metals.length,

      energy: dynamicSymbols.energy.length

    }

  }

}



/**

 * Categorize symbol by asset class

 */

function categorizeSymbol(symbol) {

  // Check dynamic lists first

  if (dynamicSymbols.forex.includes(symbol)) return 'Forex'

  if (dynamicSymbols.metals.includes(symbol)) return 'Metals'

  if (dynamicSymbols.energy.includes(symbol)) return 'Energy'

  if (dynamicSymbols.stocks.includes(symbol) || dynamicSymbols.stocks.includes(symbol + '.US')) return 'Stocks'

  

  // Check crypto - convert internal USD format to Infoway USDT format

  // Only for symbols that look like crypto (e.g., BTCUSD, ETHUSD - 3-5 letter base + USD)

  const cryptoPattern = /^[A-Z0-9]{2,6}USD$/

  if (cryptoPattern.test(symbol) && !dynamicSymbols.forex.includes(symbol)) {

    const cryptoVariant = symbol.replace('USD', 'USDT')

    if (dynamicSymbols.crypto.includes(cryptoVariant)) return 'Crypto'

  }

  if (dynamicSymbols.crypto.includes(symbol)) return 'Crypto'

  

  // Fallback to static lists

  if (FOREX_SYMBOLS.includes(symbol)) return 'Forex'

  if (METAL_SYMBOLS.includes(symbol)) return 'Metals'

  if (ENERGY_SYMBOLS.includes(symbol)) return 'Energy'

  if (STOCK_SYMBOLS.includes(symbol) || STOCK_SYMBOLS.includes(symbol + '.US')) return 'Stocks'

  

  // Check crypto in static list

  if (cryptoPattern.test(symbol)) {

    const cryptoVariant = symbol.replace('USD', 'USDT')

    if (CRYPTO_SYMBOLS.includes(cryptoVariant)) return 'Crypto'

  }

  if (CRYPTO_SYMBOLS.includes(symbol)) return 'Crypto'

  

  return 'Other'

}



/**

 * Get display name for symbol

 */

function getSymbolName(symbol) {

  return symbolNames[symbol] || symbolNames[SYMBOL_MAP[symbol]] || symbol

}



/**

 * Get all dynamic symbol lists

 */

function getDynamicSymbols() {

  return dynamicSymbols

}



// ============================================================================

// EXPORTS

// ============================================================================



export default {

  // Connection management

  connect,

  disconnect,

  

  // Price data access

  getPrice,

  getAllPrices,

  getPriceCache,

  fetchPriceREST,

  fetchBatchPricesREST,

  

  // Callbacks

  setOnPriceUpdate,

  setOnConnectionChange,

  

  // Status

  isWebSocketConnected,

  getConnectionStatus,

  

  // Symbol utilities

  categorizeSymbol,

  getSymbolName,

  getDynamicSymbols,

  

  // Symbol data (getters for immutability)

  get SYMBOL_MAP() { return SYMBOL_MAP },

  get ALL_SYMBOLS() { return ALL_SYMBOLS },

  

  // Static symbol lists (for reference)

  FOREX_SYMBOLS,

  CRYPTO_SYMBOLS,

  STOCK_SYMBOLS,

  METAL_SYMBOLS,

  ENERGY_SYMBOLS

}

