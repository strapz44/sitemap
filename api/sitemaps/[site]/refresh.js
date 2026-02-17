const { setCors, handlePreflight } = require('../../_cors')

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }

  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ ok: true }))
}
