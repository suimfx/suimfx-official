/**
 * White-label cross-origin session: localStorage is per-origin, so when redirecting
 * from platform host to admin custom domain we pass token + user in the URL hash,
 * then strip it immediately after read (same pattern as OAuth implicit).
 */
const WL_PREFIX = '#wl='

function utf8ToB64 (str) {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary)
}

function b64ToUtf8 (b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** Read #wl=… from URL into localStorage and remove hash from address bar. */
export function consumeWlSessionHandoff () {
  const hash = window.location.hash
  if (!hash.startsWith(WL_PREFIX)) return false
  try {
    const b64 = hash.slice(WL_PREFIX.length)
    const json = b64ToUtf8(b64)
    const { t, u } = JSON.parse(json)
    if (typeof t === 'string' && t.length > 0) {
      localStorage.setItem('token', t)
    }
    if (u != null) {
      localStorage.setItem('user', JSON.stringify(u))
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    return true
  } catch {
    return false
  }
}

/** Build hash fragment carrying current user session (for cross-origin navigation only). */
export function buildWlSessionHash () {
  const t = localStorage.getItem('token')
  if (!t) return ''
  let u = null
  try {
    u = JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    u = null
  }
  const payload = JSON.stringify({ t, u })
  return WL_PREFIX + utf8ToB64(payload)
}

export function originForCustomDomain (customDomain) {
  const host = (customDomain || '').trim().replace(/^https?:\/\//i, '').split('/')[0]
  if (!host) return ''
  const isLocal = host === 'localhost' || host === '127.0.0.1'
  const proto = isLocal ? window.location.protocol : 'https:'
  return `${proto}//${host}`
}
