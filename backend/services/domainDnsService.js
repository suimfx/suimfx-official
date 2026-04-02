import dns from 'dns/promises'

/**
 * Strip URL noise; return hostname or null.
 */
export function normalizeDomain(input) {
  if (!input || typeof input !== 'string') return null
  let s = input.trim().toLowerCase()
  s = s.replace(/^https?:\/\//, '')
  s = s.split('/')[0]
  s = s.split(':')[0].replace(/\.$/, '')
  if (!s || s.includes(' ') || !s.includes('.')) return null
  if (s.length > 253) return null
  const labels = s.split('.')
  if (labels.some((l) => !l || l.length > 63)) return null
  if (!/^[a-z0-9.-]+$/.test(s)) return null
  return s
}

function normHost(h) {
  return (h || '').toLowerCase().replace(/\.$/, '')
}

export function getPlatformTargets() {
  const cname = process.env.CUSTOM_DOMAIN_CNAME_TARGET?.trim() || ''
  const ip = process.env.CUSTOM_DOMAIN_TARGET_IP?.trim() || ''
  return { cnameTarget: normHost(cname), ipTarget: ip }
}

export function buildRequiredRecords(hostname, verificationToken) {
  const { cnameTarget, ipTarget } = getPlatformTargets()
  const records = []
  const txtName = `_suimfx-verify.${hostname}`
  const txtValue = `suimfx-verify=${verificationToken}`

  if (cnameTarget) {
    records.push({
      type: 'CNAME',
      host: 'www',
      name: hostname,
      value: cnameTarget,
      hint: 'Create a CNAME from this hostname to the target below.'
    })
    // Also add root A record if IP is set
    if (ipTarget) {
      records.push({
        type: 'A',
        host: '@',
        name: hostname,
        value: ipTarget,
        hint: 'Point root domain (A record) to the server IP.'
      })
    }
  } else if (ipTarget) {
    records.push({
      type: 'A',
      host: '@',
      name: hostname,
      value: ipTarget,
      hint: 'Point this hostname (A record) to the IP below.'
    })
  } else {
    records.push({
      type: 'A',
      host: '@',
      name: hostname,
      value: '',
      hint: 'Server admin must set CUSTOM_DOMAIN_CNAME_TARGET or CUSTOM_DOMAIN_TARGET_IP in backend .env file.',
      missingPlatformTarget: true
    })
  }

  records.push({
    type: 'TXT',
    host: `_suimfx-verify`,
    name: txtName,
    value: txtValue,
    hint: 'Add this TXT record for domain ownership verification.'
  })

  return records
}

/**
 * Detect domain provider from nameservers
 */
export async function detectProvider(hostname) {
  try {
    // Get root domain for NS lookup
    const parts = hostname.split('.')
    const rootDomain = parts.length >= 2 ? parts.slice(-2).join('.') : hostname
    const ns = await dns.resolveNs(rootDomain)
    const nsStr = (ns || []).join(' ').toLowerCase()

    let provider = 'Unknown'
    if (nsStr.includes('godaddy') || nsStr.includes('domaincontrol')) provider = 'GoDaddy'
    else if (nsStr.includes('namecheap') || nsStr.includes('registrar-servers')) provider = 'Namecheap'
    else if (nsStr.includes('cloudflare')) provider = 'Cloudflare'
    else if (nsStr.includes('google') || nsStr.includes('googledomains')) provider = 'Google Domains'
    else if (nsStr.includes('route53') || nsStr.includes('awsdns')) provider = 'AWS Route53'
    else if (nsStr.includes('digitalocean')) provider = 'DigitalOcean'
    else if (nsStr.includes('bluehost')) provider = 'Bluehost'
    else if (nsStr.includes('hostgator')) provider = 'HostGator'

    return { nameservers: ns, provider }
  } catch (e) {
    return { nameservers: [], provider: 'Unknown' }
  }
}

/**
 * Resolve current DNS and compare to expected routing + TXT token.
 */
export async function refreshDnsCheck(hostname, verificationToken) {
  const { cnameTarget, ipTarget } = getPlatformTargets()
  const snapshot = {
    checkedAt: new Date().toISOString(),
    cnameRecords: [],
    aRecords: [],
    txtRecords: [],
    errors: []
  }

  let cnameOk = false
  let aOk = false
  let txtOk = false

  // Check CNAME
  try {
    const cn = await dns.resolveCname(hostname)
    snapshot.cnameRecords = cn
    if (cnameTarget) {
      cnameOk = cn.some((c) => normHost(c) === normHost(cnameTarget))
    }
  } catch (e) {
    if (e.code !== 'ENODATA' && e.code !== 'ENOTFOUND') {
      snapshot.errors.push({ record: 'CNAME', code: e.code, message: e.message })
    }
  }

  // Check A record (IPv4)
  try {
    const v4 = await dns.resolve4(hostname)
    snapshot.aRecords = v4
    if (ipTarget && v4.includes(ipTarget)) aOk = true
  } catch (e) {
    if (e.code !== 'ENODATA' && e.code !== 'ENOTFOUND') {
      snapshot.errors.push({ record: 'A', code: e.code, message: e.message })
    }
  }

  // Fallback to IPv6 if no A records
  if (snapshot.aRecords.length === 0) {
    try {
      const v6 = await dns.resolve6(hostname)
      snapshot.aRecords = v6
    } catch (_) { /* ignore */ }
  }

  // Check TXT verification record
  const txtFqdn = `_suimfx-verify.${hostname}`
  try {
    const chunks = await dns.resolveTxt(txtFqdn)
    snapshot.txtRecords = chunks
    const flat = chunks.map((c) => c.join('')).join('|')
    txtOk =
      flat.includes(verificationToken) ||
      flat.includes(`suimfx-verify=${verificationToken}`)
  } catch (e) {
    if (e.code !== 'ENODATA' && e.code !== 'ENOTFOUND') {
      snapshot.errors.push({ record: 'TXT', code: e.code, message: e.message })
    }
  }

  const hasRoutingRule = !!(cnameTarget || ipTarget)
  const routingOk = !hasRoutingRule
    ? true // No routing rule configured — skip routing check, only require TXT
    : (cnameTarget ? cnameOk : false) || (ipTarget ? aOk : false)

  return {
    snapshot,
    flags: {
      routingOk,
      txtOk,
      cnameOk,
      aOk,
      hasRoutingRule,
      // fullyOk = routing passed (or no rule) AND TXT verified
      fullyOk: routingOk && txtOk
    }
  }
}
