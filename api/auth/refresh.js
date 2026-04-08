const { ObjectId } = require('mongodb')
const { getDb } = require('../_mongo')
const { setCors, handlePreflight } = require('../_cors')
const { signToken, setAuthCookie, generateRefreshToken, setRefreshCookie, getRefreshTokenFromRequest, REFRESH_TTL } = require('../_tokens')
const { sanitizeUser } = require('../_authHelpers')

/**
 * POST /api/auth/refresh
 * Rotate refresh token and issue a new access token.
 * Implements refresh token rotation (old token invalidated on use).
 */
module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') return handlePreflight(req, res)
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }

  const oldRefreshToken = getRefreshTokenFromRequest(req)
  if (!oldRefreshToken) {
    res.statusCode = 401; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'no_refresh_token' }))
  }

  try {
    const db = await getDb()
    const sessions = db.collection('sessions')

    // Find and delete the old session (atomic — prevents reuse)
    const session = await sessions.findOneAndDelete({ refreshToken: oldRefreshToken })

    if (!session) {
      // Token reuse detected → possible theft → revoke all sessions for this user
      // We can't know the user from an invalid token, so just reject
      res.statusCode = 401; res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: false, error: 'invalid_refresh_token' }))
    }

    // Check if session was expired (shouldn't happen due to TTL index, but safety check)
    if (session.expiresAt && session.expiresAt < new Date()) {
      res.statusCode = 401; res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: false, error: 'refresh_token_expired' }))
    }

    // Fetch user
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(session.userId) },
      { projection: { password_hash: 0, 'twoFactor.secret': 0, 'twoFactor.backupCodes': 0 } }
    )
    if (!user) {
      res.statusCode = 401; res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: false, error: 'user_not_found' }))
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

    res.statusCode = 200; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: true, user: sanitizeUser(user) }))
  } catch (e) {
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'refresh_failed' }))
  }
}
