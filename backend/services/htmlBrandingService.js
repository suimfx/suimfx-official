import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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

/**
 * Returns HTML for a page request, with <title> and Open Graph meta tags
 * rewritten based on the host the request came in on. This is what link-preview
 * crawlers (WhatsApp, Telegram, Facebook, Twitter) read — they do not execute JS,
 * so per-tenant branding must be baked into the response HTML.
 *
 * Relies on the multi-tenant middleware in server.js which attaches req.tenantAdmin
 * and req.tenantDomain when the request host matches a connected custom domain.
 */
export function renderBrandedHtml(req) {
  const template = loadTemplate()
  if (!template) return null

  const hostHeader = (req.headers.host || '').split(':')[0].toLowerCase().trim()

  let titleText = 'Suimfx'
  let siteName = 'Suimfx'
  let description = 'Suimfx — Trading platform'

  if (req.tenantAdmin) {
    const brand = (req.tenantAdmin.brandName || '').trim()
    const domain = req.tenantAdmin.customDomain || hostHeader
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

  // Replace the hardcoded <title>...</title> with the dynamic meta block.
  // If there is no <title> tag (shouldn't happen), fall back to injecting before </head>.
  if (/<title>[^<]*<\/title>/i.test(template)) {
    return template.replace(/<title>[^<]*<\/title>/i, metaBlock)
  }
  return template.replace(/<\/head>/i, `${metaBlock}\n  </head>`)
}
