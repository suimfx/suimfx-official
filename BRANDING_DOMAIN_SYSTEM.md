# White-Label Branding + Custom Domain System — Complete Flow

> **Purpose:** Portable reference doc. Copy this whole system into any multi-tenant project where each Admin needs their own logo, brand name, custom domain, branded login/signup, branded favicon, and unique referral link.
>
> **Stack assumption:** React (Vite) + Express + MongoDB. Adapt names if you use Next.js/Postgres/etc.

---

## 1. Concept Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  ONE codebase, MANY admin "tenants"                              │
│                                                                  │
│  • Admin creates account → gets:                                 │
│      - urlSlug         (e.g. "john-lf3xk2")                      │
│      - referralCode    (e.g. "A8K2P9")                           │
│      - logo + brandName + (optional) customDomain                │
│                                                                  │
│  • Admin's users can reach the platform 3 ways:                  │
│      A) platform.com/<urlSlug>/login    → branded page           │
│      B) platform.com/register?ref=A8K2P9 → auto-redirect to (A)  │
│      C) https://mybroker.com/login       → custom domain         │
│                                                                  │
│  • All 3 produce same outcome: User signed up under that Admin   │
│    (User.assignedAdmin = admin._id) and sees admin's branding    │
│    everywhere (logo, name, favicon, page title).                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Database — `Admin` Model

```js
{
  // ... auth fields (email, password, role, etc.)

  brandName:    { type: String, default: '' },     // "John Broker"
  logo:         { type: String, default: '' },     // "/uploads/logos/logo-xxx.png"

  // Routing keys — each MUST be unique (index them)
  urlSlug:      { type: String, required: true, unique: true, lowercase: true },
  referralCode: { type: String, unique: true, sparse: true, uppercase: true },
  customDomain: { type: String, default: null }    // "mybroker.com" — unique sparse
}
```

**Invariants:**
- `urlSlug` once set, never changes (URLs depend on it).
- `referralCode` = 6-char `[A-Z0-9]`, retry on collision.
- `customDomain` stored lowercase, no `https://`, no trailing slash. Match both `mybroker.com` & `www.mybroker.com` on lookup.

**Generation at admin creation:**
```js
const generatedSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
                    + '-' + Date.now().toString(36)

const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

let referralCode = generateReferralCode()
while (await Admin.findOne({ referralCode })) referralCode = generateReferralCode()
```

---

## 3. Database — `User` Model

The link between user and their admin is **one field**:

```js
{
  assignedAdmin:  { type: ObjectId, ref: 'Admin', default: null },  // null = platform user
  adminUrlSlug:   { type: String, default: null },                  // cached for fast routing
  referredBy:     { type: String, default: null }                   // raw code used at signup
}
```

When you query users for an Admin, **always filter by `assignedAdmin`**. Never trust the URL alone.

---

## 4. Backend — 5 Public Endpoints (entire branding API)

### 4.1 Resolve brand by `urlSlug`
For `platform.com/<slug>/login` page to fetch its branding.

```js
// GET /api/admin-mgmt/brand/:slug
router.get('/brand/:slug', async (req, res) => {
  const admin = await Admin.findOne({
    urlSlug: req.params.slug.toLowerCase(),
    status: 'ACTIVE'
  }).select('brandName logo urlSlug _id')
  if (!admin) return res.status(404).json({ success: false })
  res.json({ success: true, brand: {
    brandName: admin.brandName, logo: admin.logo,
    urlSlug:   admin.urlSlug,   adminId: admin._id
  }})
})
```

### 4.2 Resolve brand by `customDomain`
For users hitting `mybroker.com` — frontend reads `window.location.hostname` and asks backend who owns it.

```js
// GET /api/admin-mgmt/branding?domain=<hostname>
router.get('/branding', async (req, res) => {
  const { domain } = req.query
  if (!domain) return res.status(400).json({ success: false })

  const raw  = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const base = raw.replace(/^www\./, '')
  const variants = [...new Set([raw, base, `www.${base}`])]

  const admin = await Admin.findOne({
    customDomain: { $in: variants },
    status: 'ACTIVE'
  }).select('brandName logo urlSlug customDomain _id')

  if (!admin) return res.status(404).json({ success: false })
  res.json({ success: true, brand: admin })
})
```

### 4.3 Resolve admin by `referralCode`
Used by `?ref=CODE` shortlink.

```js
// GET /api/admin-mgmt/admin-by-referral/:code
router.get('/admin-by-referral/:code', async (req, res) => {
  const admin = await Admin.findOne({
    referralCode: req.params.code.toUpperCase(),
    status: 'ACTIVE'
  }).select('urlSlug brandName logo customDomain')
  if (!admin) return res.status(404).json({ success: false })
  res.json({ success: true, admin })
})
```

### 4.4 Logged-in user's branding (auth required)
After a user logs in, the SPA needs to know which admin they belong to so it can apply branding on every page.

```js
// GET /api/auth/my-branding   (Bearer token)
router.get('/my-branding', verifyToken, async (req, res) => {
  const user = await User.findById(req.userId).select('assignedAdmin')
  if (!user?.assignedAdmin) return res.json({ success: true, branding: null })

  const admin = await Admin.findById(user.assignedAdmin)
    .select('brandName logo urlSlug customDomain')
  if (!admin) return res.json({ success: true, branding: null })

  res.json({ success: true, branding: {
    brandName:    admin.brandName,
    logo:         admin.logo,
    urlSlug:      admin.urlSlug,
    customDomain: admin.customDomain
  }})
})
```

### 4.5 Logo upload + profile update (auth required)

```js
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const logosDir = path.join(__dirname, '../uploads/logos')
if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true })

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, logosDir),
    filename:    (req, file, cb) =>
      cb(null, `logo-${req.adminId}-${Date.now()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/gif','image/webp','image/svg+xml']
    cb(ok.includes(file.mimetype) ? null : new Error('Invalid type'), ok.includes(file.mimetype))
  }
})

// POST /api/admin-mgmt/upload-logo  (multipart/form-data, field "logo")
router.post('/upload-logo', verifyAdminToken, logoUpload.single('logo'), async (req, res) => {
  const admin = await Admin.findById(req.adminId)
  // delete old file
  if (admin.logo) {
    const oldPath = path.join(__dirname, '..', admin.logo)
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
  }
  admin.logo = `/uploads/logos/${req.file.filename}`
  await admin.save()
  res.json({ success: true, logo: admin.logo })
})

// PUT /api/admin-mgmt/update-profile
// body: { brandName, customDomain, ... } — enforce customDomain uniqueness here
```

**Serve uploads statically:**
```js
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
```

---

## 5. Backend — Critical Server Config

### 5.1 `trust proxy` (REQUIRED behind Nginx/Cloudflare)
Without this, custom-domain hostname detection silently fails.

```js
app.set('trust proxy', true)
```

### 5.2 CORS — accept all your tenant domains
```js
app.use(cors({
  origin: (origin, cb) => cb(null, true), // tighten in prod: validate against DB customDomain list
  credentials: true
}))
```

> For tighter security: at boot, load all `customDomain` values from DB into a Set, refresh on Admin save, check origin against that Set.

---

## 6. Signup — How a User Gets Tied to an Admin

The signup endpoint accepts **two optional fields**: `adminSlug` and `referralCode`. Either one resolves to an `assignedAdmin`.

```js
// POST /api/auth/signup
const { firstName, email, password, adminSlug, referralCode } = req.body

let assignedAdmin = null
let adminUrlSlug  = null

// Path A: explicit slug (came from /<slug>/signup branded page or custom domain)
if (adminSlug) {
  const admin = await Admin.findOne({ urlSlug: adminSlug.toLowerCase(), status: 'ACTIVE' })
  if (admin) { assignedAdmin = admin._id; adminUrlSlug = admin.urlSlug }
}

// Path B: referral code (came from ?ref=XXXXXX)
if (!assignedAdmin && referralCode) {
  const admin = await Admin.findOne({
    referralCode: referralCode.toUpperCase(),
    status: 'ACTIVE'
  })
  if (admin) { assignedAdmin = admin._id; adminUrlSlug = admin.urlSlug }
}

// (Optional) Path C: IB sub-affiliate referrals — inherit assignedAdmin from IB

const user = await User.create({
  ...formFields,
  assignedAdmin,
  adminUrlSlug,
  referredBy: referralCode
})

if (assignedAdmin) {
  await Admin.findByIdAndUpdate(assignedAdmin, { $inc: { 'stats.totalUsers': 1 } })
}
```

Same logic in **login** — pass `adminSlug` (from URL) or `domain` (from `window.location.hostname`) so backend scopes auth to right tenant.

---

## 7. Frontend — Routing Structure

```jsx
// App.jsx
<Routes>
  {/* Platform default */}
  <Route path="/user/login"   element={<Login />} />
  <Route path="/user/signup"  element={<Signup />} />

  {/* Referral shortlink — resolves admin then redirects to branded page */}
  <Route path="/register"     element={<RegisterReferral />} />

  {/* Branded slug pages (one set per admin) */}
  <Route path="/:slug/login"  element={<BrandedLogin />} />
  <Route path="/:slug/signup" element={<BrandedSignup />} />

  {/* Authenticated app */}
  <Route path="/dashboard"    element={<Dashboard />} />
</Routes>
```

`/:slug` is dynamic — guard inside page: call `/api/admin-mgmt/brand/:slug`; on 404 show "Invalid link".

---

## 8. Frontend — `BrandingContext` (single source of truth)

Decision tree:
```
hostname is custom domain (mybroker.com)?  → fetch by domain
hostname is platform (suimfx.com)?         → if logged in, /my-branding else null
```

```jsx
// context/BrandingContext.jsx
const DEFAULT_TITLE   = 'YourPlatform'
const DEFAULT_FAVICON = '/logo.png'

const isPlatformHost = (h) => h === 'platform.com' || h.endsWith('.platform.com')
const normalizeHost  = (h) => h.replace(/^www\./i, '').toLowerCase()

export const BrandingProvider = ({ children }) => {
  const location = useLocation()
  const [branding, setBranding] = useState(null)
  const [loaded, setLoaded] = useState(false)

  // STEP 1: Load branding once on mount
  const loadBranding = useCallback(async () => {
    const hostname = window.location.hostname
    if (hostname === 'localhost') {
      setBranding(await fetchMyBrandingAsUser())
      return
    }

    const res = await fetch(`${API_URL}/admin-mgmt/branding?domain=${hostname}`)
    const data = await res.json()
    if (data.success) {
      setBranding({
        brandName:    data.brand.brandName,
        logo:         data.brand.logo ? `${API_BASE_URL}${data.brand.logo}` : null,
        adminSlug:    data.brand.urlSlug,
        adminId:      data.brand.adminId,
        customDomain: data.brand.customDomain
      })
      localStorage.setItem('adminSlug', data.brand.urlSlug)
      return
    }
    if (isPlatformHost(hostname)) {
      setBranding(await fetchMyBrandingAsUser())
    }
  }, [])

  useEffect(() => { (async () => { await loadBranding(); setLoaded(true) })() }, [])

  // STEP 2: After login, redirect to admin's custom domain
  useEffect(() => {
    if (!loaded) return
    const hostname = window.location.hostname
    if (!isPlatformHost(hostname)) return
    if (!localStorage.getItem('token')) return
    if (location.pathname.startsWith('/admin')) return
    if (isUserAuthPath(location.pathname)) return

    const cd = branding?.customDomain?.trim()
    if (!cd) return
    if (normalizeHost(hostname) === normalizeHost(cd)) return

    const targetOrigin = `https://${cd.replace(/^https?:\/\//, '')}`
    const wlHash = buildWlSessionHash()  // ← Section 9
    window.location.replace(
      `${targetOrigin}${location.pathname}${location.search}${wlHash}`
    )
  }, [loaded, branding, location])

  // STEP 3: Apply favicon + tab title
  useEffect(() => {
    if (!loaded) return
    if (location.pathname.startsWith('/admin') && isPlatformHost(window.location.hostname)) {
      document.title = DEFAULT_TITLE
      applyFavicon(DEFAULT_FAVICON)
      return
    }
    document.title = branding?.brandName || DEFAULT_TITLE
    applyFavicon(branding?.logo || DEFAULT_FAVICON)
  }, [branding, loaded, location.pathname])

  return (
    <BrandingContext.Provider value={{ branding, loaded, refreshBranding: loadBranding }}>
      {children}
    </BrandingContext.Provider>
  )
}

function applyFavicon (href) {
  ['icon', 'shortcut icon'].forEach((rel) => {
    let link = document.querySelector(`link[rel="${rel}"]`)
    if (!link) {
      link = document.createElement('link')
      link.rel = rel
      document.head.appendChild(link)
    }
    link.href = href
  })
}
```

**Wrap app:**
```jsx
<BrowserRouter>
  <BrandingProvider>
    <App />
  </BrandingProvider>
</BrowserRouter>
```

---

## 9. Cross-Origin Session Handoff (trickiest piece)

**Problem:** `localStorage` is per-origin. Login on `platform.com/john/login` → redirect to `john.com/dashboard` → token gone (john.com's localStorage is empty).

**Solution:** Pass token in URL **hash** (never sent to server, never logged), consume + strip immediately. Same pattern OAuth implicit flow uses.

```js
// utils/wlSessionHandoff.js
const WL_PREFIX = '#wl='

export function buildWlSessionHash () {
  const t = localStorage.getItem('token')
  if (!t) return ''
  const u = JSON.parse(localStorage.getItem('user') || 'null')
  const payload = JSON.stringify({ t, u })
  return WL_PREFIX + btoa(unescape(encodeURIComponent(payload)))
}

export function consumeWlSessionHandoff () {
  const hash = window.location.hash
  if (!hash.startsWith(WL_PREFIX)) return false
  try {
    const json = decodeURIComponent(escape(atob(hash.slice(WL_PREFIX.length))))
    const { t, u } = JSON.parse(json)
    if (t) localStorage.setItem('token', t)
    if (u) localStorage.setItem('user', JSON.stringify(u))
    // Strip hash from address bar — keep history clean
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    return true
  } catch { return false }
}
```

**Call `consumeWlSessionHandoff()` BEFORE React renders:**

```jsx
// main.jsx
import { consumeWlSessionHandoff } from './utils/wlSessionHandoff'
consumeWlSessionHandoff()        // ← BEFORE render
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

> **Security note:** hash payload contains a JWT. Use **short-lived tokens** (we use 13d). Don't put refresh tokens here.

---

## 10. The Referral Shortlink Page

When admin shares `https://platform.com/register?ref=A8K2P9`, this tiny page resolves and redirects:

```jsx
// pages/RegisterReferral.jsx
const RegisterReferral = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const code = params.get('ref')

  useEffect(() => {
    if (!code) return navigate('/user/signup')
    fetch(`${API_URL}/admin-mgmt/admin-by-referral/${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.admin.urlSlug) {
          navigate(`/${data.admin.urlSlug}/signup?ref=${code}`, { replace: true })
        } else {
          navigate('/user/signup', { replace: true })
        }
      })
  }, [code])

  return <div>Redirecting…</div>
}
```

Admin always shares **one stable link**: `/register?ref=CODE` — works regardless of slug renames or custom domain attachment.

---

## 11. DNS / Nginx Setup for Custom Domains

### 11.1 What admin (tenant) does on their registrar
- `A` record `@`   → your server's public IP
- `A` record `www` → same IP
- *(Optional)* `CNAME www → @`

### 11.2 What you set up — Nginx catch-all (one block handles all tenants)

```nginx
# /etc/nginx/sites-available/platform
server {
  listen 80 default_server;
  server_name _;

  location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
  location / { return 301 https://$host$request_uri; }
}

server {
  listen 443 ssl http2 default_server;
  server_name _;                                  # catch-all matches custom domains too

  ssl_certificate     /etc/letsencrypt/live/<your-platform>/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/<your-platform>/privkey.pem;

  root /var/www/platform/frontend/dist;
  index index.html;

  # Static assets — nginx serves directly
  location ~* \.(js|css|png|jpg|svg|ico|webp|woff2?)$ {
    try_files $uri =404;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Backend API
  location /api/ {
    proxy_pass         http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;     # ← KEY: passes real hostname
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_set_header   X-Forwarded-Host  $host;
  }

  # Backend-served uploads (logos)
  location /uploads/ { proxy_pass http://127.0.0.1:5000; }

  # Socket.IO
  location /socket.io/ {
    proxy_pass         http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection "upgrade";
    proxy_set_header   Host $host;
  }

  # SPA fallback
  location / { try_files $uri $uri/ /index.html; }
}
```

### 11.3 SSL — two options

**Option A: Per-domain certs (recommended)**
Each time admin saves a `customDomain`, run:
```bash
certbot --nginx -d mybroker.com -d www.mybroker.com \
  --non-interactive --agree-tos -m you@platform.com
```
Automate from "save customDomain" route as fire-and-forget shell call, or via cron checking new customDomains.

**Option B: Cloudflare in front**
Admins put their domain on Cloudflare with proxy (orange cloud) → Cloudflare handles SSL termination → your origin needs ONE cert only.

### 11.4 Verify backend sees right host
```bash
curl -H "Host: mybroker.com" http://127.0.0.1:5000/api/admin-mgmt/branding?domain=mybroker.com
```
Expect: that admin's brand JSON. 404 → DB doesn't have the domain stored exactly as queried (case/www mismatch).

---

## 12. End-to-End Flow Walkthrough

### Scenario 1: Admin onboarding
1. Super admin creates Admin "John" → backend auto-generates `urlSlug=john-lf3xk2`, `referralCode=A8K2P9`.
2. John logs in to `/admin/dashboard` (admin portal — always on platform host).
3. John uploads `logo.png` → `POST /api/admin-mgmt/upload-logo` → saved to `/uploads/logos/logo-<id>-<ts>.png`.
4. John sets `brandName="John Broker"` and `customDomain="johnbroker.com"` → `PUT /api/admin-mgmt/update-profile`.
5. John points `johnbroker.com` DNS to your server IP. You run `certbot` for that domain.

### Scenario 2: User signup via referral link
1. John shares `https://platform.com/register?ref=A8K2P9` on social.
2. User clicks → `<RegisterReferral>` page mounts → calls `/admin-by-referral/A8K2P9` → gets `urlSlug=john-lf3xk2`.
3. Auto-redirect to `platform.com/john-lf3xk2/signup?ref=A8K2P9`.
4. `<BrandedSignup>` mounts → calls `/brand/john-lf3xk2` → page now shows John's logo + "John Broker" title.
5. User submits → `POST /api/auth/signup` with `adminSlug=john-lf3xk2` + `referralCode=A8K2P9` → user created with `assignedAdmin=<John._id>`.
6. Token saved in `localStorage` (origin: platform.com).
7. `BrandingContext` detects `branding.customDomain=johnbroker.com` → builds `#wl=...` hash → redirects browser to `https://johnbroker.com/dashboard#wl=...`.
8. On `johnbroker.com`, `consumeWlSessionHandoff()` runs **before React** → token + user copied to johnbroker.com's localStorage → hash stripped from URL.
9. Dashboard loads, `BrandingContext` sees the hostname is a custom domain → fetches `/branding?domain=johnbroker.com` → applies branding. Fully on John's domain with John's branding and a working session.

### Scenario 3: User signup directly on custom domain
1. User visits `https://johnbroker.com/login`.
2. Frontend: `BrandingContext` runs → `/branding?domain=johnbroker.com` → resolves admin John → sets context + favicon + title.
3. `<Login>` page reads `branding.adminSlug` from localStorage and includes it as `adminSlug` in the login POST → backend scopes auth to John's tenant.
4. After login, no cross-domain hop needed — user already on the right host.

### Scenario 4: Returning user with token
1. User opens `johnbroker.com/dashboard`.
2. Token in localStorage → API requests authenticated immediately.
3. `<Login>` auto-redirect effect sends them straight to dashboard if JWT is unexpired.

---

## 13. Files Checklist (copying to a new project)

**Backend:**
- [ ] `models/Admin.js` — add `brandName`, `logo`, `urlSlug`, `referralCode`, `customDomain`
- [ ] `models/User.js`  — add `assignedAdmin`, `adminUrlSlug`, `referredBy`
- [ ] `routes/adminManagement.js` — endpoints from §4 (upload-logo, brand/:slug, branding, admin-by-referral, update-profile)
- [ ] `routes/auth.js` — signup/login accept `adminSlug` + `referralCode`/`domain`; new `/my-branding`
- [ ] `utils/adminFilter.js` — `generateReferralCode()`, `getAdminUserIds(admin)` for query scoping
- [ ] `server.js` — `app.set('trust proxy', true)`, `app.use('/uploads', express.static(...))`, CORS that accepts custom domains
- [ ] `uploads/logos/` directory (auto-created by multer)

**Frontend:**
- [ ] `context/BrandingContext.jsx` — provider + hook
- [ ] `utils/wlSessionHandoff.js` — `buildWlSessionHash`, `consumeWlSessionHandoff`, `originForCustomDomain`
- [ ] `pages/RegisterReferral.jsx` — `?ref=CODE` resolver
- [ ] `pages/BrandedLogin.jsx` + `BrandedSignup.jsx` — read `:slug` param, fetch brand, dynamic favicon/title
- [ ] `pages/Login.jsx` + `Signup.jsx` — use `useBranding()` for platform-host branded view
- [ ] `App.jsx` — route table from §7
- [ ] `main.jsx` — call `consumeWlSessionHandoff()` BEFORE render

**Infrastructure:**
- [ ] Nginx catch-all `server_name _` block with proxy headers
- [ ] Certbot automation for custom domains
- [ ] DNS instructions doc to share with each admin

---

## 14. Common Pitfalls (debug checklist)

| Symptom | Cause |
|---|---|
| Custom domain shows platform branding | `app.set('trust proxy', true)` missing → `req.hostname` wrong |
| Logo broken on custom domain | Frontend uses relative `/uploads/...` but `API_BASE_URL` not absolute → prepend `API_BASE_URL` always |
| Favicon doesn't change on navigation | Multiple `<link rel="icon">` tags; replace ALL of them, not just first |
| Login on custom domain succeeds but dashboard shows "no branding" | `BrandingContext` hadn't loaded before navigate; ensure `await refreshBranding()` after login |
| Token lost when redirected to custom domain | `consumeWlSessionHandoff()` not called before render, or called inside React effect (too late) |
| Two admins claim same domain | Add unique sparse index: `Admin.schema.index({ customDomain: 1 }, { unique: true, sparse: true })` |
| Tab shows "Suimfx" briefly then changes | Set initial `<title>` in `index.html` to neutral value, or render splash until `loaded` |
| iOS doesn't update favicon for installed PWA | iOS caches PWA icon at install time. Tell admin: re-install if logo changes |
| Admin portal `/admin/*` shows tenant branding | `BrandingContext` must early-return DEFAULT when path starts with `/admin` AND host is platform |
| `/branding?domain=...` returns 404 | DB has `mybroker.com` but query asks `www.mybroker.com` — check variants array in §4.2 |

---

## 15. What this system does NOT do (yet)

- Per-tenant **theme colors** (dark/light, accent color) — easy to add: extend `Admin` with `themeColors` JSON, expose in `/brand/:slug`, apply via CSS variables on `<html>`.
- Per-tenant **email templates** — separate concern (we have it via an EmailSettings model, not covered here).
- **Auto-provisioning SSL on customDomain save** — currently a manual `certbot` step. Can be automated with a shell hook from the update-profile route.
- **Subdomain isolation** (`john.platform.com`) — would need wildcard DNS + wildcard cert + similar `?domain=` lookup using subdomain instead of full host.

---

## 16. Quick Test Plan (porting verification)

After porting to new project, verify in this order:

1. ✅ Admin can be created with auto `urlSlug` + `referralCode`
2. ✅ Logo upload works → file appears in `/uploads/logos/`
3. ✅ `/api/admin-mgmt/brand/<slug>` returns the brand
4. ✅ `/<slug>/login` page shows admin's logo and brandName
5. ✅ `/register?ref=CODE` redirects to `/<slug>/signup?ref=CODE`
6. ✅ User signup attaches `assignedAdmin` correctly (check DB)
7. ✅ Set `customDomain` on admin, point DNS, run certbot
8. ✅ Hit `https://<customDomain>/login` directly → branded page
9. ✅ Login on platform host with assigned admin → auto-redirect to custom domain with intact session
10. ✅ Tab title and favicon match brand on every page (except `/admin/*` on platform host)

If all 10 pass, system is fully working in new project.

---

## 🎯 Summary — The 4 Pillars

1. **3 routing keys** (`urlSlug` + `referralCode` + `customDomain`) — all resolve same admin via 3 different endpoints
2. **`assignedAdmin` on User** — single source of truth for tenant ownership
3. **`BrandingContext` + `consumeWlSessionHandoff`** — frontend's complete branding + cross-domain session lifecycle
4. **Nginx catch-all + `trust proxy`** — infrastructure that routes every custom domain to same backend

Copy these 4 pillars into any new project → multi-tenant branding system ready.
