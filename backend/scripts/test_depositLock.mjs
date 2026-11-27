/**
 * Asserts the deposit-lock arithmetic on the Wallet model: which locks still
 * hold, what that leaves withdrawable, and when the next one lapses. These are
 * the numbers the withdrawal route gates on, so getting them wrong either
 * traps a user's money or lets locked money out.
 *
 * No database: a Mongoose document computes its virtuals unsaved.
 *
 * Run: node scripts/test_depositLock.mjs
 */
import assert from 'assert'
import Wallet from '../models/Wallet.js'

const DAY = 24 * 60 * 60 * 1000
const future = (days) => new Date(Date.now() + days * DAY)
const past = (days) => new Date(Date.now() - days * DAY)

let passed = 0
const check = (name, fn) => {
  fn()
  passed++
  console.log(`  ok  ${name}`)
}

const wallet = (balance, locks = []) => new Wallet({ userId: '507f1f77bcf86cd799439011', balance, locks })

console.log('deposit lock')

check('no locks leaves the whole balance withdrawable', () => {
  const w = wallet(10000)
  assert.strictEqual(w.lockedAmount, 0)
  assert.strictEqual(w.availableBalance, 10000)
  assert.strictEqual(w.nextUnlockAt, null)
})

check("the case from the brief: 10000 in, 5000 locked for 7 days", () => {
  const w = wallet(10000, [{ amount: 5000, unlockAt: future(7) }])
  assert.strictEqual(w.lockedAmount, 5000)
  assert.strictEqual(w.availableBalance, 5000)
})

check('a lock past its date stops holding, with nothing to run', () => {
  const w = wallet(10000, [{ amount: 5000, unlockAt: past(1) }])
  assert.strictEqual(w.lockedAmount, 0)
  assert.strictEqual(w.availableBalance, 10000)
})

check('a released lock stops holding even before its date', () => {
  const w = wallet(10000, [{ amount: 5000, unlockAt: future(7), releasedAt: new Date() }])
  assert.strictEqual(w.lockedAmount, 0)
  assert.strictEqual(w.availableBalance, 10000)
})

check('several locks add up, and only the live ones count', () => {
  const w = wallet(10000, [
    { amount: 5000, unlockAt: future(7) },
    { amount: 2000, unlockAt: future(30) },
    { amount: 1000, unlockAt: past(1) },                          // lapsed
    { amount: 3000, unlockAt: future(5), releasedAt: new Date() }  // released
  ])
  assert.strictEqual(w.lockedAmount, 7000)
  assert.strictEqual(w.availableBalance, 3000)
})

check('locking more than the balance withholds everything, never negative', () => {
  const w = wallet(10000, [{ amount: 20000, unlockAt: future(7) }])
  assert.strictEqual(w.availableBalance, 0)
})

check('spending down the balance cannot resurrect withdrawable money', () => {
  const w = wallet(6000, [{ amount: 5000, unlockAt: future(7) }])
  assert.strictEqual(w.availableBalance, 1000)
  w.balance = 4000 // traded some away
  assert.strictEqual(w.availableBalance, 0)
})

check('nextUnlockAt is the soonest live lock, ignoring lapsed and released', () => {
  const soon = future(2)
  const w = wallet(10000, [
    { amount: 1000, unlockAt: future(30) },
    { amount: 1000, unlockAt: soon },
    { amount: 1000, unlockAt: past(10) },
    { amount: 1000, unlockAt: future(1), releasedAt: new Date() }
  ])
  assert.strictEqual(w.nextUnlockAt.getTime(), soon.getTime())
})

check('the virtuals survive serialisation, which is how the UI reads them', () => {
  const json = wallet(10000, [{ amount: 5000, unlockAt: future(7) }]).toJSON()
  assert.strictEqual(json.lockedAmount, 5000)
  assert.strictEqual(json.availableBalance, 5000)
})

console.log(`\n${passed} checks passed`)
