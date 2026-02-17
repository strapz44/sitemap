const { setCors, handlePreflight } = require('../../_cors')

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
  const limit = Math.max(1, Math.min(parseInt((req.query && req.query.limit) || '25', 10) || 25, 100))
  const pages = Array.from({ length: limit }, (_, i) => {
    const url = i === 0 ? `${base}/` : `${base}/page-${i}`
    return { url, status: 200, title: `Sample page ${i || 1}`, html: `<html><head><title>Sample ${i || 1}</title></head><body><h1>Sample ${i || 1}</h1></body></html>` }
  })
  const body = { site: base, count: pages.length, concurrency: 4, saved: true, pages }
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}
