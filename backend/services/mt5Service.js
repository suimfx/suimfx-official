import { createRequire } from 'module'
import MtSettings from '../models/MtSettings.js'
import lpService from './lpService.js'

// metaapi.cloud-sdk's ESM entry ("dists/esm-web") is a browser bundle that
// throws under Node — only the CJS build loads. Same workaround the earlier
// MetaApi price feed used (git 22c791f).
const require = createRequire(import.meta.url)
let MetaApi = null
const loadSdk = () => (MetaApi ||= require('metaapi.cloud-sdk').default)

class MT5Service {
  constructor() {
    // metaApiAccountId -> Promise<RPCConnection>. The promise (not the resolved
    // connection) is cached so two trades opening at once share one deploy
    // instead of both paying the 30-60s waitDeployed().
    this.connections = new Map()
    this.client = null
    this.clientToken = ''
  }

  async getSettings() {
    return await MtSettings.findOne({ key: 'metaapi_config' }).lean()
  }

  async isConfigured() {
    const s = await this.getSettings()
    return !!(s?.enabled && s.metaApiToken)
  }

  async _client() {
    const s = await this.getSettings()
    if (!s?.enabled || !s.metaApiToken) return null
    // Token changed under us — drop every pooled connection, they authenticated
    // with the old one.
    if (!this.client || this.clientToken !== s.metaApiToken) {
      this.client = new (loadSdk())(s.metaApiToken, s.region ? { region: s.region } : {})
      this.clientToken = s.metaApiToken
      this.connections.clear()
    }
    return this.client
  }

  async _connect(metaApiAccountId) {
    const api = await this._client()
    if (!api) throw new Error('MetaApi is not configured or is disabled')

    const account = await api.metatraderAccountApi.getAccount(metaApiAccountId)
    if (account.state !== 'DEPLOYED') {
      await account.deploy()
      await account.waitDeployed()
    }
    const conn = account.getRPCConnection()
    await conn.connect()
    await conn.waitSynchronized()
    return conn
  }

  getConnection(metaApiAccountId) {
    if (!this.connections.has(metaApiAccountId)) {
      this.connections.set(
        metaApiAccountId,
        this._connect(metaApiAccountId).catch((e) => {
          // Don't cache a failed connect — the next call should retry.
          this.connections.delete(metaApiAccountId)
          throw e
        })
      )
    }
    return this.connections.get(metaApiAccountId)
  }

  dropConnection(metaApiAccountId) {
    this.connections.delete(metaApiAccountId)
  }

  // Our symbol -> the broker's symbol. Explicit override wins, else suffix.
  // Handles both a hydrated Map and the plain object a .lean() query returns.
  mapSymbol(symbol, account) {
    const ov = account?.symbolOverrides
    const hit = ov instanceof Map ? ov.get(symbol) : ov?.[symbol]
    return hit || `${symbol}${account?.symbolSuffix || ''}`
  }

  // ponytail: assumes the universal 0.01 lot step. Read the symbol spec
  // (conn.getSymbolSpecification) if a broker ever uses a different min/step.
  normalizeVolume(quantity) {
    return Math.max(0.01, Math.round(Number(quantity) * 100) / 100)
  }

  async pushTrade(trade, user, account) {
    // Demo volume must never reach a live MT5 account. Reuses lpService's guard
    // rather than copying it, so the two routes can't drift apart.
    if (await lpService._isDemoTrade(trade)) {
      return { success: false, message: 'Demo-account trades are not routed to MT5' }
    }
    try {
      const conn = await this.getConnection(account.metaApiAccountId)
      const symbol = this.mapSymbol(trade.symbol, account)
      const volume = this.normalizeVolume(trade.quantity)
      const sl = (trade.sl || trade.stopLoss) > 0 ? trade.sl || trade.stopLoss : undefined
      const tp = (trade.tp || trade.takeProfit) > 0 ? trade.tp || trade.takeProfit : undefined
      // clientId is what ties an MT5 position back to our trade during reconciliation.
      const options = { clientId: trade.tradeId, comment: `suimfx ${trade.tradeId}` }

      const result =
        String(trade.side).toUpperCase() === 'BUY'
          ? await conn.createMarketBuyOrder(symbol, volume, sl, tp, options)
          : await conn.createMarketSellOrder(symbol, volume, sl, tp, options)

      const positionId = result?.positionId || result?.orderId || null
      console.log(`[MT5] Pushed ${trade.tradeId} -> ${symbol} ${volume} lots, position ${positionId}`)
      return { success: true, positionId, data: result }
    } catch (error) {
      console.error(`[MT5] Push failed for ${trade.tradeId}:`, error.message)
      return { success: false, error: error.message }
    }
  }

  async closeTrade(trade, account) {
    if (!trade.aBookOrderId) {
      return { success: false, message: 'Trade has no MT5 position id — it was never pushed' }
    }
    try {
      const conn = await this.getConnection(account.metaApiAccountId)
      await conn.closePosition(trade.aBookOrderId)
      console.log(`[MT5] Closed ${trade.tradeId} (position ${trade.aBookOrderId})`)
      return { success: true }
    } catch (error) {
      // Already gone on the MT5 side (SL/TP or manual close) — our books are
      // still correct, so don't treat it as a failure the admin must chase.
      if (/not found|does not exist/i.test(error.message)) {
        console.warn(`[MT5] Position ${trade.aBookOrderId} already closed on MT5`)
        return { success: true, warning: 'Position was already closed on MT5' }
      }
      console.error(`[MT5] Close failed for ${trade.tradeId}:`, error.message)
      return { success: false, error: error.message }
    }
  }

  async updateTrade(trade, account) {
    if (!trade.aBookOrderId) return { success: false, message: 'Trade has no MT5 position id' }
    try {
      const conn = await this.getConnection(account.metaApiAccountId)
      await conn.modifyPosition(
        trade.aBookOrderId,
        (trade.sl || trade.stopLoss) > 0 ? trade.sl || trade.stopLoss : undefined,
        (trade.tp || trade.takeProfit) > 0 ? trade.tp || trade.takeProfit : undefined
      )
      return { success: true }
    } catch (error) {
      console.error(`[MT5] SL/TP update failed for ${trade.tradeId}:`, error.message)
      return { success: false, error: error.message }
    }
  }

  async getSymbols(metaApiAccountId) {
    const conn = await this.getConnection(metaApiAccountId)
    return await conn.getSymbols()
  }

  async getPositions(metaApiAccountId) {
    const conn = await this.getConnection(metaApiAccountId)
    return await conn.getPositions()
  }

  async testConnection(metaApiAccountId) {
    try {
      const conn = await this.getConnection(metaApiAccountId)
      const info = await conn.getAccountInformation()
      return {
        success: true,
        login: String(info.login || ''),
        server: info.server || '',
        balance: info.balance,
        equity: info.equity,
        currency: info.currency,
      }
    } catch (error) {
      this.dropConnection(metaApiAccountId)
      return { success: false, error: error.message }
    }
  }
}

export default new MT5Service()
