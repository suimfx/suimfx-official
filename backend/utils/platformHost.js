/**
 * Which hostnames belong to the platform itself, as opposed to a broker's
 * custom domain.
 *
 * This is load-bearing for white-labelling: any host NOT on this list is looked
 * up as a tenant custom domain, so a main domain missing here resolves as
 * "somebody's tenant" (or as nobody) and the whole site shows the wrong brand.
 *
 * Set PLATFORM_DOMAINS in .env (comma-separated, bare domains) to change this
 * without a code deploy. Subdomains are covered automatically, so listing
 * `forexmt24.com` also matches api./trade./admin./www. of it.
 */

const DEFAULT_PLATFORM_DOMAINS = ['forexmt24.com', 'suimfx.com']

function parseDomains (raw) {
  return String(raw || '')
    .split(',')
    .map(d => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, ''))
    .filter(Boolean)
}

const configured = parseDomains(process.env.PLATFORM_DOMAINS)

export const PLATFORM_DOMAINS = configured.length ? configured : DEFAULT_PLATFORM_DOMAINS

/** True for the platform's own hosts, including every subdomain of them. */
export function isPlatformHost (hostname) {
  const h = String(hostname || '').toLowerCase().trim().replace(/:\d+$/, '')
  if (!h) return false
  return PLATFORM_DOMAINS.some(d => h === d || h.endsWith(`.${d}`))
}

/** Hostname of an Origin header value; '' when missing or malformed. */
export function originHost (origin) {
  try {
    return new URL(origin).hostname.toLowerCase()
  } catch {
    return ''
  }
}

/** https:// origins for every platform host, for the CORS allowlist. */
export function platformOrigins () {
  return PLATFORM_DOMAINS.flatMap(d =>
    [d, `www.${d}`, `trade.${d}`, `admin.${d}`, `api.${d}`].map(h => `https://${h}`)
  )
}
