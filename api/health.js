const { setCors, handlePreflight } = require('./_cors')

module.exports = (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }
  try {
    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 200
    res.end(JSON.stringify({ status: 'ok' }))
  } catch (e) {
    res.statusCode = 500
    res.end(JSON.stringify({ status: 'error' }))
  }
}
