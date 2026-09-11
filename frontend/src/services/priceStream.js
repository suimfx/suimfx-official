// Institutional-grade real-time price streaming service using Socket.IO
import { io } from 'socket.io-client'
import { API_BASE_URL } from '../config/api'

const SOCKET_URL = API_BASE_URL

class PriceStreamService {
  constructor() {
    this.socket = null
    this.prices = {}
    this.subscribers = new Map()
    this.slTpSubscribers = new Map() // Subscribers for SL/TP notifications
    this.accountSubscribers = new Map() // id -> { accountId, callback } for trade open/close pushes
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
  }

  connect() {
    // Reuse a socket that is still connecting. Pages subscribe to prices, SL/TP
    // and account events back to back on mount; creating a fresh socket for each
    // left the earlier ones connected with duplicate handlers, and an account
    // room joined on a socket that was then replaced never received its pushes.
    if (this.socket) {
      if (!this.socket.connected) this.socket.connect()
      return
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    this.socket.on('connect', () => {
      console.log('[PriceStream] Connected to server')
      this.isConnected = true
      this.reconnectAttempts = 0
      // Subscribe to price stream
      this.socket.emit('subscribePrices')
      // Rejoin account rooms — every (re)connect starts with no rooms
      this.accountSubscribers.forEach(({ accountId }) => {
        this.socket.emit('subscribe', { tradingAccountId: accountId })
      })
    })

    this.socket.on('priceStream', (data) => {
      const { prices, updated, timestamp } = data

      // Update local price cache
      if (prices) {
        this.prices = { ...this.prices, ...prices }
      }

      // Notify all subscribers
      this.subscribers.forEach((callback, id) => {
        try {
          callback(this.prices, updated, timestamp)
        } catch (e) {
          console.error('[PriceStream] Subscriber error:', e)
        }
      })
    })

    // Handle individual tick-to-tick price updates
    this.socket.on('priceUpdate', (data) => {
      const { symbol, price } = data
      if (symbol && price) {
        this.prices[symbol] = price
        // Notify subscribers immediately for tick-to-tick
        this.subscribers.forEach((callback, id) => {
          try {
            callback(this.prices, { [symbol]: true }, Date.now())
          } catch (e) {
            console.error('[PriceStream] Subscriber error:', e)
          }
        })
      }
    })

    this.socket.on('disconnect', () => {
      console.log('[PriceStream] Disconnected')
      this.isConnected = false
    })

    this.socket.on('connect_error', (error) => {
      console.error('[PriceStream] Connection error:', error.message)
      this.reconnectAttempts++
    })

    // Listen for SL/TP triggered events from server
    this.socket.on('slTpTriggered', (data) => {
      console.log('[PriceStream] SL/TP triggered:', data)
      // Notify all SL/TP subscribers
      this.slTpSubscribers.forEach((callback, id) => {
        try {
          callback(data)
        } catch (e) {
          console.error('[PriceStream] SL/TP subscriber error:', e)
        }
      })
    })

    // A trade opened or closed on a subscribed account — including copy trades
    // mirrored from a master — so the page can refetch now instead of polling.
    this.socket.on('tradesChanged', (data) => {
      this.accountSubscribers.forEach(({ accountId, callback }) => {
        if (String(accountId) !== String(data?.tradingAccountId)) return
        try {
          callback(data)
        } catch (e) {
          console.error('[PriceStream] Account subscriber error:', e)
        }
      })
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.emit('unsubscribePrices')
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnected = false
    this.subscribers.clear()
  }

  // Close the socket once nothing is listening for anything
  disconnectIfIdle() {
    if (this.subscribers.size === 0 && this.slTpSubscribers.size === 0 && this.accountSubscribers.size === 0) {
      this.disconnect()
    }
  }

  subscribe(id, callback) {
    this.subscribers.set(id, callback)
    // Connect if not already connected
    if (!this.socket?.connected) {
      this.connect()
    }
    // Send current prices immediately
    if (Object.keys(this.prices).length > 0) {
      callback(this.prices, {}, Date.now())
    }
    return () => this.unsubscribe(id)
  }

  unsubscribe(id) {
    this.subscribers.delete(id)
    this.disconnectIfIdle()
  }

  // Subscribe to SL/TP notifications
  subscribeSlTp(id, callback) {
    this.slTpSubscribers.set(id, callback)
    // Connect if not already connected
    if (!this.socket?.connected) {
      this.connect()
    }
    return () => this.unsubscribeSlTp(id)
  }

  // Unsubscribe from SL/TP notifications
  unsubscribeSlTp(id) {
    this.slTpSubscribers.delete(id)
    this.disconnectIfIdle()
  }

  // Subscribe to trade open/close pushes for one trading account
  subscribeAccount(id, accountId, callback) {
    this.accountSubscribers.set(id, { accountId, callback })
    if (this.socket?.connected) {
      this.socket.emit('subscribe', { tradingAccountId: accountId })
    } else {
      this.connect() // the 'connect' handler joins the room
    }
    return () => this.unsubscribeAccount(id)
  }

  unsubscribeAccount(id) {
    const sub = this.accountSubscribers.get(id)
    this.accountSubscribers.delete(id)
    if (sub && this.socket?.connected) {
      const stillWanted = [...this.accountSubscribers.values()]
        .some(s => String(s.accountId) === String(sub.accountId))
      if (!stillWanted) this.socket.emit('unsubscribe', { tradingAccountId: sub.accountId })
    }
    this.disconnectIfIdle()
  }

  getPrice(symbol) {
    return this.prices[symbol] || null
  }

  getAllPrices() {
    return this.prices
  }

  // Calculate PnL for a trade using current prices
  calculatePnl(trade) {
    const prices = this.prices[trade.symbol]
    if (!prices) return 0

    const currentPrice = trade.side === 'BUY' ? prices.bid : prices.ask
    const contractSize = trade.contractSize || 100

    if (trade.side === 'BUY') {
      return (currentPrice - trade.openPrice) * trade.quantity * contractSize
    } else {
      return (trade.openPrice - currentPrice) * trade.quantity * contractSize
    }
  }
}

// Singleton instance
const priceStreamService = new PriceStreamService()

export default priceStreamService
