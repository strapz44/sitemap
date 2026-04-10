const { ObjectId } = require('mongodb')
const { createHandler } = require('../_handler')
const { getDb } = require('../_mongo')
const { signToken, setAuthCookie, generateRefreshToken, setRefreshCookie, getRefreshTokenFromRequest, REFRESH_TTL } = require('../_tokens')
const { sanitizeUser } = require('../_authHelpers')

/**
 * POST /api/auth/refresh
 *
 * Implements refresh token rotation:
 *   1. Atomically find-and-delete the old session (prevents reuse)
 *   2. Issue a new access token + new refresh token
 *   3. If old token is already consumed → possible theft → reject
 */
module.exports = createHandler({
  methods: ['POST'],
}, async ({ json, req, res }) => {

  const oldRefreshToken = getRefreshTokenFromRequest(req)
  if (!oldRefreshToken) {
    return json(401, { ok: false, error: 'no_refresh_token' })
  }

  const db = await getDb()
  const sessions = db.collection('sessions')

  // Atomic find-and-delete prevents token reuse
  const session = await sessions.findOneAndDelete({ refreshToken: oldRefreshToken })

  if (!session) {
    // Token reuse detected → possible theft
    return json(401, { ok: false, error: 'invalid_refresh_token' })
  }

  // TTL index should handle expiry, but safety check
  if (session.expiresAt && session.expiresAt < new Date()) {
    return json(401, { ok: false, error: 'refresh_token_expired' })
  }

  const user = await db.collection('users').findOne(
    { _id: new ObjectId(session.userId) },
    { projection: { password_hash: 0, 'twoFactor.secret': 0, 'twoFactor.backupCodes': 0 } },
  )
  if (!user) {
    return json(401, { ok: false, error: 'user_not_found' })
  }

  // Issue new access token
  const token = signToken({ sub: user._id.toString(), email: user.email, name: user.name })
  setAuthCookie(res, token, req)

  // Issue new refresh token (rotation)
  const newRefreshToken = generateRefreshToken()
  const now = new Date()
  await sessions.insertOne({
    userId: user._id,
    refreshToken: newRefreshToken,
    userAgent: (req.headers['user-agent'] || '').slice(0, 256),
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown',
    createdAt: now,
    expiresAt: new Date(now.getTime() + REFRESH_TTL * 1000),
  })
  setRefreshCookie(res, newRefreshToken, req)

  return json(200, { ok: true, user: sanitizeUser(user) })
})
