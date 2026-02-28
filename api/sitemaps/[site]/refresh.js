const { setCors, handlePreflight } = require('../../_cors')
const store = require('../../_store')

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }

  const siteParam = decodeURIComponent((req.query && req.query.site) || '')
  if (!siteParam) { res.statusCode = 400; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ ok:false, error:'site requis' })) }

  const s = store.touchCrawl(siteParam)
  if (s) s.lastmodLatest = new Date().toISOString()

  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ ok: true, site: siteParam }))
}
