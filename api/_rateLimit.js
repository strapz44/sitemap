const buckets = new Map()

function clientIp(req) {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.length > 0) {
    return xf.split(',')[0].trim()
  }
  return (req.connection && req.connection.remoteAddress) || 'unknown'
}

function rateLimit(options = {}, req) {
  const limit = Number(options.limit || process.env.RATE_LIMIT_MAX || 60)
  const windowMs = Number(options.windowMs || process.env.RATE_LIMIT_WINDOW_MS || 60_000)
  const now = Date.now()
  const key = `${options.keyPrefix || 'rl'}:${clientIp(req)}`
  let b = buckets.get(key)
  if (!b || b.reset <= now) {
    b = { count: 0, reset: now + windowMs }
  }
  b.count += 1
  buckets.set(key, b)
  const ok = b.count <= limit
  const retryAfterSec = Math.max(0, Math.ceil((b.reset - now) / 1000))
  return { ok, retryAfterSec }
}

module.exports = { rateLimit }
