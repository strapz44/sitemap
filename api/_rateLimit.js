/**
 * Rate limiter hybride : MongoDB persistent + in-memory fallback.
 * Protège contre brute-force sur login/register/reset.
 */

const MAX_ATTEMPTS_PER_IP = 20       // par heure par IP
const MAX_ATTEMPTS_PER_EMAIL = 8     // par heure par email
const LOCKOUT_MINUTES = 15

// ── In-memory fallback (Vercel cold-start / no MongoDB) ─────────
const hits = new Map()

function rateLimit(opts, req) {
  const ip = getClientIp(req)
  const key = `${opts.keyPrefix}:${ip}`
  const now = Date.now()
  let entry = hits.get(key)
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + (opts.windowMs || 60000) }
    hits.set(key, entry)
  }
  entry.count++
  if (entry.count > (opts.limit || 100)) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) }
  }
  return { ok: true }
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key)
  }
}, 5 * 60 * 1000).unref()

// ── MongoDB persistent rate limiting ────────────────────────────
async function recordAttempt(db, { ip, email, success }) {
  await db.collection('loginAttempts').insertOne({
    ip: ip || 'unknown',
    email: (email || '').toLowerCase(),
    success: !!success,
    createdAt: new Date(),
  })
}

async function checkRateLimit(db, { ip, email }) {
  const since = new Date(Date.now() - 60 * 60 * 1000)
  const [ipCount, emailCount] = await Promise.all([
    db.collection('loginAttempts').countDocuments({
      ip, success: false, createdAt: { $gte: since },
    }),
    email
      ? db.collection('loginAttempts').countDocuments({
          email: email.toLowerCase(), success: false, createdAt: { $gte: since },
        })
      : Promise.resolve(0),
  ])
  if (ipCount >= MAX_ATTEMPTS_PER_IP) {
    return { blocked: true, reason: 'too_many_attempts_ip', retryAfter: LOCKOUT_MINUTES }
  }
  if (emailCount >= MAX_ATTEMPTS_PER_EMAIL) {
    return { blocked: true, reason: 'too_many_attempts_email', retryAfter: LOCKOUT_MINUTES }
  }
  return { blocked: false }
}

function getClientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    (req.headers['x-real-ip'] || '').toString().trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}

module.exports = { rateLimit, recordAttempt, checkRateLimit, getClientIp }
