const { setCors, handlePreflight } = require('../_cors')
const { clearAuthCookie } = require('../_tokens')

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }

  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }

  clearAuthCookie(res, req)
  res.setHeader('Content-Type','application/json')
  return res.end(JSON.stringify({ ok:true }))
}
