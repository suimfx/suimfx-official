/**
 * Prints each admin's urlSlug — the scope value used in PUBLIC_API_KEYS to give
 * a broker its own partner-API feed. Run: node scripts/listAdminSlugs.js
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Resolve backend/.env from this file, not the cwd — this is run over ssh and
// from cron, where the working directory is rarely backend/.
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') })

const { default: Admin } = await import('../models/Admin.js')
const { default: User } = await import('../models/User.js')

await mongoose.connect(process.env.MONGODB_URI)

const admins = await Admin.find().select('urlSlug brandName role email').sort({ role: 1, urlSlug: 1 })

const rows = await Promise.all(admins.map(async a => ({
  scope: a.urlSlug,
  brand: a.brandName || '—',
  role: a.role,
  users: a.role === 'SUPER_ADMIN'
    ? await User.countDocuments({ $or: [{ assignedAdmin: null }, { assignedAdmin: { $exists: false } }] })
    : await User.countDocuments({ assignedAdmin: a._id })
})))

console.table(rows)
console.log('\nUse the "scope" value in PUBLIC_API_KEYS, e.g.  leofx:suimfx_<key>')

await mongoose.disconnect()
