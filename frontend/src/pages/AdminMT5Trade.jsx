import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import {
  Link2,
  Save,
  Wifi,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  List,
  Plus,
  X
} from 'lucide-react'
import { adminFetch } from '../utils/adminApi'
import { useTheme } from '../context/ThemeContext'

const TABS = [
  { key: 'accounts', label: 'MT5 Accounts' },
  { key: 'users', label: 'A-Book Users' },
  { key: 'failed', label: 'Failed Syncs' },
  { key: 'settings', label: 'Settings' }
]

const money = (n) =>
  n === null || n === undefined
    ? '—'
    : Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const AdminMT5Trade = () => {
  const { isDarkMode } = useTheme()
  const [tab, setTab] = useState('accounts')
  const [msg, setMsg] = useState(null) // { type: 'ok' | 'err', text }
  const [busy, setBusy] = useState('')

  const [settings, setSettings] = useState({ metaApiToken: '', enabled: false, hasToken: false })
  const [showToken, setShowToken] = useState(false)

  const [accounts, setAccounts] = useState([])
  const [newAccount, setNewAccount] = useState({ label: '', metaApiAccountId: '' })
  const [symbolModal, setSymbolModal] = useState(null) // { account, count, suggestedSuffix, symbols }
  const [symbolFilter, setSymbolFilter] = useState('')

  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [taggedFilter, setTaggedFilter] = useState('')

  const [failed, setFailed] = useState([])

  const card = `rounded-xl p-4 border ${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`
  const input = `w-full px-3 py-2 rounded-lg border outline-none focus:border-accent-green ${
    isDarkMode ? 'bg-dark-700 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
  }`
  const btn = 'px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50'

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const call = async (path, options) => {
    const res = await adminFetch(`/mt5${path}`, options)
    return await res.json()
  }

  const loadSettings = async () => {
    const d = await call('/settings')
    if (d.success) setSettings({ ...d.settings })
  }

  const loadAccounts = async () => {
    const d = await call('/accounts')
    if (d.success) setAccounts(d.accounts)
  }

  const loadUsers = async () => {
    const q = new URLSearchParams()
    if (userSearch) q.set('search', userSearch)
    if (taggedFilter) q.set('tagged', taggedFilter)
    const d = await call(`/users?${q}`)
    if (d.success) setUsers(d.users)
  }

  const loadFailed = async () => {
    const d = await call('/sync/failed')
    if (d.success) setFailed(d.trades)
  }

  useEffect(() => {
    loadSettings()
    loadAccounts()
    loadFailed()
  }, [])

  useEffect(() => {
    if (tab === 'users') loadUsers()
    if (tab === 'failed') loadFailed()
  }, [tab, taggedFilter])

  // ─── Settings ──────────────────────────────────────────────────────────────

  const saveSettings = async () => {
    setBusy('settings')
    const d = await call('/settings', {
      method: 'PUT',
      body: JSON.stringify({
        metaApiToken: settings.metaApiToken,
        enabled: settings.enabled
      })
    })
    setBusy('')
    flash(d.success ? 'ok' : 'err', d.message || 'Saved')
    if (d.success) loadSettings()
  }

  // ─── Accounts ──────────────────────────────────────────────────────────────

  const addAccount = async () => {
    if (!newAccount.metaApiAccountId.trim()) return flash('err', 'MetaApi account ID is required')
    setBusy('add')
    const d = await call('/accounts', { method: 'POST', body: JSON.stringify(newAccount) })
    setBusy('')
    if (d.success) {
      setNewAccount({ label: '', metaApiAccountId: '' })
      loadAccounts()
      flash('ok', 'MT5 account added — run Test to verify it connects')
    } else flash('err', d.message)
  }

  const testAccount = async (acc) => {
    setBusy(`test-${acc._id}`)
    const d = await call(`/accounts/${acc._id}/test`, { method: 'POST' })
    setBusy('')
    flash(
      d.success ? 'ok' : 'err',
      d.success ? `Connected — login ${d.info.login} @ ${d.info.server}, balance ${d.info.balance}` : d.message
    )
    loadAccounts()
  }

  const saveAccount = async (acc, patch) => {
    setBusy(`save-${acc._id}`)
    const d = await call(`/accounts/${acc._id}`, { method: 'PUT', body: JSON.stringify(patch) })
    setBusy('')
    flash(d.success ? 'ok' : 'err', d.success ? 'Account updated' : d.message)
    loadAccounts()
  }

  const deleteAccount = async (acc) => {
    if (!confirm(`Remove "${acc.label || acc.metaApiAccountId}"? Tagged users will be untagged.`)) return
    setBusy(`del-${acc._id}`)
    const d = await call(`/accounts/${acc._id}`, { method: 'DELETE' })
    setBusy('')
    flash(d.success ? 'ok' : 'err', d.message)
    loadAccounts()
  }

  const fetchSymbols = async (acc) => {
    setBusy(`sym-${acc._id}`)
    const d = await call(`/accounts/${acc._id}/symbols`)
    setBusy('')
    if (!d.success) return flash('err', d.message)
    setSymbolFilter('')
    setSymbolModal({ account: acc, ...d })
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  const tagUser = async (user, mt5AccountId) => {
    setBusy(`tag-${user._id}`)
    const d = await call(`/users/${user._id}/tag`, {
      method: 'PUT',
      body: JSON.stringify({ mt5AccountId: mt5AccountId || null })
    })
    setBusy('')
    flash(d.success ? 'ok' : 'err', d.message)
    loadUsers()
    loadAccounts()
  }

  const retryFailed = async (t) => {
    setBusy(`retry-${t._id}`)
    const d = await call(`/sync/${t._id}/retry`, { method: 'POST' })
    setBusy('')
    flash(d.success ? 'ok' : 'err', d.message)
    loadFailed()
    loadAccounts()
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const renderSettings = () => (
    <div className={`${card} max-w-2xl space-y-4`}>
      <div>
        <label className="block text-sm text-gray-400 mb-1">MetaApi token</label>
        <div className="flex gap-2">
          <input
            type={showToken ? 'text' : 'password'}
            className={input}
            value={settings.metaApiToken}
            placeholder={settings.hasToken ? 'Saved — leave as-is to keep it' : 'Paste your MetaApi token'}
            onChange={(e) => setSettings({ ...settings, metaApiToken: e.target.value })}
          />
          <button className={`${btn} bg-dark-700 text-gray-300`} onClick={() => setShowToken(!showToken)}>
            {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          app.metaapi.cloud → Token. The saved token is never sent back to this page in full.
        </p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
        />
        <span className="text-sm">Enable MT5 routing</span>
      </label>
      <p className="text-xs text-gray-500 -mt-2">
        Off = tagged users fall back to Corecen. Nothing routes to MT5 until this is on.
      </p>

      <button
        className={`${btn} bg-accent-green text-black flex items-center gap-2`}
        disabled={busy === 'settings'}
        onClick={saveSettings}
      >
        <Save size={16} /> Save
      </button>
    </div>
  )

  const renderAccounts = () => (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Plus size={16} /> Connect an MT5 account
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className={input}
            placeholder="Label (e.g. Hedge Account 1)"
            value={newAccount.label}
            onChange={(e) => setNewAccount({ ...newAccount, label: e.target.value })}
          />
          <input
            className={input}
            placeholder="MetaApi account ID"
            value={newAccount.metaApiAccountId}
            onChange={(e) => setNewAccount({ ...newAccount, metaApiAccountId: e.target.value })}
          />
          <button
            className={`${btn} bg-accent-green text-black whitespace-nowrap`}
            disabled={busy === 'add'}
            onClick={addAccount}
          >
            Add
          </button>
        </div>
      </div>

      {accounts.length === 0 && (
        <div className={`${card} text-center text-gray-500 py-8`}>No MT5 accounts connected yet.</div>
      )}

      {accounts.map((acc) => (
        <div key={acc._id} className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-medium flex items-center gap-2">
                <Link2 size={16} className="text-accent-green" />
                {acc.label || '(no label)'}
                {!acc.isActive && <span className="text-xs text-orange-400">· inactive</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1">{acc.metaApiAccountId}</div>
              {acc.login && (
                <div className="text-xs text-gray-400 mt-1">
                  login {acc.login} @ {acc.server}
                </div>
              )}
              {acc.lastError && (
                <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <XCircle size={12} /> {acc.lastError}
                </div>
              )}
              {!acc.lastError && acc.lastCheckedAt && (
                <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <CheckCircle size={12} /> verified {new Date(acc.lastCheckedAt).toLocaleString()}
                </div>
              )}
            </div>

            <div className="text-right text-xs text-gray-400">
              {acc.balance !== null && acc.balance !== undefined && (
                <div className="mb-2">
                  <div className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {money(acc.balance)} {acc.currency}
                  </div>
                  <div>equity {money(acc.equity)}</div>
                </div>
              )}
              <div>{acc.taggedUsers} tagged user(s)</div>
              <div>{acc.openTrades} open position(s)</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Suffix</span>
              <input
                className={`${input} !w-28`}
                defaultValue={acc.symbolSuffix}
                placeholder="none"
                onBlur={(e) =>
                  e.target.value !== (acc.symbolSuffix || '') &&
                  saveAccount(acc, { symbolSuffix: e.target.value })
                }
              />
            </div>
            <button
              className={`${btn} bg-dark-700 text-gray-200 flex items-center gap-1`}
              disabled={busy === `test-${acc._id}`}
              onClick={() => testAccount(acc)}
            >
              <Wifi size={14} /> {busy === `test-${acc._id}` ? 'Connecting…' : 'Test'}
            </button>
            <button
              className={`${btn} bg-dark-700 text-gray-200 flex items-center gap-1`}
              disabled={busy === `sym-${acc._id}`}
              onClick={() => fetchSymbols(acc)}
            >
              <List size={14} /> {busy === `sym-${acc._id}` ? 'Loading…' : 'Symbols'}
            </button>
            <button
              className={`${btn} bg-dark-700 text-gray-200`}
              onClick={() => saveAccount(acc, { isActive: !acc.isActive })}
            >
              {acc.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button
              className={`${btn} bg-red-500/10 text-red-400 flex items-center gap-1`}
              disabled={busy === `del-${acc._id}`}
              onClick={() => deleteAccount(acc)}
            >
              <Trash2 size={14} /> Remove
            </button>
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-500">
        Test also refreshes the balance shown above — it is as fresh as the last check, not live.
        First Test on a fresh account can take 30–60s, MetaApi has to deploy it before it will answer.
      </p>
    </div>
  )

  const renderUsers = () => (
    <div className="space-y-4">
      <div className={`${card} flex flex-col sm:flex-row gap-2`}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-gray-500" />
          <input
            className={`${input} pl-9`}
            placeholder="Search name or email"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
          />
        </div>
        <select className={`${input} sm:!w-48`} value={taggedFilter} onChange={(e) => setTaggedFilter(e.target.value)}>
          <option value="">All A-Book users</option>
          <option value="true">Tagged only</option>
          <option value="false">Untagged only</option>
        </select>
        <button className={`${btn} bg-dark-700 text-gray-200 flex items-center gap-1`} onClick={loadUsers}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className={`${card} !p-0 overflow-hidden`}>
        <table className="w-full text-sm">
          <thead className={isDarkMode ? 'bg-dark-700' : 'bg-gray-50'}>
            <tr className="text-left text-gray-400">
              <th className="p-3 font-medium">User</th>
              <th className="p-3 font-medium">Broker</th>
              <th className="p-3 font-medium">MT5 account</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-500">
                  No A-Book users found.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u._id} className="border-t border-gray-800">
                <td className="p-3">
                  <div>{u.firstName}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </td>
                <td className="p-3 text-xs text-gray-400">
                  {u.assignedAdmin?.brandName || u.assignedAdmin?.email || 'Platform'}
                </td>
                <td className="p-3">
                  <select
                    className={`${input} !w-56`}
                    value={u.mt5AccountId?._id || ''}
                    disabled={busy === `tag-${u._id}`}
                    onChange={(e) => tagUser(u, e.target.value)}
                  >
                    <option value="">— not tagged (Corecen) —</option>
                    {accounts.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.label || a.metaApiAccountId}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Every A-Book user on the platform is listed here, across all brokers — the hedge risk is platform-level.
        Untagged users keep routing to Corecen.
      </p>
    </div>
  )

  const renderFailed = () => (
    <div className="space-y-4">
      <div className={`${card} flex items-center justify-between`}>
        <div className="text-sm">
          {failed.length === 0
            ? 'No failed hedges.'
            : `${failed.length} trade(s) opened on the platform but never reached a hedge venue.`}
        </div>
        <button className={`${btn} bg-dark-700 text-gray-200 flex items-center gap-1`} onClick={loadFailed}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {failed.length > 0 && (
        <div className={`${card} !p-0 overflow-hidden`}>
          <table className="w-full text-sm">
            <thead className={isDarkMode ? 'bg-dark-700' : 'bg-gray-50'}>
              <tr className="text-left text-gray-400">
                <th className="p-3 font-medium">Trade</th>
                <th className="p-3 font-medium">User</th>
                <th className="p-3 font-medium">Why it failed</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {failed.map((t) => (
                <tr key={t._id} className="border-t border-gray-800 align-top">
                  <td className="p-3">
                    <div>
                      {t.symbol} {t.side} {t.quantity}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t.tradeId} · {t.status}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-gray-400">{t.userId?.email || '—'}</td>
                  <td className="p-3 text-xs text-red-400 max-w-md">{t.aBookError || 'unknown'}</td>
                  <td className="p-3">
                    {t.status === 'OPEN' ? (
                      <button
                        className={`${btn} bg-dark-700 text-gray-200`}
                        disabled={busy === `retry-${t._id}`}
                        onClick={() => retryFailed(t)}
                      >
                        {busy === `retry-${t._id}` ? 'Retrying…' : 'Retry'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-600">closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500">
        An open trade here is live unhedged exposure. Fix the cause first — usually the account's symbol suffix or
        its balance — then Retry. Closed trades cannot be retried: there is nothing left to hedge.
      </p>
    </div>
  )

  const renderSymbolModal = () => {
    const shown = symbolModal.symbols.filter((s) => s.toLowerCase().includes(symbolFilter.toLowerCase()))
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className={`${card} w-full max-w-lg max-h-[80vh] flex flex-col`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">
              {symbolModal.account.label || symbolModal.account.metaApiAccountId} — {symbolModal.count} symbols
            </h3>
            <button onClick={() => setSymbolModal(null)} className="text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="mb-3 text-sm">
            Detected suffix:{' '}
            <code className="px-2 py-0.5 rounded bg-dark-700 text-accent-green">
              {symbolModal.suggestedSuffix || '(none)'}
            </code>
            <button
              className={`${btn} bg-accent-green text-black ml-2 !py-1`}
              onClick={() => {
                saveAccount(symbolModal.account, { symbolSuffix: symbolModal.suggestedSuffix })
                setSymbolModal(null)
              }}
            >
              Apply
            </button>
          </div>

          <input
            className={`${input} mb-2`}
            placeholder="Filter symbols…"
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
          />
          <div className="overflow-y-auto text-sm font-mono text-gray-300 space-y-0.5">
            {shown.map((s) => (
              <div key={s}>{s}</div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6">
        <h1 className="text-xl font-semibold mb-1">MT5 Trade</h1>
        <p className="text-sm text-gray-500 mb-4">
          Route A-Book users' trades to real MT5 accounts via MetaApi.
        </p>

        {msg && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              msg.type === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="flex gap-6 border-b border-gray-800 mb-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 px-1 font-medium transition-colors relative ${
                tab === t.key ? 'text-accent-green' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
              {t.key === 'failed' && failed.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                  {failed.length}
                </span>
              )}
              {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-green" />}
            </button>
          ))}
        </div>

        {tab === 'settings' && renderSettings()}
        {tab === 'accounts' && renderAccounts()}
        {tab === 'users' && renderUsers()}
        {tab === 'failed' && renderFailed()}

        {symbolModal && renderSymbolModal()}
      </div>
    </AdminLayout>
  )
}

export default AdminMT5Trade
