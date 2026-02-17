const { setCors, handlePreflight } = require('../_cors')

function baseOf(raw) {
  const s = (raw || '').trim()
  if (!s) return ''
  const clean = s.replace(/\/$/, '')
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`
}

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }

  const siteParam = decodeURIComponent((req.query && req.query.site) || 'example.com')
  const base = baseOf(siteParam)
  res.statusCode = 302
  res.setHeader('Location', `/api/sitemaps/${encodeURIComponent(base)}`)
  res.end()
}
