const { ObjectId } = require('mongodb')
const { getDb } = require('../_mongo')
const { setCors, handlePreflight } = require('../_cors')
const { getTokenFromRequest, verifyToken } = require('../_tokens')
const { readBody, verifyPassword } = require('../_authHelpers')
const { generateSecret, buildOtpauthUri, verifyTotp, generateBackupCodes } = require('../_totp')

/**
 * POST /api/auth/2fa/setup — Start 2FA setup (returns secret + QR URI)
 * POST /api/auth/2fa/enable — Confirm 2FA with a valid TOTP code
 * POST /api/auth/2fa/disable — Disable 2FA (requires password)
 *
 * Route: Vercel treats this file as /api/auth/2fa (catch-all via request path parsing).
 * The action is determined by the `action` body field or the URL path suffix.
 */
module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') return handlePreflight(req, res)
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }

  // Auth required
  const token = getTokenFromRequest(req)
  const payload = verifyToken(token)
  if (!payload || !payload.sub) {
    res.statusCode = 401; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'unauthenticated' }))
  }

  const body = await readBody(req)
  const action = (body.action || '').toString().toLowerCase()

  try {
    const db = await getDb()
    const users = db.collection('users')
    const user = await users.findOne({ _id: new ObjectId(payload.sub) })
    if (!user) {
      res.statusCode = 404; res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: false, error: 'user_not_found' }))
    }

    // ── SETUP: Generate secret + QR URI ──
    if (action === 'setup') {
      const secret = generateSecret()
      const otpauthUri = buildOtpauthUri(secret, user.email)

      // Store pending secret (not enabled yet)
      await users.updateOne({ _id: user._id }, {
        $set: { 'twoFactor.pendingSecret': secret, updatedAt: new Date() },
      })

      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: true, secret, otpauthUri }))
    }

    // ── ENABLE: Verify TOTP code and activate 2FA ──
    if (action === 'enable') {
      const code = (body.code || '').toString().trim()
      const pendingSecret = user.twoFactor?.pendingSecret

      if (!pendingSecret) {
        res.statusCode = 400; res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({ ok: false, error: 'no_pending_setup', message: 'Lancez d\'abord le setup 2FA' }))
      }
      if (!verifyTotp(pendingSecret, code)) {
        res.statusCode = 400; res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({ ok: false, error: 'invalid_code', message: 'Code invalide. Vérifiez votre application authenticator.' }))
      }

      // Generate backup codes
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

      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({
        ok: true,
        message: 'Authentification à deux facteurs activée.',
        backupCodes, // Show ONCE — user must save them
      }))
    }

    // ── DISABLE: Requires current password ──
    if (action === 'disable') {
      const password = (body.password || '').toString()
      if (!password) {
        res.statusCode = 400; res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({ ok: false, error: 'password_required' }))
      }

      const valid = await verifyPassword(password, user.password_hash)
      if (!valid) {
        res.statusCode = 401; res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({ ok: false, error: 'invalid_password' }))
      }

      await users.updateOne({ _id: user._id }, {
        $set: {
          'twoFactor.enabled': false,
          'twoFactor.secret': null,
          'twoFactor.backupCodes': [],
          'twoFactor.pendingSecret': null,
          updatedAt: new Date(),
        },
      })

      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: true, message: 'Authentification à deux facteurs désactivée.' }))
    }

    res.statusCode = 400; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'invalid_action', message: 'Action valide: setup, enable, disable' }))
  } catch (e) {
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: '2fa_failed' }))
  }
}
