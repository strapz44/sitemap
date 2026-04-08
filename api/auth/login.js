const { getDb } = require('../_mongo')
const { setCors, handlePreflight } = require('../_cors')
const { signToken, setAuthCookie, generateRefreshToken, setRefreshCookie, REFRESH_TTL } = require('../_tokens')
const { readBody, verifyPassword, sanitizeUser } = require('../_authHelpers')
const { rateLimit, recordAttempt, checkRateLimit, getClientIp } = require('../_rateLimit')
const { verifyTotp } = require('../_totp')

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') return handlePreflight(req, res)
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }

  // In-memory rate limit (first line of defense)
  const rl = rateLimit({ keyPrefix: 'login', limit: 15, windowMs: 60 * 1000 }, req)
  if (!rl.ok) {
    res.statusCode = 429; res.setHeader('Content-Type', 'application/json')
    res.setHeader('Retry-After', String(rl.retryAfterSec))
    return res.end(JSON.stringify({ ok: false, error: 'rate_limited', retryAfter: rl.retryAfterSec }))
  }

  const body = await readBody(req)
  const email = (body.email || '').toString().trim()
  const password = (body.password || '').toString()
  const totpCode = (body.totpCode || body.totp || '').toString().trim()
  const backupCode = (body.backupCode || '').toString().trim()

  if (!email || !password) {
    res.statusCode = 400; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'missing_credentials' }))
  }

  try {
    const db = await getDb()
    const ip = getClientIp(req)

    // MongoDB persistent rate limit
    const limit = await checkRateLimit(db, { ip, email })
    if (limit.blocked) {
      res.statusCode = 429; res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: false, error: limit.reason, retryAfter: limit.retryAfter }))
    }

    const user = await db.collection('users').findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    })

    // Constant-time: always verify even if user not found (prevent enumeration)
    const fakeHash = 's2$0000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000'
    const valid = await verifyPassword(password, user ? user.password_hash : fakeHash)

    if (!user || !valid) {
      await recordAttempt(db, { ip, email, success: false })
      res.statusCode = 401; res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: false, error: 'invalid_credentials' }))
    }

    // ── 2FA check ──
    if (user.twoFactor && user.twoFactor.enabled) {
      // Try backup code
      if (backupCode) {
        const idx = (user.twoFactor.backupCodes || []).indexOf(backupCode)
        if (idx === -1) {
          await recordAttempt(db, { ip, email, success: false })
          res.statusCode = 401; res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ ok: false, error: 'invalid_backup_code' }))
        }
        // Consume backup code (one-time use)
        const updated = [...user.twoFactor.backupCodes]
        updated.splice(idx, 1)
        await db.collection('users').updateOne({ _id: user._id }, { $set: { 'twoFactor.backupCodes': updated } })
      } else if (totpCode) {
        if (!verifyTotp(user.twoFactor.secret, totpCode)) {
          await recordAttempt(db, { ip, email, success: false })
          res.statusCode = 401; res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ ok: false, error: 'invalid_totp' }))
        }
      } else {
        // 2FA required but no code provided → tell client to show 2FA input
        res.statusCode = 200; res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({ ok: false, requires2FA: true }))
      }
    }

    // ── Success: issue tokens ──
    await recordAttempt(db, { ip, email, success: true })
    await db.collection('users').updateOne({ _id: user._id }, {
      $set: { lastLogin: new Date(), updatedAt: new Date() },
      $inc: { loginCount: 1 },
    })

    const token = signToken({ sub: user._id.toString(), email: user.email, name: user.name })
    setAuthCookie(res, token, req)

    // Refresh token with session tracking
    const refreshToken = generateRefreshToken()
    const now = new Date()
    await db.collection('sessions').insertOne({
      userId: user._id,
      refreshToken,
      userAgent: (req.headers['user-agent'] || '').slice(0, 256),
      ip,
      createdAt: now,
      expiresAt: new Date(now.getTime() + REFRESH_TTL * 1000),
    })
    setRefreshCookie(res, refreshToken, req)

    res.statusCode = 200; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: true, user: sanitizeUser(user) }))
  } catch (e) {
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'login_failed' }))
  }
}
