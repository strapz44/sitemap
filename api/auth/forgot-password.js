const crypto = require('crypto')
const { getDb } = require('../_mongo')
const { setCors, handlePreflight } = require('../_cors')
const { readBody, isValidEmail } = require('../_authHelpers')
const { rateLimit } = require('../_rateLimit')

/**
 * POST /api/auth/forgot-password
 * Generates a reset token, stores it in MongoDB, returns the token info.
 * In production, this would send an email. For now, returns the reset URL.
 */
module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') return handlePreflight(req, res)
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }

  // Strict rate limit on password reset
  const rl = rateLimit({ keyPrefix: 'forgot', limit: 3, windowMs: 15 * 60 * 1000 }, req)
  if (!rl.ok) {
    res.statusCode = 429; res.setHeader('Content-Type', 'application/json')
    res.setHeader('Retry-After', String(rl.retryAfterSec))
    return res.end(JSON.stringify({ ok: false, error: 'rate_limited', retryAfter: rl.retryAfterSec }))
  }

  const body = await readBody(req)
  const email = (body.email || '').toString().trim()

  // Always return success (prevent email enumeration)
  const successResponse = () => {
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' }))
  }

  if (!isValidEmail(email)) return successResponse()

  try {
    const db = await getDb()
    const user = await db.collection('users').findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    })

    if (!user) return successResponse()

    // Generate secure reset token (64 bytes = 128 hex chars)
    const token = crypto.randomBytes(64).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // Delete any existing reset tokens for this user
    await db.collection('resetTokens').deleteMany({ userId: user._id })

    // Store hashed token (never store raw token in DB)
    await db.collection('resetTokens').insertOne({
      userId: user._id,
      token: hashedToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    })

    // In production: send email with reset link
    // For now: include token in response (dev mode only)
    const baseUrl = process.env.APP_URL || (req.headers.origin || 'http://localhost:5173')
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    res.statusCode = 200; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({
      ok: true,
      message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
      // DEV ONLY — remove in production email integration
      ...(process.env.NODE_ENV !== 'production' ? { _devResetUrl: resetUrl, _devToken: token } : {}),
    }))
  } catch (e) {
    return successResponse()
  }
}
