import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Check,
  X,
  Clock,
  ExternalLink,
  QrCode
} from 'lucide-react'
import { API_URL } from '../config/api'
import { getAdminHeaders } from '../utils/adminApi'

const explorerUrl = (network, hash) => {
  const map = {
    BEP20: `https://bscscan.com/tx/${hash}`,
    ERC20: `https://etherscan.io/tx/${hash}`,
    TRC20: `https://tronscan.org/#/transaction/${hash}`,
    Bitcoin: `https://blockchain.com/btc/tx/${hash}`,
    Solana: `https://solscan.io/tx/${hash}`
  }
  return map[network] || null
}

export default function AdminManualCrypto() {
  const [activeTab, setActiveTab] = useState('wallets')
  const [wallets, setWallets] = useState([])
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [depositFilter, setDepositFilter] = useState('Pending')
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [form, setForm] = useState({
    currency: 'USDT',
    network: 'BEP20',
    address: '',
    qrCodeData: '',
    displayName: '',
    feePercentage: 0.5,
    minDeposit: 10,
    maxDeposit: 50000,
    instructions:
      'Send the total amount (deposit + fee) to the address. Then submit your transaction hash on the Wallet page.'
  })

  useEffect(() => {
    if (activeTab === 'wallets') fetchWallets()
    else fetchDeposits()
  }, [activeTab, depositFilter])

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: '', text: '' }), 4000)
  }

  const fetchWallets = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/manual-crypto/admin/wallets`, { headers: getAdminHeaders() })
      const data = await res.json()
      if (data.success) setWallets(data.wallets || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const fetchDeposits = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API_URL}/manual-crypto/admin/pending-deposits?status=${depositFilter}`,
        { headers: getAdminHeaders() }
      )
      const data = await res.json()
      if (data.success) setDeposits(data.deposits || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const saveWallet = async () => {
    try {
      const url = editing
        ? `${API_URL}/manual-crypto/admin/wallets/${editing._id}`
        : `${API_URL}/manual-crypto/admin/wallets`
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        flash('ok', editing ? 'Wallet updated' : 'Wallet created')
        setShowModal(false)
        setEditing(null)
        resetForm()
        fetchWallets()
      } else {
        flash('err', data.message || 'Failed')
      }
    } catch (e) {
      flash('err', 'Request failed')
    }
  }

  const deleteWallet = async (id) => {
    if (!confirm('Delete this wallet?')) return
    try {
      const res = await fetch(`${API_URL}/manual-crypto/admin/wallets/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      })
      const data = await res.json()
      if (data.success) {
        flash('ok', 'Deleted')
        fetchWallets()
      } else flash('err', data.message)
    } catch (e) {
      flash('err', 'Delete failed')
    }
  }

  const toggleActive = async (w) => {
    try {
      const res = await fetch(`${API_URL}/manual-crypto/admin/wallets/${w._id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ isActive: !w.isActive })
      })
      const data = await res.json()
      if (data.success) fetchWallets()
    } catch (e) {}
  }

  const approveDeposit = async (txnId) => {
    try {
      const res = await fetch(`${API_URL}/wallet/transaction/${txnId}/approve`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ adminRemarks: 'Manual crypto deposit verified' })
      })
      if (res.ok) {
        flash('ok', 'Deposit approved & wallet credited')
        fetchDeposits()
      } else {
        const data = await res.json()
        flash('err', data.message || 'Approve failed')
      }
    } catch (e) {
      flash('err', 'Approve failed')
    }
  }

  const rejectDeposit = async (txnId) => {
    const reason = prompt('Rejection reason:')
    if (reason == null) return
    try {
      const res = await fetch(`${API_URL}/wallet/transaction/${txnId}/reject`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ adminRemarks: reason })
      })
      if (res.ok) {
        flash('ok', 'Deposit rejected')
        fetchDeposits()
      } else {
        const data = await res.json()
        flash('err', data.message || 'Reject failed')
      }
    } catch (e) {
      flash('err', 'Reject failed')
    }
  }

  const resetForm = () => {
    setForm({
      currency: 'USDT',
      network: 'BEP20',
      address: '',
      qrCodeData: '',
      displayName: '',
      feePercentage: 0.5,
      minDeposit: 10,
      maxDeposit: 50000,
      instructions:
        'Send the total amount (deposit + fee) to the address. Then submit your transaction hash on the Wallet page.'
    })
  }

  const openEdit = (w) => {
    setEditing(w)
    setForm({
      currency: w.currency,
      network: w.network,
      address: w.address,
      qrCodeData: w.qrCodeData || '',
      displayName: w.displayName || '',
      feePercentage: w.feePercentage,
      minDeposit: w.minDeposit,
      maxDeposit: w.maxDeposit,
      instructions: w.instructions
    })
    setShowModal(true)
  }

  const onQr = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setForm((f) => ({ ...f, qrCodeData: reader.result }))
    reader.readAsDataURL(file)
  }

  const pendingCount = deposits.filter((d) => d.status === 'Pending').length

  return (
    <AdminLayout title="Manual crypto" subtitle="Deposit addresses & pending crypto deposits">
      {msg.text && (
        <div
          className={`mb-4 p-3 rounded-lg border ${
            msg.type === 'ok'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('wallets')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'wallets' ? 'bg-purple-600 text-white' : 'bg-dark-700 text-gray-400'
          }`}
        >
          Wallets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('deposits')}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
            activeTab === 'deposits' ? 'bg-purple-600 text-white' : 'bg-dark-700 text-gray-400'
          }`}
        >
          <Clock size={16} />
          Deposits
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{pendingCount}</span>
          )}
        </button>
      </div>

      {activeTab === 'wallets' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => {
                resetForm()
                setEditing(null)
                setShowModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
            >
              <Plus size={18} /> Add wallet
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <RefreshCw className="animate-spin text-purple-500" size={32} />
            </div>
          ) : wallets.length === 0 ? (
            <div className="bg-dark-800 border border-gray-800 rounded-xl p-12 text-center text-gray-500">
              No manual crypto wallets. Add USDT/BTC addresses for users to pay on-chain.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wallets.map((w) => (
                <div
                  key={w._id}
                  className={`bg-dark-800 border border-gray-800 rounded-xl p-4 ${!w.isActive ? 'opacity-50' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xl font-bold text-white">{w.currency}</span>
                      <span className="ml-2 text-xs text-gray-500">{w.network}</span>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => openEdit(w)} className="p-2 hover:bg-dark-700 rounded">
                        <Edit2 size={16} className="text-gray-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteWallet(w._id)}
                        className="p-2 hover:bg-red-500/20 rounded"
                      >
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 break-all font-mono mb-2">{w.address}</p>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>Fee: {w.feePercentage}% · Min ${w.minDeposit} · Max ${w.maxDeposit}</p>
                    <p>{w.displayName || `${w.currency} (${w.network})`}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleActive(w)}
                    className="mt-3 text-xs text-purple-400 hover:underline"
                  >
                    {w.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'deposits' && (
        <div>
          <div className="flex gap-2 mb-4">
            {['Pending', 'Approved', 'Rejected', 'all'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setDepositFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  depositFilter === f ? 'bg-purple-600 text-white' : 'bg-dark-700 text-gray-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <RefreshCw className="animate-spin mx-auto my-12 text-purple-500" size={32} />
          ) : (
            <div className="overflow-x-auto border border-gray-800 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-gray-500">
                    <th className="p-3">User</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Crypto</th>
                    <th className="p-3">Tx hash</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((d) => {
                    const u = d.userId
                    const ex = explorerUrl(d.cryptoNetwork, d.cryptoTxHash)
                    return (
                      <tr key={d._id} className="border-b border-gray-800/80">
                        <td className="p-3 text-white">
                          {u?.firstName} {u?.lastName}
                          <div className="text-xs text-gray-500">{u?.email}</div>
                        </td>
                        <td className="p-3 text-green-400">${d.amount?.toFixed(2)}</td>
                        <td className="p-3">
                          {d.cryptoCurrency} / {d.cryptoNetwork}
                          <div className="text-xs text-gray-500">Fee ${d.feeAmount} · Paid ${d.totalPaid}</div>
                        </td>
                        <td className="p-3 font-mono text-xs max-w-[140px] truncate" title={d.cryptoTxHash}>
                          {d.cryptoTxHash}
                          {ex && (
                            <a
                              href={ex}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-purple-400 mt-1"
                            >
                              Explorer <ExternalLink size={12} className="inline" />
                            </a>
                          )}
                        </td>
                        <td className="p-3">{d.status}</td>
                        <td className="p-3">
                          {d.status === 'Pending' && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => approveDeposit(d._id)}
                                className="p-1.5 bg-green-500/20 text-green-400 rounded"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => rejectDeposit(d._id)}
                                className="p-1.5 bg-red-500/20 text-red-400 rounded"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {deposits.length === 0 && (
                <p className="p-8 text-center text-gray-500">No deposits for this filter.</p>
              )}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-white mb-4">{editing ? 'Edit wallet' : 'Add wallet'}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-500 text-xs">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    {['USDT', 'BTC', 'ETH', 'BNB', 'TRX', 'LTC', 'DOGE', 'SOL'].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Network</label>
                  <select
                    value={form.network}
                    onChange={(e) => setForm({ ...form, network: e.target.value })}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    {['TRC20', 'ERC20', 'BEP20', 'Bitcoin', 'Ethereum', 'Solana', 'Litecoin', 'Dogecoin'].map(
                      (n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs">Display name (optional)</label>
                <input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-gray-500 text-xs">Fee %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.feePercentage}
                    onChange={(e) => setForm({ ...form, feePercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Min $</label>
                  <input
                    type="number"
                    value={form.minDeposit}
                    onChange={(e) => setForm({ ...form, minDeposit: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Max $</label>
                  <input
                    type="number"
                    value={form.maxDeposit}
                    onChange={(e) => setForm({ ...form, maxDeposit: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Instructions (shown to users)</label>
                <textarea
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  rows={3}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs flex items-center gap-2">
                  <QrCode size={14} /> QR (optional)
                </label>
                <input type="file" accept="image/*" onChange={onQr} className="text-gray-400 text-sm mt-1" />
                {form.qrCodeData && (
                  <img src={form.qrCodeData} alt="" className="mt-2 max-h-32 rounded border border-gray-600" />
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  setEditing(null)
                }}
                className="flex-1 py-3 bg-dark-700 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveWallet}
                className="flex-1 py-3 bg-purple-600 text-white font-medium rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
