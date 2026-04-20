import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Admin from '../models/Admin.js'
import User from '../models/User.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path to the built frontend index.html (backend/services/ -> ../../frontend/dist/index.html)
const INDEX_PATH = path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html')

let cachedTemplate = null
let cachedMtimeMs = 0

function loadTemplate() {
  try {
    const stat = fs.statSync(INDEX_PATH)
    if (!cachedTemplate || stat.mtimeMs !== cachedMtimeMs) {
      cachedTemplate = fs.readFileSync(INDEX_PATH, 'utf8')
      cachedMtimeMs = stat.mtimeMs
    }
    return cachedTemplate
  } catch (err) {
    console.error('[htmlBranding] Cannot read dist/index.html:', err.message)
    return null
  }
}

function escapeHtmlAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Short-lived cache so a burst of crawler hits doesn't hammer Mongo.
const adminCache = new Map() // key -> { admin, expiresAt }
const ADMIN_CACHE_TTL_MS = 60 * 1000

function cacheGet(key) {
  const entry = adminCache.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) { adminCache.delete(key); return null }
  return entry.admin
}
function cacheSet(key, admin) {
  adminCache.set(key, { admin, expiresAt: Date.now() + ADMIN_CACHE_TTL_MS })
}

// Resolve the branding admin when no custom-domain tenant was matched, by
// looking at the URL the crawler requested:
//   1. ?ref=<code> — a referring user's code → their assignedAdmin
//   2. /<slug>/...  — first path segment matches an Admin.urlSlug
// Returns null if neither resolves.
async function resolveAdminFromUrl(req) {
  try {
    const query = req.query || {}
    const refCode = typeof query.ref === 'string' ? query.ref.trim() : ''
    if (refCode) {
      const key = `ref:${refCode.toLowerCase()}`
      const hit = cacheGet(key)
      if (hit !== null) return hit

      const refUser = await User.findOne({ referralCode: refCode })
        .select('assignedAdmin')
        .lean()
      if (refUser?.assignedAdmin) {
        const admin = await Admin.findById(refUser.assignedAdmin)
          .select('brandName urlSlug customDomain')
          .lean()
        if (admin) { cacheSet(key, admin); return admin }
      }
      cacheSet(key, null) // negative cache to avoid repeat lookups
    }

    const firstSeg = (req.path || '/').split('/').filter(Boolean)[0]
    if (firstSeg) {
      // Skip segments that are obviously app routes, not admin slugs.
      const reserved = new Set([
        'signup', 'login', 'register', 'admin-login', 'employee-login',
        'dashboard', 'admin', 'employee', 'wallet', 'trade', 'trading',
        'ib', 'kyc', 'profile', 'settings', 'reset-password', 'forgot-password',
        'verify', 'assets', 'static', 'public', 'uploads'
      ])
      const slug = firstSeg.toLowerCase()
      if (!reserved.has(slug) && /^[a-z0-9-]+$/.test(slug)) {
        const key = `slug:${slug}`
        const hit = cacheGet(key)
        if (hit !== null) return hit
        const admin = await Admin.findOne({ urlSlug: slug })
          .select('brandName urlSlug customDomain')
          .lean()
        cacheSet(key, admin || null)
        if (admin) return admin
      }
    }
  } catch (err) {
    console.error('[htmlBranding] resolveAdminFromUrl error:', err.message)
  }
  return null
}

/**
 * Returns HTML for a page request, with <title> and Open Graph meta tags
 * rewritten based on the request. Link-preview crawlers (WhatsApp, Telegram,
 * Facebook, Twitter) don't execute JS, so per-tenant branding must be baked
 * into the response HTML.
 *
 * Admin is resolved in this order:
 *  1. req.tenantAdmin — attached by the custom-domain middleware in server.js
 *  2. ?ref=<code>     — referral code → referring user's assignedAdmin
 *  3. /<slug>/...     — Admin.urlSlug on the first path segment
 *  4. hostname fallback so previews never leak "Suimfx" on a non-suimfx host
 */
export async function renderBrandedHtml(req) {
  const template = loadTemplate()
  if (!template) return null

  const hostHeader = (req.headers.host || '').split(':')[0].toLowerCase().trim()

  let titleText = 'Suimfx'
  let siteName = 'Suimfx'
  let description = 'Suimfx — Trading platform'

  let brandingAdmin = req.tenantAdmin || null
  if (!brandingAdmin) {
    brandingAdmin = await resolveAdminFromUrl(req)
  }

  if (brandingAdmin) {
    const brand = (brandingAdmin.brandName || '').trim()
    const domain = brandingAdmin.customDomain || hostHeader
    siteName = brand || domain
    titleText = brand || domain
    description = `${siteName} — Trading platform`
  } else if (hostHeader && !hostHeader.endsWith('suimfx.com') && hostHeader !== 'localhost') {
    // Custom domain hit but admin record not found — at least use the hostname
    // instead of the hardcoded "Suimfx" so link previews never leak the wrong brand.
    siteName = hostHeader
    titleText = hostHeader
    description = `${hostHeader} — Trading platform`
  }

  const t = escapeHtmlAttr(titleText)
  const s = escapeHtmlAttr(siteName)
  const d = escapeHtmlAttr(description)
  const url = escapeHtmlAttr(`https://${hostHeader}${req.originalUrl || '/'}`)

  const metaBlock = `<title>${t}</title>
    <meta name="description" content="${d}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:site_name" content="${s}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${url}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />`

  // Strip ALL hardcoded branding meta tags from the template first.
  // The static frontend/index.html ships with og:title / og:site_name /
  // og:description / twitter:* / description already set to "Suimfx".
  // If we only replaced <title>, those duplicate tags survived and WhatsApp
  // / Facebook crawlers picked the static "Suimfx" values over our dynamic
  // ones, so custom-domain previews still leaked the super-admin brand.
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+property=["']og:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']twitter:[^"']+["'][^>]*>\s*/gi, '')

  // Inject the dynamic branded block once, right before </head>.
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `    ${metaBlock}\n  </head>`)
  }
  // Extremely unlikely: no </head>. Prepend to <body> as a last resort.
  return html.replace(/<body/i, `${metaBlock}\n  <body`)
}
