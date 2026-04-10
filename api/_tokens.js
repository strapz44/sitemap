/**
 * JWT + Refresh Token module — Prerender V3 Authentication.
 *
 * Token strategy:
 *   - Access token  : 15 min, HttpOnly cookie (SameSite=Lax, Path=/)
 *   - Refresh token : 30 days, HttpOnly cookie (SameSite=Strict, Path=/api/auth)
 *   - Rotation      : each refresh invalidates the previous token
 */

const crypto = require('crypto')

// ── Configuration ───────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production')
}
const SECRET       = JWT_SECRET || 'dev-secret-change-in-production'
const COOKIE_NAME  = 'auth_token'
const REFRESH_COOKIE = 'refresh_token'
const ACCESS_TTL   = 15 * 60            // 15 minutes (seconds)
const REFRESH_TTL  = 30 * 24 * 60 * 60  // 30 days    (seconds)

// ── Internal Helpers ────────────────────────────────────────────

function base64url(buf) {
  return Buffer.from(buf).toString('base64url')
}

function isSecure(req) {
  return (req.headers['x-forwarded-proto'] || '').includes('https')
}

function parseCookies(req) {
  return (req.headers.cookie || '').toString().split(';').map(s => s.trim())
}

function findCookie(cookies, name) {
  const match = cookies.find(s => s.startsWith(`${name}=`))
  return match ? match.split('=').slice(1).join('=') : null
}

function appendSetCookie(res, cookieStr) {
  const existing = res.getHeader('Set-Cookie')
  const all = existing ? (Array.isArray(existing) ? existing : [existing]) : []
  all.push(cookieStr)
  res.setHeader('Set-Cookie', all)
}

function buildCookie(name, value, path, sameSite, maxAge, secure) {
  const parts = [`${name}=${value}`, `Path=${path}`, 'HttpOnly', `SameSite=${sameSite}`, `Max-Age=${maxAge}`]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

// ── JWT — Access Token ──────────────────────────────────────────

function signToken(payload, expiresInSec = ACCESS_TTL) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = { ...payload, iat: now, exp: now + expiresInSec }

  const segments = [base64url(JSON.stringify(header)), base64url(JSON.stringify(body))]
  const sig = crypto.createHmac('sha256', SECRET).update(segments.join('.')).digest('base64url')
  return segments.concat(sig).join('.')
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const sig = crypto.createHmac('sha256', SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url')
    if (sig !== parts[2]) return null

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

function getTokenFromRequest(req) {
  const auth = (req.headers.authorization || '').toString()
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return findCookie(parseCookies(req), COOKIE_NAME)
}

function setAuthCookie(res, token, req, maxAgeSec = ACCESS_TTL) {
  res.setHeader('Set-Cookie', buildCookie(COOKIE_NAME, token, '/', 'Lax', maxAgeSec, isSecure(req)))
}

function clearAuthCookie(res, req) {
  res.setHeader('Set-Cookie', buildCookie(COOKIE_NAME, '', '/', 'Lax', 0, isSecure(req)))
}

// ── Refresh Token ───────────────────────────────────────────────

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url')
}

function getRefreshTokenFromRequest(req) {
  return findCookie(parseCookies(req), REFRESH_COOKIE)
}

function setRefreshCookie(res, token, req, maxAgeSec = REFRESH_TTL) {
  appendSetCookie(res, buildCookie(REFRESH_COOKIE, token, '/api/auth', 'Strict', maxAgeSec, isSecure(req)))
}

function clearRefreshCookie(res, req) {
  appendSetCookie(res, buildCookie(REFRESH_COOKIE, '', '/api/auth', 'Strict', 0, isSecure(req)))
}

// ── Exports ─────────────────────────────────────────────────────

module.exports = {
  // JWT
  signToken,
  verifyToken,
  getTokenFromRequest,
  setAuthCookie,
  clearAuthCookie,
  // Refresh
  generateRefreshToken,
  getRefreshTokenFromRequest,
  setRefreshCookie,
  clearRefreshCookie,
  // Constants
  ACCESS_TTL,
  REFRESH_TTL,
}
