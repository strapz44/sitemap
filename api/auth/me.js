const { ObjectId } = require('mongodb')
const { getDb } = require('../_mongo')
const { setCors, handlePreflight } = require('../_cors')
const { getTokenFromRequest, verifyToken } = require('../_tokens')
const { sanitizeUser } = require('../_authHelpers')

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') return handlePreflight(req, res)
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }
  if (req.method !== 'GET') { res.statusCode = 405; return res.end('Method Not Allowed') }

  const token = getTokenFromRequest(req)
  const payload = verifyToken(token)
  if (!payload || !payload.sub) {
    res.statusCode = 401; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'unauthenticated' }))
  }

  try {
    const db = await getDb()
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(payload.sub) },
      { projection: { password_hash: 0, 'twoFactor.secret': 0, 'twoFactor.backupCodes': 0 } }
    )
    if (!user) {
      res.statusCode = 404; res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: false, error: 'user_not_found' }))
    }
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: true, user: sanitizeUser(user) }))
  } catch (e) {
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'me_failed' }))
  }
}
