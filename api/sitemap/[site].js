function setCors(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function baseOf(raw) {
  const s = (raw || '').trim()
  if (!s) return ''
  const clean = s.replace(/\/$/, '')
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`
}

module.exports = async (req, res) => {
  setCors(req, res)
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }

  const siteParam = decodeURIComponent((req.query && req.query.site) || 'example.com')
  const base = baseOf(siteParam)
  res.statusCode = 302
  res.setHeader('Location', `/api/sitemaps/${encodeURIComponent(base)}`)
  res.end()
}
