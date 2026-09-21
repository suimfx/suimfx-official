/**
 * The platform's own domains, as opposed to a broker's custom domain.
 *
 * Load-bearing for white-labelling: a host that is NOT listed here is treated
 * as a tenant custom domain, so leaving a main domain out makes the main site
 * resolve as somebody else's brand. Keep this in step with the backend's
 * PLATFORM_DOMAINS (backend/utils/platformHost.js).
 */
export const PLATFORM_DOMAINS = ['forexmt24.com']

export function normalizeHost (h) {
  if (!h) return ''
  return String(h).replace(/^www\./i, '').toLowerCase()
}

/** True for the platform's own hosts, including every subdomain of them. */
export function isPlatformHost (hostname) {
  const h = String(hostname || '').toLowerCase().trim()
  if (!h) return false
  return PLATFORM_DOMAINS.some(d => h === d || h.endsWith(`.${d}`))
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
