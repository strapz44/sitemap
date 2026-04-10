/**
 * Hybrid rate limiter — Prerender V3.
 *
 * Two layers:
 *   1. In-memory (fast, per-instance) — first line of defense on Vercel cold starts
 *   2. MongoDB persistent (accurate, cross-instance) — for auth brute-force protection
 *
 * In-memory limitations: Vercel serverless instances are ephemeral.
 * The in-memory map resets on each cold start and only protects within a single instance.
 * MongoDB rate limiting provides the real cross-instance protection.
 */

// ── Configuration ───────────────────────────────────────────────

const MAX_ATTEMPTS_PER_IP    = 20   // per hour per IP
const MAX_ATTEMPTS_PER_EMAIL = 8    // per hour per email
const LOCKOUT_MINUTES        = 15
const MAX_MAP_ENTRIES        = 10_000 // safety cap to prevent unbounded growth

// ── In-Memory Rate Limiter ──────────────────────────────────────

const hits = new Map()

function rateLimit(opts, req) {
  // Safety: prevent unbounded growth (shouldn't happen in serverless, but defensive)
  if (hits.size > MAX_MAP_ENTRIES) hits.clear()

  const ip = getClientIp(req)
  const key = `${opts.keyPrefix}:${ip}`
  const now = Date.now()

  let entry = hits.get(key)
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + (opts.windowMs || 60_000) }
    hits.set(key, entry)
  }

  entry.count++

  if (entry.count > (opts.limit || 100)) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) }
  }

  return { ok: true }
}

// Cleanup expired entries every 60 seconds
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key)
  }
}, 60_000).unref()

// ── MongoDB Persistent Rate Limiter ─────────────────────────────

async function recordAttempt(db, { ip, email, success }) {
  await db.collection('loginAttempts').insertOne({
    ip: ip || 'unknown',
    email: (email || '').toLowerCase(),
    success: !!success,
    createdAt: new Date(),
  })
}

async function checkRateLimit(db, { ip, email }) {
  const since = new Date(Date.now() - 60 * 60 * 1000) // 1 hour window

  const [ipCount, emailCount] = await Promise.all([
    db.collection('loginAttempts').countDocuments({
      ip,
      success: false,
      createdAt: { $gte: since },
    }),
    email
      ? db.collection('loginAttempts').countDocuments({
          email: email.toLowerCase(),
          success: false,
          createdAt: { $gte: since },
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

// ── Shared Utility ──────────────────────────────────────────────

function getClientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    (req.headers['x-real-ip'] || '').toString().trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}

// ── Exports ─────────────────────────────────────────────────────

module.exports = { rateLimit, recordAttempt, checkRateLimit, getClientIp }
