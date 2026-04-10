const { createHandler } = require('../_handler')
const { getDb } = require('../_mongo')
const { signToken, setAuthCookie, generateRefreshToken, setRefreshCookie, REFRESH_TTL } = require('../_tokens')
const { verifyPassword, sanitizeUser } = require('../_authHelpers')
const { recordAttempt, checkRateLimit } = require('../_rateLimit')
const { verifyTotp } = require('../_totp')

module.exports = createHandler({
  methods: ['POST'],
  rateLimit: { keyPrefix: 'login', limit: 15, windowMs: 60_000 },
}, async ({ body, ip, json, req, res }) => {

  const email     = (body.email || '').toString().trim()
  const password  = (body.password || '').toString()
  const totpCode  = (body.totpCode || body.totp || '').toString().trim()
  const backupCode = (body.backupCode || '').toString().trim()

  if (!email || !password) {
    return json(400, { ok: false, error: 'missing_credentials' })
  }

  const db = await getDb()

  // MongoDB persistent rate limit (cross-instance)
  const limit = await checkRateLimit(db, { ip, email })
  if (limit.blocked) {
    return json(429, { ok: false, error: limit.reason, retryAfter: limit.retryAfter })
  }

  const user = await db.collection('users').findOne({
    email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  })

  // Constant-time verification — always hash even if user not found (prevent enumeration)
  const fakeHash = 's2$0000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000'
  const valid = await verifyPassword(password, user ? user.password_hash : fakeHash)

  if (!user || !valid) {
    await recordAttempt(db, { ip, email, success: false })
    return json(401, { ok: false, error: 'invalid_credentials' })
  }

  // ── Two-Factor Authentication ─────────────────────
  if (user.twoFactor?.enabled) {
    if (backupCode) {
      const idx = (user.twoFactor.backupCodes || []).indexOf(backupCode)
      if (idx === -1) {
        await recordAttempt(db, { ip, email, success: false })
        return json(401, { ok: false, error: 'invalid_backup_code' })
      }
      // Consume backup code (one-time use)
      const updated = [...user.twoFactor.backupCodes]
      updated.splice(idx, 1)
      await db.collection('users').updateOne({ _id: user._id }, { $set: { 'twoFactor.backupCodes': updated } })
    } else if (totpCode) {
      if (!verifyTotp(user.twoFactor.secret, totpCode)) {
        await recordAttempt(db, { ip, email, success: false })
        return json(401, { ok: false, error: 'invalid_totp' })
      }
    } else {
      // 2FA required but no code provided → client must show 2FA input
      return json(200, { ok: false, requires2FA: true })
    }
  }

  // ── Issue tokens ──────────────────────────────────
  await recordAttempt(db, { ip, email, success: true })
  await db.collection('users').updateOne({ _id: user._id }, {
    $set: { lastLogin: new Date(), updatedAt: new Date() },
    $inc: { loginCount: 1 },
  })

  const token = signToken({ sub: user._id.toString(), email: user.email, name: user.name })
  setAuthCookie(res, token, req)

  const refreshToken = generateRefreshToken()
  await db.collection('sessions').insertOne({
    userId: user._id,
    refreshToken,
    userAgent: (req.headers['user-agent'] || '').slice(0, 256),
    ip,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_TTL * 1000),
  })
  setRefreshCookie(res, refreshToken, req)

  return json(200, { ok: true, user: sanitizeUser(user) })
})
