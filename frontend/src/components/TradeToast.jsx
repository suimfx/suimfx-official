import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Buy/sell confirmation popup + chime, shared by desktop and mobile trading.
 *
 * Rendered through a portal on document.body. The trading pages nest their
 * notification areas inside overflow-hidden flex containers, and a
 * `position: fixed` child gets clipped there the moment any ancestor gains a
 * transform or backdrop-filter — which is how the old popups went missing.
 */

const listeners = new Set()
let nextId = 0

/** Raise a confirmation for the `trade` returned by POST /trade/open. */
export function showTradeToast(trade) {
  if (!trade) return
  const toast = { id: ++nextId, trade }
  listeners.forEach(fn => fn(toast))
  playTradeSound(trade.side)
}

let audioCtx = null

function getAudioCtx () {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  audioCtx = audioCtx || new Ctx()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

// iOS Safari only lets audio start inside a user gesture, but the chime plays
// after the awaited order request — outside it. Resuming on every tap keeps the
// context unlocked, including after the phone suspends it in the background.
window.addEventListener('pointerdown', () => { try { getAudioCtx() } catch {} }, { passive: true })

// Synthesised two-note chime — rising for BUY, falling for SELL — so the side
// is recognisable by ear. Web Audio needs no sound file and no dependency.
function playTradeSound(side) {
  try {
    if (!getAudioCtx()) return

    const notes = side === 'SELL' ? [880, 587] : [587, 880]
    notes.forEach((freq, i) => {
      const start = audioCtx.currentTime + i * 0.13
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22)
      osc.connect(gain).connect(audioCtx.destination)
      osc.start(start)
      osc.stop(start + 0.25)
    })
  } catch {
    // Audio blocked or unsupported — the popup still shows.
  }
}

function formatPrice (p) {
  if (p == null || isNaN(p)) return '—'
  const n = Number(p)
  return n.toFixed(n >= 1000 ? 2 : n >= 10 ? 3 : 5)
}

function formatTime (value) {
  const d = value ? new Date(value) : new Date()
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function TradeToasts () {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const add = toast => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 4500)
    }
    listeners.add(add)
    return () => listeners.delete(add)
  }, [])

  const dismiss = id => setToasts(prev => prev.filter(t => t.id !== id))

  if (!toasts.length) return null

  return createPortal(
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map(({ id, trade }) => {
        const isBuy = trade.side === 'BUY'
        const pending = trade.status === 'PENDING'
        const label = pending ? String(trade.orderType || trade.side).replace('_', ' ') : trade.side
        const price = pending ? trade.pendingPrice : trade.openPrice
        const time = formatTime(pending ? trade.createdAt : trade.openedAt)

        return (
          <div
            key={id}
            onClick={() => dismiss(id)}
            className={`pointer-events-auto cursor-pointer animate-slide-down motion-reduce:animate-none rounded-xl shadow-2xl text-white px-4 py-3 ${isBuy ? 'bg-theme-buy' : 'bg-theme-sell'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold tracking-wider uppercase bg-white/20 rounded px-2 py-0.5">
                {label}
              </span>
              <span className="text-xs font-mono tabular-nums opacity-90">{time}</span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <span className="text-base font-bold">{trade.symbol}</span>
              <span className="text-sm font-mono tabular-nums">
                {trade.quantity} lots @ {formatPrice(price)}
              </span>
            </div>
            <div className="mt-0.5 text-xs opacity-90">{pending ? 'Order placed' : 'Order executed'}</div>
          </div>
        )
      })}
    </div>,
    document.body
  )
}
