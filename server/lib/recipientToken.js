const crypto = require('crypto')

const V1_VERSION = 'v1'
const V2_VERSION = 'v2'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function getSecret() {
  const secret = process.env.ACTION_LINK_SECRET
  if (!secret) {
    throw new Error('ACTION_LINK_SECRET env var is required')
  }
  return secret
}

let cachedKey = null
let cachedKeySecret = null
function getKey() {
  const secret = getSecret()
  if (cachedKey && cachedKeySecret === secret) return cachedKey
  cachedKey = crypto.createHash('sha256').update(secret).digest()
  cachedKeySecret = secret
  return cachedKey
}

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64url(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4))
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

// signRecipientToken(email) → opaque v2 AES-256-GCM token.
// Format: v2.<iv>.<ciphertext>.<tag>, each segment base64url.
// The recipient email is encrypted, not just signed.
function signRecipientToken(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) throw new Error('email required')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const ct = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${V2_VERSION}.${base64url(iv)}.${base64url(ct)}.${base64url(tag)}`
}

// verifyRecipientToken(token) → { ok, email } | { ok: false, reason }
// Accepts v2 (AES-GCM) and v1 (HMAC-signed, legacy) tokens.
function verifyRecipientToken(token) {
  if (!token || typeof token !== 'string') return { ok: false, reason: 'missing' }
  const parts = token.split('.')
  const version = parts[0]
  if (version === V2_VERSION) return verifyV2(parts)
  if (version === V1_VERSION) return verifyV1(parts)
  return { ok: false, reason: 'version' }
}

function verifyV2(parts) {
  if (parts.length !== 4) return { ok: false, reason: 'malformed' }
  const [, ivB64, ctB64, tagB64] = parts
  let iv, ct, tag
  try {
    iv = fromBase64url(ivB64)
    ct = fromBase64url(ctB64)
    tag = fromBase64url(tagB64)
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (iv.length !== 12 || tag.length !== 16) return { ok: false, reason: 'malformed' }
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv)
    decipher.setAuthTag(tag)
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
    return { ok: true, email: normalizeEmail(pt) }
  } catch {
    return { ok: false, reason: 'invalid' }
  }
}

function verifyV1(parts) {
  if (parts.length !== 3) return { ok: false, reason: 'malformed' }
  const [version, payload, sig] = parts
  const body = `${version}.${payload}`
  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest()
  let provided
  try {
    provided = fromBase64url(sig)
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (provided.length !== expected.length) return { ok: false, reason: 'invalid' }
  if (!crypto.timingSafeEqual(provided, expected)) return { ok: false, reason: 'invalid' }
  let email
  try {
    email = fromBase64url(payload).toString('utf8')
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  return { ok: true, email: normalizeEmail(email) }
}

module.exports = { signRecipientToken, verifyRecipientToken, normalizeEmail }
