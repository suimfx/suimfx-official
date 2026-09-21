/**
 * One-time platform rebrand: renames the platform brand and frees the main
 * domain from any tenant still holding it as a custom domain.
 *
 * A domain cannot be both a tenant's custom domain and a platform host — the
 * branding lookup finds the tenant first and the main site shows that broker's
 * brand. Safe to re-run.
 *
 * Run: node scripts/setPlatformBrand.js
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Resolve backend/.env from this file, not the cwd — this is run over ssh.
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') })

const { default: Admin } = await import('../models/Admin.js')
const { default: AdminDomainConnection } = await import('../models/AdminDomainConnection.js')

const PLATFORM_SLUG = 'suimfx'
const NEW_BRAND = 'Forexmt24'
const CLAIM_DOMAIN = 'forexmt24.com'

await mongoose.connect(process.env.MONGODB_URI)

// 1. Rename the platform (Super Admin) brand. urlSlug is deliberately left
//    alone: it is baked into PUBLIC_API_KEYS scopes and every /<slug>/login link.
const platform = await Admin.findOne({ urlSlug: PLATFORM_SLUG }).select('brandName urlSlug role')
if (!platform) {
  console.error(`! No admin with urlSlug "${PLATFORM_SLUG}" — brand not renamed`)
} else if (platform.brandName === NEW_BRAND) {
  console.log(`= Platform brand already "${NEW_BRAND}"`)
} else {
  await Admin.updateOne({ _id: platform._id }, { $set: { brandName: NEW_BRAND } })
  console.log(`✓ Platform brand: "${platform.brandName}" -> "${NEW_BRAND}"`)
}

// 2. Free the domain from whichever tenant holds it.
const variants = [CLAIM_DOMAIN, `www.${CLAIM_DOMAIN}`]
const holders = await Admin.find({ customDomain: { $in: variants } }).select('brandName urlSlug customDomain')

if (!holders.length) {
  console.log(`= No tenant holds ${CLAIM_DOMAIN}`)
}
for (const h of holders) {
  await Admin.updateOne({ _id: h._id }, { $set: { customDomain: null } })
  console.log(`✓ Cleared customDomain "${h.customDomain}" from tenant "${h.brandName}" (${h.urlSlug})`)
  console.log(`  → its users now sign in at https://${CLAIM_DOMAIN}/${h.urlSlug}/login`)
}

const conns = await AdminDomainConnection.find({ hostname: { $in: variants } }).select('hostname status adminId')
for (const c of conns) {
  console.log(`✓ Removing domain connection ${c.hostname} (status=${c.status}, admin=${c.adminId})`)
}
if (conns.length) {
  await AdminDomainConnection.deleteMany({ _id: { $in: conns.map(c => c._id) } })
} else {
  console.log(`= No domain connection records for ${CLAIM_DOMAIN}`)
}

await mongoose.disconnect()
process.exit(0)
