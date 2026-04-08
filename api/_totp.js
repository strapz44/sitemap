/**
 * TOTP (Time-based One-Time Password) implementation.
 * Compatible with Google Authenticator, Authy, etc.
 * No external dependency — pure crypto.
 */

const crypto = require('crypto')

const TOTP_PERIOD = 30    // seconds
const TOTP_DIGITS = 6
const TOTP_WINDOW = 1     // accept ±1 period (for clock drift)

/**
 * Generate a random TOTP secret (base32 encoded, 20 bytes).
 */
function generateSecret() {
  const buf = crypto.randomBytes(20)
  return base32Encode(buf)
}

/**
 * Generate an otpauth:// URI for QR codes.
 */
function buildOtpauthUri(secret, email, issuer = 'Prerender') {
  const enc = encodeURIComponent
  return `otpauth://totp/${enc(issuer)}:${enc(email)}?secret=${secret}&issuer=${enc(issuer)}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`
}

/**
 * Verify a TOTP code against a secret.
 * Accepts codes within ±TOTP_WINDOW periods for clock drift tolerance.
 */
function verifyTotp(secret, code) {
  if (!secret || !code) return false
  const cleaned = code.toString().replace(/\s/g, '')
  if (cleaned.length !== TOTP_DIGITS) return false

  const key = base32Decode(secret)
  const now = Math.floor(Date.now() / 1000)

  for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
    const counter = Math.floor((now + i * TOTP_PERIOD) / TOTP_PERIOD)
    const expected = generateHotp(key, counter)
    if (timingSafeEqual(expected, cleaned)) return true
  }
  return false
}

/**
 * Generate backup codes (8 codes, 8 chars each).
 */
function generateBackupCodes(count = 8) {
  const codes = []
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex'))
  }
  return codes
}

// ── Internal helpers ────────────────────────────────
function generateHotp(key, counter) {
  const buf = Buffer.alloc(8)
  let c = counter
  for (let i = 7; i >= 0; i--) {
    buf[i] = c & 0xff
    c = Math.floor(c / 256)
  }
  const hmac = crypto.createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_DIGITS)
  return code.toString().padStart(TOTP_DIGITS, '0')
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return crypto.timingSafeEqual(ab, bb)
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buf) {
  let bits = 0, value = 0, result = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return result
}

function base32Decode(str) {
  const cleaned = str.replace(/[=\s]/g, '').toUpperCase()
  let bits = 0, value = 0
  const output = []
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(output)
}

module.exports = { generateSecret, buildOtpauthUri, verifyTotp, generateBackupCodes }
