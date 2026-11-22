import { SignJWT, jwtVerify } from 'jose'
import { env } from './env'
import { isRole, type Role } from './roles'

export interface SessionPayload {
  userId: string
  email: string
  name: string
  role: Role
}

/** Temporary token issued after password verification, before OTP. */
export interface OtpPendingPayload {
  userId: string
  email: string
  name: string
  role: Role
  purpose: 'otp_pending'
}

let cachedKey: Uint8Array | null = null

function getKey(): Uint8Array {
  if (!cachedKey) {
    cachedKey = new TextEncoder().encode(env.JWT_SECRET)
  }
  return cachedKey
}

/** Create a full session token (issued after OTP verification). */
export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getKey())
}

/** Create a temporary OTP-pending token (short-lived, 15 min). */
export async function createOtpPendingToken(payload: Omit<SessionPayload, 'purpose'>): Promise<string> {
  return new SignJWT({ ...payload, purpose: 'otp_pending' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getKey())
}

/** Verify a full session token. */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey())
    if (typeof payload.userId !== 'string' || !isRole(payload.role)) return null
    // Reject OTP-pending tokens
    if (payload.purpose === 'otp_pending') return null
    return {
      userId: payload.userId,
      email: typeof payload.email === 'string' ? payload.email : '',
      name: typeof payload.name === 'string' ? payload.name : '',
      role: payload.role,
    }
  } catch {
    return null
  }
}

/** Verify a temporary OTP-pending token. */
export async function verifyOtpPendingToken(token: string): Promise<OtpPendingPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey())
    if (typeof payload.userId !== 'string' || !isRole(payload.role)) return null
    if (payload.purpose !== 'otp_pending') return null
    return {
      userId: payload.userId,
      email: typeof payload.email === 'string' ? payload.email : '',
      name: typeof payload.name === 'string' ? payload.name : '',
      role: payload.role,
      purpose: 'otp_pending',
    }
  } catch {
    return null
  }
}
