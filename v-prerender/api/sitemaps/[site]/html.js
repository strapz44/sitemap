function setCors(req, res) {
  try {
    const origin = req.headers.origin || '*'
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  } catch {}
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
  const limit = Math.max(1, Math.min(parseInt((req.query && req.query.limit) || '25', 10) || 25, 100))
  const pages = Array.from({ length: limit }, (_, i) => {
    const url = i === 0 ? `${base}/` : `${base}/page-${i}`
    return { url, status: 200, title: `Sample page ${i || 1}`, html: `<html><head><title>Sample ${i || 1}</title></head><body><h1>Sample ${i || 1}</h1></body></html>` }
  })
  const body = { site: base, count: pages.length, concurrency: 4, saved: true, pages }
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}
