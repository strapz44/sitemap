const crypto = require('crypto')
const { createHandler } = require('../_handler')
const { getDb } = require('../_mongo')
const { isValidEmail } = require('../_authHelpers')
const { sendEmail, resetPasswordEmail } = require('../_mailer')

/**
 * POST /api/auth/forgot-password
 *
 * Security:
 *   - Always returns success (prevents email enumeration)
 *   - Token stored as SHA-256 hash (never raw in DB)
 *   - 1-hour expiry with TTL index cleanup
 *   - Rate limited: 3 requests per 15 minutes
 *
 * TODO: Integrate email provider (SendGrid, AWS SES) for production.
 *       Until then, reset tokens are logged server-side only.
 */
module.exports = createHandler({
  methods: ['POST'],
  rateLimit: { keyPrefix: 'forgot', limit: 3, windowMs: 15 * 60 * 1000 },
}, async ({ body, json }) => {

  const email = (body.email || '').toString().trim()

  // Anti-enumeration: always return the same success message
  const success = () => json(200, {
    ok: true,
    message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
  })

  if (!isValidEmail(email)) return success()

  try {
    const db = await getDb()
    const user = await db.collection('users').findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    })

    if (!user) return success()

    // Generate secure reset token (64 bytes → 128 hex chars)
    const rawToken = crypto.randomBytes(64).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

    // Invalidate previous tokens for this user
    await db.collection('resetTokens').deleteMany({ userId: user._id })

    // Store hashed token only (never the raw token)
    await db.collection('resetTokens').insertOne({
      userId: user._id,
      token: hashedToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    })

    const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')
    const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`
    await sendEmail({
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe — Prerender',
      html: resetPasswordEmail(resetUrl),
    })
    console.info(`[forgot-password] Reset email sent to ${email}`)

    return success()
  } catch {
    // Swallow errors to prevent enumeration via timing
    return success()
  }
})
