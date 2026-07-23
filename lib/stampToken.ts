import { createHmac, timingSafeEqual } from 'crypto'

// Verifier for the customer stamp JWT. Signed on the user app side
// (Strudl-app/api/_lib/stampToken.ts) with the same STAMP_TOKEN_SECRET.
// This file mirrors the verify half; sign lives with the issuer.
//
// If you change the signing format on the app side, mirror it here.

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

function getSecret(): Buffer {
  const raw = process.env.STAMP_TOKEN_SECRET
  if (!raw) throw new Error('STAMP_TOKEN_SECRET is not set')
  const key = b64urlDecode(raw)
  if (key.length < 32) throw new Error('STAMP_TOKEN_SECRET must decode to at least 32 bytes')
  return key
}

export interface StampTokenPayload {
  userId: string
  exp: number
}

export function verifyStampToken(token: string): StampTokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, sig] = parts
  const expected = createHmac('sha256', getSecret()).update(`${header}.${payload}`).digest()
  const given = b64urlDecode(sig)
  if (given.length !== expected.length) return null
  if (!timingSafeEqual(given, expected)) return null
  try {
    const body = JSON.parse(b64urlDecode(payload).toString('utf8')) as StampTokenPayload
    if (typeof body.userId !== 'string' || typeof body.exp !== 'number') return null
    if (body.exp < Math.floor(Date.now() / 1000)) return null
    return body
  } catch {
    return null
  }
}
