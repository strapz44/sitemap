const crypto = require('crypto')

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function b64urlJSON(obj) {
  return b64url(JSON.stringify(obj))
}

function signToken(payload, expiresInSec = 60 * 60 * 24 * 7) { // 7 days
  const header = { alg: 'HS256', typ: 'JWT' }
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + expiresInSec
  const body = { ...payload, iat, exp }
  const data = `${b64urlJSON(header)}.${b64urlJSON(body)}`
  const secret = (process.env.JWT_SECRET || 'dev-secret').toString()
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${data}.${sig}`
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  const data = `${h}.${p}`
  const secret = (process.env.JWT_SECRET || 'dev-secret').toString()
  const expSig = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  if (!timingSafeEqual(s, expSig)) return null
  try {
    const json = Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const payload = JSON.parse(json)
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && now > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

function cookieAttrs(req, { maxAgeSec = 0 } = {}) {
  const attrs = ['HttpOnly', 'Path=/', 'SameSite=Lax']
  if (maxAgeSec) attrs.push(`Max-Age=${maxAgeSec}`)
  const proto = (req.headers['x-forwarded-proto'] || '').toString()
  const host = (req.headers.host || '').toString()
  const isHttps = proto === 'https' || host.endsWith('.vercel.app') || process.env.NODE_ENV === 'production'
  if (isHttps) attrs.push('Secure')
  return attrs.join('; ')
}

function setAuthCookie(res, token, req, maxAgeSec) {
  res.setHeader('Set-Cookie', `auth=${token}; ${cookieAttrs(req, { maxAgeSec })}`)
}

function clearAuthCookie(res, req) {
  // Expire immediately
  const proto = (req.headers['x-forwarded-proto'] || '').toString()
  const host = (req.headers.host || '').toString()
  const isHttps = proto === 'https' || host.endsWith('.vercel.app') || process.env.NODE_ENV === 'production'
  const secure = isHttps ? '; Secure' : ''
  res.setHeader('Set-Cookie', `auth=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`)
}

function parseCookies(req) {
  const header = (req.headers.cookie || '').toString()
  const out = {}
  header.split(';').map(s => s.trim()).filter(Boolean).forEach(pair => {
    const idx = pair.indexOf('=')
    if (idx > -1) out[pair.slice(0, idx)] = decodeURIComponent(pair.slice(idx + 1))
  })
  return out
}

function getTokenFromRequest(req) {
  const cookies = parseCookies(req)
  return cookies['auth'] || ''
}

module.exports = { signToken, verifyToken, setAuthCookie, clearAuthCookie, getTokenFromRequest }
