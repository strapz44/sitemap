const { setCors, handlePreflight } = require('../../_cors')
const store = require('../../_store')

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }

  const siteParam = decodeURIComponent((req.query && req.query.site) || '')
  if (!siteParam) { res.statusCode = 400; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ error: 'site requis' })) }

  const summary = store.getSummary(siteParam)
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(summary || { site: siteParam }))
}
