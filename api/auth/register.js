const { createHandler } = require('../_handler')
const { getDb } = require('../_mongo')
const { signToken, setAuthCookie, generateRefreshToken, setRefreshCookie, REFRESH_TTL } = require('../_tokens')
const { hashPassword, isValidEmail, sanitizeUser } = require('../_authHelpers')

module.exports = createHandler({
  methods: ['POST'],
  rateLimit: { keyPrefix: 'register', limit: 5, windowMs: 60 * 60 * 1000 },
}, async ({ body, ip, json, req, res }) => {

  const email    = (body.email || '').toString().trim()
  const password = (body.password || '').toString()
  const name     = (body.name || '').toString().trim() || null

  // ── Validation ────────────────────────────────────
  if (!isValidEmail(email)) {
    return json(400, { ok: false, error: 'invalid_email' })
  }
  if (!password || password.length < 8) {
    return json(400, { ok: false, error: 'weak_password', message: 'Le mot de passe doit contenir au moins 8 caractères' })
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return json(400, { ok: false, error: 'weak_password', message: 'Le mot de passe doit contenir majuscule, minuscule et chiffre' })
  }

  const db = await getDb()
  const users = db.collection('users')

  // Check duplicate (case-insensitive)
  const existing = await users.findOne({
    email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  })
  if (existing) {
    return json(409, { ok: false, error: 'email_taken' })
  }

  const password_hash = await hashPassword(password)
  const now = new Date()

  try {
    const result = await users.insertOne({
      email: email.toLowerCase(),
      password_hash,
      name,
      twoFactor: { enabled: false, secret: null, backupCodes: [] },
      lastLogin: now,
      loginCount: 1,
      createdAt: now,
      updatedAt: now,
    })

    const user = { _id: result.insertedId, email: email.toLowerCase(), name, createdAt: now }

    // Issue tokens
    const token = signToken({ sub: user._id.toString(), email: user.email, name: user.name })
    setAuthCookie(res, token, req)

    const refreshToken = generateRefreshToken()
    await db.collection('sessions').insertOne({
      userId: user._id,
      refreshToken,
      userAgent: (req.headers['user-agent'] || '').slice(0, 256),
      ip,
      createdAt: now,
      expiresAt: new Date(now.getTime() + REFRESH_TTL * 1000),
    })
    setRefreshCookie(res, refreshToken, req)

    return json(201, { ok: true, user: sanitizeUser(user) })
  } catch (e) {
    if (e.code === 11000) return json(409, { ok: false, error: 'email_taken' })
    throw e // let handler boundary catch unexpected errors
  }
})
