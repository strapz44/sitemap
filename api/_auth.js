function getAuthToken(req) {
  const h = req.headers || {}
  const auth = (h.authorization || h.Authorization || '').toString()
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim()
  const alt = (h['x-admin-token'] || h['X-Admin-Token'] || '').toString().trim()
  if (alt) return alt
  try {
    const url = new URL(req.url, 'http://localhost')
    const q = url.searchParams.get('admin_token')
    if (q) return q
  } catch {}
  return ''
}

function requireAdmin(req, res) {
  const expected = (process.env.ADMIN_API_TOKEN || '').toString()
  if (!expected) return true // no token set -> allow for DX
  const got = getAuthToken(req)
  if (got && got === expected) return true
  res.statusCode = 401
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ ok: false, error: 'unauthorized' }))
  return false
}

function parseList(str) {
  const raw = (str || '').trim()
  if (!raw) return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toRegex(pat) {
  if (pat === '*') return /.*/i
  const rx = '^' + escapeRegex(pat).replace(/\\\*/g, '.*') + '$'
  try { return new RegExp(rx, 'i') } catch { return null }
}

function normalizeSite(v) {
  if (!v) return ''
  try {
    const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`
    const u = new URL(withProto)
    return u.host
  } catch {
    return String(v || '').trim()
  }
}

function enforceSite(req, res, site) {
  const list = parseList(process.env.ALLOWED_SITES)
  if (list.length === 0) return true // no restriction
  const host = normalizeSite(site)
  if (!host) {
    res.statusCode = 403
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: 'site_required' }))
    return false
  }
  const ok = list.some(p => {
    const re = toRegex(p)
    return re ? re.test(host) : (host === p)
  })
  if (ok) return true
  res.statusCode = 403
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ ok: false, error: 'site_forbidden' }))
  return false
}

module.exports = { requireAdmin, enforceSite }
