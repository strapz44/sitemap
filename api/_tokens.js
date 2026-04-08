/**
 * Module JWT + Refresh Token pour authentification premium.
 * Access token court (15min) + refresh token long (30 jours) + rotation.
 */

const crypto = require('crypto')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production')
}
const SECRET = JWT_SECRET || 'dev-secret-change-in-production'
const COOKIE_NAME = 'auth_token'
const REFRESH_COOKIE = 'refresh_token'
const ACCESS_TTL = 15 * 60            // 15 minutes
const REFRESH_TTL = 30 * 24 * 60 * 60 // 30 jours

function base64url(buf) {
  return Buffer.from(buf).toString('base64url')
}

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
  // 1. Check Authorization header
  const auth = (req.headers.authorization || '').toString()
  if (auth.startsWith('Bearer ')) return auth.slice(7)

  // 2. Check cookie
  const cookies = (req.headers.cookie || '').toString()
  const match = cookies.split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE_NAME}=`))
  if (match) return match.split('=').slice(1).join('=')

  return null
}

function setAuthCookie(res, token, req, maxAgeSec = ACCESS_TTL) {
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https')
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

function clearAuthCookie(res, req) {
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https')
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

module.exports = { signToken, verifyToken, getTokenFromRequest, setAuthCookie, clearAuthCookie, generateRefreshToken, setRefreshCookie, clearRefreshCookie, getRefreshTokenFromRequest, ACCESS_TTL, REFRESH_TTL }

// ── Refresh Token helpers ────────────────────────────
function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url')
}

function setRefreshCookie(res, token, req, maxAgeSec = REFRESH_TTL) {
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https')
  const parts = [
    `${REFRESH_COOKIE}=${token}`,
    'Path=/api/auth',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSec}`,
  ]
  if (secure) parts.push('Secure')
  // Append to existing Set-Cookie headers
  const existing = res.getHeader('Set-Cookie')
  const cookies = existing ? (Array.isArray(existing) ? existing : [existing]) : []
  cookies.push(parts.join('; '))
  res.setHeader('Set-Cookie', cookies)
}

function clearRefreshCookie(res, req) {
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https')
  const parts = [
    `${REFRESH_COOKIE}=`,
    'Path=/api/auth',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
  ]
  if (secure) parts.push('Secure')
  const existing = res.getHeader('Set-Cookie')
  const cookies = existing ? (Array.isArray(existing) ? existing : [existing]) : []
  cookies.push(parts.join('; '))
  res.setHeader('Set-Cookie', cookies)
}

function getRefreshTokenFromRequest(req) {
  const cookies = (req.headers.cookie || '').toString()
  const match = cookies.split(';').map(s => s.trim()).find(s => s.startsWith(`${REFRESH_COOKIE}=`))
  if (match) return match.split('=').slice(1).join('=')
  return null
}
