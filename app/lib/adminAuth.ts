import crypto from 'crypto'

const SECRET = process.env.ADMIN_PASSWORD!
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7 // 7 days, same as cookie maxAge

export function signAdminToken(): string {
  const payload = String(Date.now())
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false
  const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  const sigBuf = Buffer.from(sig, 'hex')
  const expectedBuf = Buffer.from(expectedSig, 'hex')
  if (sigBuf.length !== expectedBuf.length) return false
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false
  const age = Date.now() - Number(payload)
  if (isNaN(age) || age < 0 || age > MAX_AGE_MS) return false
  return true
}
