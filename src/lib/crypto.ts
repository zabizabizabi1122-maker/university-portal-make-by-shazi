import crypto from 'crypto'

const PREFIX = 'scrypt'
const KEY_LENGTH = 64

/**
 * Hashes a password with scrypt and a per-password random salt.
 * Format: `scrypt:<salt hex>:<derived key hex>`
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH)
  return `${PREFIX}:${salt}:${derived.toString('hex')}`
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}

/**
 * Verifies a password against either the current scrypt format or the legacy
 * unsalted SHA-256 hashes used by the original seed script.
 */
export function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith(`${PREFIX}:`)) {
    const [, salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const derived = crypto.scryptSync(password, salt, KEY_LENGTH)
    return timingSafeEqualHex(derived.toString('hex'), hash)
  }
  const legacy = crypto.createHash('sha256').update(password).digest('hex')
  return timingSafeEqualHex(legacy, stored)
}

/** True when the stored hash uses the older format and should be upgraded on login. */
export function needsRehash(stored: string): boolean {
  return !stored.startsWith(`${PREFIX}:`)
}

/**
 * Generate a 6-digit numeric OTP.
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString()
}

/**
 * Hash an OTP code using scrypt (same format as passwords).
 */
export function hashOtp(code: string): string {
  return hashPassword(code)
}

/**
 * Verify an OTP code against its stored hash.
 */
export function verifyOtp(code: string, storedHash: string): boolean {
  return verifyPassword(code, storedHash)
}
