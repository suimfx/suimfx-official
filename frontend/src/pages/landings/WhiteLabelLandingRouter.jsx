import LeofxWorldLanding from './LeofxWorldLanding'
import Forexmt24Landing from './Forexmt24Landing'
import DefaultPartnerLanding from './DefaultPartnerLanding'

/**
 * Admin panel → URL slug must match one of these keys (letters/numbers only, case-insensitive).
 * leofx.world  → urlSlug e.g. "leofx" or "leofxworld"
 * forexmt24.com → urlSlug e.g. "forexmt" or "forexmt24"
 * Others → DefaultPartnerLanding (still uses their logo + /{slug}/login & /signup)
 */
const SLUG_TO_LANDING = {
  leofx: LeofxWorldLanding,
  leofxworld: LeofxWorldLanding,
  forexmt: Forexmt24Landing,
  forexmt24: Forexmt24Landing,
  forexmt24com: Forexmt24Landing
}

export default function WhiteLabelLandingRouter ({ branding }) {
  const raw = (branding?.adminSlug || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const Component = SLUG_TO_LANDING[raw] || DefaultPartnerLanding
  return <Component branding={branding} />
}
