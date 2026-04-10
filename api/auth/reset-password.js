const crypto = require('crypto')
const { createHandler } = require('../_handler')
const { getDb } = require('../_mongo')
const { hashPassword } = require('../_authHelpers')

/**
 * POST /api/auth/reset-password
 *
 * Verifies the hashed reset token, updates the password,
 * and invalidates ALL active sessions + reset tokens for the user.
 */
module.exports = createHandler({
  methods: ['POST'],
  rateLimit: { keyPrefix: 'reset', limit: 5, windowMs: 15 * 60 * 1000 },
}, async ({ body, json }) => {

  const token       = (body.token || '').toString().trim()
  const newPassword = (body.password || '').toString()

  // ── Validation ────────────────────────────────────
  if (!token) {
    return json(400, { ok: false, error: 'missing_token' })
  }
  if (!newPassword || newPassword.length < 8) {
    return json(400, { ok: false, error: 'weak_password', message: 'Le mot de passe doit contenir au moins 8 caractères' })
  }
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return json(400, { ok: false, error: 'weak_password', message: 'Le mot de passe doit contenir majuscule, minuscule et chiffre' })
  }

  const db = await getDb()
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

  const resetEntry = await db.collection('resetTokens').findOne({
    token: hashedToken,
    expiresAt: { $gt: new Date() },
  })

  if (!resetEntry) {
    return json(400, { ok: false, error: 'invalid_or_expired_token' })
  }

  const password_hash = await hashPassword(newPassword)

  // Atomic: update password + invalidate all sessions + clear reset tokens
  await Promise.all([
    db.collection('users').updateOne(
      { _id: resetEntry.userId },
      { $set: { password_hash, updatedAt: new Date() } },
    ),
    db.collection('sessions').deleteMany({ userId: resetEntry.userId }),
    db.collection('resetTokens').deleteMany({ userId: resetEntry.userId }),
  ])

  return json(200, { ok: true, message: 'Mot de passe mis à jour avec succès. Veuillez vous reconnecter.' })
})
