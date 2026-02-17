const store = require('../_store')
const mockSitemaps = store.get()
const { setCors, handlePreflight } = require('../_cors')

function normalize(raw) {
  try {
    const s = (raw || '').trim()
    if (!s) return ''
    const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`
    const u = new URL(withProto)
    return `${u.protocol}//${u.host}`
  } catch (e) {
    return ''
  }
}

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }

  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify(mockSitemaps))
  }

  if (req.method === 'POST') {
    const raw = (req.query && req.query.url) || ''
    const site = normalize(raw)
    if (!site) { res.statusCode = 400; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ error: 'url invalide' })) }
    if (!mockSitemaps.find(s => s.siteName === site)) mockSitemaps.unshift({ siteName: site, urls: [] })
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: true }))
  }

  res.statusCode = 405
  res.end('Method Not Allowed')
}
