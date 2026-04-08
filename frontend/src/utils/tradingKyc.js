/**
 * Live + challenge trading requires KYC. Demo accounts are exempt.
 */

export function isDemoTradingAccount (account) {
  if (!account) return false
  return !!(account.isDemo || account.accountTypeId?.isDemo)
}

/** Pass isDemo true for demo trading accounts only (not challenge). */
export function requiresKycToTrade (user, { isDemo = false } = {}) {
  if (isDemo) return false
  return !user || user.kycApproved !== true
}
