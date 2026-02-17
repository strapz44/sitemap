const store = require('../../_store')
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

  const siteParam = decodeURIComponent((req.query && req.query.site) || '')
  const base = baseOf(siteParam)
  if (!base) { res.statusCode = 400; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ error: 'site invalide' })) }

  if (req.method === 'GET') {
    const now = new Date()
    const iso = (d) => new Date(d).toISOString()
    const urls = [
      { loc: `${base}/`, lastmod: iso(now), priority: '1.0', changefreq: 'weekly' },
      { loc: `${base}/about`, lastmod: iso(now.getTime() - 7*24*3600*1000), priority: '0.7', changefreq: 'monthly' },
      { loc: `${base}/contact`, lastmod: iso(now.getTime() - 30*24*3600*1000), priority: '0.6', changefreq: 'monthly' },
    ]
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ siteName: base, urls }))
  }

  if (req.method === 'DELETE') {
    const list = store.get()
    const next = list.filter(s => s.siteName !== base)
    if (next.length !== list.length) store.set(next)
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: true }))
  }

  res.statusCode = 405
  res.end('Method Not Allowed')
}
