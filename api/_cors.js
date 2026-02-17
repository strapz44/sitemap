function parseAllowlist(str) {
  const raw = (str || '').trim()
  if (!raw) return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function entryToRegex(entry) {
  if (entry === '*') return /.*/i
  // Support wildcard like https://*.example.com
  const pattern = '^' + escapeRegex(entry).replace(/\\\*/g, '.*') + '$'
  try { return new RegExp(pattern, 'i') } catch { return null }
}

function isOriginAllowed(origin, allowlist) {
  if (!allowlist || allowlist.length === 0) return true
  if (!origin) return false
  return allowlist.some(entry => {
    const re = entryToRegex(entry)
    return re ? re.test(origin) : (origin === entry)
  })
}

function setCors(req, res) {
  const origin = req.headers.origin || ''
  const allowlist = parseAllowlist(process.env.ALLOWED_ORIGINS)
  const allowed = isOriginAllowed(origin, allowlist)

  if (allowlist.length === 0) {
    // No allowlist configured: permissive for DX
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
  } else if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '600')
  // Baseline API security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  return allowed
}

function handlePreflight(req, res) {
  setCors(req, res)
  res.statusCode = 204
  res.end()
}

module.exports = { setCors, isOriginAllowed, handlePreflight }
