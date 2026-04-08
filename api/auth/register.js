const { getDb } = require('../_mongo')
const { setCors, handlePreflight } = require('../_cors')
const { signToken, setAuthCookie, generateRefreshToken, setRefreshCookie, ACCESS_TTL, REFRESH_TTL } = require('../_tokens')
const { readBody, hashPassword, isValidEmail, sanitizeUser } = require('../_authHelpers')
const { rateLimit } = require('../_rateLimit')

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') return handlePreflight(req, res)
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }

  // Rate limit
  const rl = rateLimit({ keyPrefix: 'register', limit: 5, windowMs: 60 * 60 * 1000 }, req)
  if (!rl.ok) {
    res.statusCode = 429; res.setHeader('Content-Type', 'application/json')
    res.setHeader('Retry-After', String(rl.retryAfterSec))
    return res.end(JSON.stringify({ ok: false, error: 'rate_limited', retryAfter: rl.retryAfterSec }))
  }

  const body = await readBody(req)
  const email = (body.email || '').toString().trim()
  const password = (body.password || '').toString()
  const name = (body.name || '').toString().trim() || null

  if (!isValidEmail(email)) {
    res.statusCode = 400; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'invalid_email' }))
  }
  if (!password || password.length < 8) {
    res.statusCode = 400; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'weak_password', message: 'Le mot de passe doit contenir au moins 8 caractères' }))
  }
  // Password strength: at least 1 uppercase, 1 lowercase, 1 digit
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    res.statusCode = 400; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'weak_password', message: 'Le mot de passe doit contenir majuscule, minuscule et chiffre' }))
  }

  try {
    const db = await getDb()
    const users = db.collection('users')

    // Check duplicate (case-insensitive)
    const existing = await users.findOne({ email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })
    if (existing) {
      res.statusCode = 409; res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: false, error: 'email_taken' }))
    }

    const password_hash = await hashPassword(password)
    const now = new Date()
    const result = await users.insertOne({
      email: email.toLowerCase(),
      password_hash,
      name,
      twoFactor: { enabled: false, secret: null, backupCodes: [] },
      lastLogin: now,
      loginCount: 1,
      createdAt: now,
      updatedAt: now,
    })

    const user = { _id: result.insertedId, email: email.toLowerCase(), name, createdAt: now }

    // Access token (15min) + refresh token (30 days)
    const token = signToken({ sub: user._id.toString(), email: user.email, name: user.name })
    setAuthCookie(res, token, req)

    const refreshToken = generateRefreshToken()
    await db.collection('sessions').insertOne({
      userId: user._id,
      refreshToken,
      userAgent: (req.headers['user-agent'] || '').slice(0, 256),
      ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown',
      createdAt: now,
      expiresAt: new Date(now.getTime() + REFRESH_TTL * 1000),
    })
    setRefreshCookie(res, refreshToken, req)

    res.statusCode = 201; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: true, user: sanitizeUser(user) }))
  } catch (e) {
    if (e.code === 11000) {
      res.statusCode = 409; res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: false, error: 'email_taken' }))
    }
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'register_failed' }))
  }
}
