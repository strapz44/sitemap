const { createHandler } = require('../_handler')
const { getDb } = require('../_mongo')
const { clearAuthCookie, clearRefreshCookie, getRefreshTokenFromRequest } = require('../_tokens')

module.exports = createHandler({
  methods: ['POST'],
}, async ({ json, req, res }) => {

  // Revoke refresh token session in MongoDB (best-effort)
  const refreshToken = getRefreshTokenFromRequest(req)
  if (refreshToken) {
    try {
      const db = await getDb()
      await db.collection('sessions').deleteOne({ refreshToken })
    } catch { /* best effort — logout should never fail */ }
  }

  clearAuthCookie(res, req)
  clearRefreshCookie(res, req)

  return json(200, { ok: true })
})
