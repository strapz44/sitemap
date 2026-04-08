const crypto = require('crypto')
const { getDb } = require('../_mongo')
const { setCors, handlePreflight } = require('../_cors')
const { readBody, hashPassword } = require('../_authHelpers')
const { rateLimit } = require('../_rateLimit')

/**
 * POST /api/auth/reset-password
 * Verifies the reset token and updates the password.
 */
module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') return handlePreflight(req, res)
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }

  const rl = rateLimit({ keyPrefix: 'reset', limit: 5, windowMs: 15 * 60 * 1000 }, req)
  if (!rl.ok) {
    res.statusCode = 429; res.setHeader('Content-Type', 'application/json')
    res.setHeader('Retry-After', String(rl.retryAfterSec))
    return res.end(JSON.stringify({ ok: false, error: 'rate_limited', retryAfter: rl.retryAfterSec }))
  }

  const body = await readBody(req)
  const token = (body.token || '').toString().trim()
  const newPassword = (body.password || '').toString()

  if (!token) {
    res.statusCode = 400; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'missing_token' }))
  }
  if (!newPassword || newPassword.length < 8) {
    res.statusCode = 400; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'weak_password', message: 'Le mot de passe doit contenir au moins 8 caractères' }))
  }
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    res.statusCode = 400; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'weak_password', message: 'Le mot de passe doit contenir majuscule, minuscule et chiffre' }))
  }

  try {
    const db = await getDb()
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const resetEntry = await db.collection('resetTokens').findOne({
      token: hashedToken,
      expiresAt: { $gt: new Date() },
    })

    if (!resetEntry) {
      res.statusCode = 400; res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: false, error: 'invalid_or_expired_token' }))
    }

    const password_hash = await hashPassword(newPassword)

    // Update password & invalidate all sessions
    await Promise.all([
      db.collection('users').updateOne(
        { _id: resetEntry.userId },
        { $set: { password_hash, updatedAt: new Date() } }
      ),
      db.collection('sessions').deleteMany({ userId: resetEntry.userId }),
      db.collection('resetTokens').deleteMany({ userId: resetEntry.userId }),
    ])

    res.statusCode = 200; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: true, message: 'Mot de passe mis à jour avec succès. Veuillez vous reconnecter.' }))
  } catch (e) {
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'reset_failed' }))
  }
}
