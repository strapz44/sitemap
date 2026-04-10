const { ObjectId } = require('mongodb')
const { createHandler } = require('../_handler')
const { getDb } = require('../_mongo')
const { verifyPassword } = require('../_authHelpers')
const { generateSecret, buildOtpauthUri, verifyTotp, generateBackupCodes } = require('../_totp')

/**
 * POST /api/auth/2fa
 *
 * Multi-action endpoint (body.action):
 *   setup   — Generate TOTP secret + otpauth URI for QR display.
 *   enable  — Verify code against pending secret, activate 2FA, issue backup codes.
 *   disable — Require current password, deactivate 2FA.
 *
 * All actions require authentication (JWT).
 */
module.exports = createHandler({
  methods: ['POST'],
  auth: true,
}, async ({ body, json, auth }) => {

  const action = (body.action || '').toString().toLowerCase()

  const db    = await getDb()
  const users = db.collection('users')
  const user  = await users.findOne({ _id: new ObjectId(auth.sub) })

  if (!user) return json(404, { ok: false, error: 'user_not_found' })

  // ── SETUP: Generate secret + QR URI ───────────────
  if (action === 'setup') {
    const secret     = generateSecret()
    const otpauthUri = buildOtpauthUri(secret, user.email)

    await users.updateOne({ _id: user._id }, {
      $set: { 'twoFactor.pendingSecret': secret, updatedAt: new Date() },
    })

    return json(200, { ok: true, secret, otpauthUri })
  }

  // ── ENABLE: Verify TOTP code and activate 2FA ────
  if (action === 'enable') {
    const code          = (body.code || '').toString().trim()
    const pendingSecret = user.twoFactor?.pendingSecret

    if (!pendingSecret) {
      return json(400, { ok: false, error: 'no_pending_setup', message: 'Lancez d\'abord le setup 2FA' })
    }
    if (!verifyTotp(pendingSecret, code)) {
      return json(400, { ok: false, error: 'invalid_code', message: 'Code invalide. Vérifiez votre application authenticator.' })
    }

    const backupCodes = generateBackupCodes()

    await users.updateOne({ _id: user._id }, {
      $set: {
        'twoFactor.enabled': true,
        'twoFactor.secret': pendingSecret,
        'twoFactor.backupCodes': backupCodes,
        'twoFactor.enabledAt': new Date(),
        updatedAt: new Date(),
      },
      $unset: { 'twoFactor.pendingSecret': '' },
    })

    return json(200, {
      ok: true,
      message: 'Authentification à deux facteurs activée.',
      backupCodes, // ⚠️ Show ONCE — user must save them
    })
  }

  // ── DISABLE: Requires current password ────────────
  if (action === 'disable') {
    const password = (body.password || '').toString()
    if (!password) {
      return json(400, { ok: false, error: 'password_required' })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) return json(401, { ok: false, error: 'invalid_password' })

    await users.updateOne({ _id: user._id }, {
      $set: {
        'twoFactor.enabled': false,
        'twoFactor.secret': null,
        'twoFactor.backupCodes': [],
        'twoFactor.pendingSecret': null,
        updatedAt: new Date(),
      },
    })

    return json(200, { ok: true, message: 'Authentification à deux facteurs désactivée.' })
  }

  return json(400, { ok: false, error: 'invalid_action', message: 'Action valide: setup, enable, disable' })
})
