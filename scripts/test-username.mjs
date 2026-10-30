// Run: node scripts/test-username.mjs  (Node >= 22.18 strips TS types natively)
import assert from 'node:assert/strict'
import { decodeUsername, profileHref } from '../app/lib/profileHref.ts'
import { validateUsername, escapeLike } from '../app/lib/username.ts'

// What Next hands the page for each URL: the encoded segment.
const cases = ['me:true', 'Γιώργος', 'a b', '100%', 'x&y=z', 'a+b']
for (const name of cases) {
  const href = profileHref(name)
  const segment = href.slice('/profile/'.length)
  assert.equal(decodeUsername(segment), name, `round-trip ${name}`)
}
assert.equal(profileHref('me:true'), '/profile/me%3Atrue')
assert.equal(decodeUsername('me%3Atrue'), 'me:true')
assert.equal(decodeUsername('me:true'), 'me:true')
assert.equal(decodeUsername('%E0%A4%A'), '%E0%A4%A') // malformed -> raw, no throw
assert.equal(decodeUsername('100%'), '100%')

for (const ok of ['me:true', 'Γιώργος', 'a b', 'ab', 'a'.repeat(30)]) assert.equal(validateUsername(ok), null, ok)
for (const bad of ['a', 'a'.repeat(31), ' ab', 'ab ', 'a/b', 'a\\b', 'a?b', 'a#b', '100%', 'Admin', 'dashboard', 'API', '', 42, null]) {
  assert.notEqual(validateUsername(bad), null, String(bad))
}
assert.equal(escapeLike('a_b%c\\d'), 'a\\_b\\%c\\\\d')
console.log('username tests passed')
