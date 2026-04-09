export function normalizeHost (h) {
  if (!h) return ''
  return String(h).replace(/^www\./i, '').toLowerCase()
}

export function isPlatformHost (hostname) {
  const h = (hostname || '').toLowerCase()
  return h === 'suimfx.com' || h.endsWith('.suimfx.com')
}

export function isLocalDevHost (hostname) {
  const h = (hostname || '').toLowerCase()
  return h === 'localhost' || h === '127.0.0.1'
}

/** True when current host matches admin's custom domain (not platform main site). */
export function hostsMatchBrandDomain (currentHostname, brandCustomDomain) {
  const h = normalizeHost(currentHostname)
  const raw = (brandCustomDomain || '').trim().replace(/^https?:\/\//i, '').split('/')[0]
  const d = normalizeHost(raw)
  return Boolean(d && h === d)
}
