const { getDb } = require('../_mongo')
const { setCors, handlePreflight } = require('../_cors')
const { clearAuthCookie, clearRefreshCookie, getRefreshTokenFromRequest } = require('../_tokens')

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') return handlePreflight(req, res)
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }

  // Revoke refresh token session in MongoDB
  const refreshToken = getRefreshTokenFromRequest(req)
  if (refreshToken) {
    try {
      const db = await getDb()
      await db.collection('sessions').deleteOne({ refreshToken })
    } catch { /* best effort */ }
  }

  clearAuthCookie(res, req)
  clearRefreshCookie(res, req)
  res.setHeader('Content-Type', 'application/json')
  return res.end(JSON.stringify({ ok: true }))
}
