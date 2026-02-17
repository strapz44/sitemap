const { getPool, ensureSchema } = require('../_db')
const { setCors, handlePreflight } = require('../_cors')
const { getTokenFromRequest, verifyToken } = require('../_tokens')

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }

  if (req.method !== 'GET') { res.statusCode = 405; return res.end('Method Not Allowed') }

  const token = getTokenFromRequest(req)
  const payload = verifyToken(token)
  if (!payload || !payload.sub) { res.statusCode = 401; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ ok:false, error:'unauthenticated' })) }

  if (!(process.env.POSTGRES_URL || process.env.DATABASE_URL)) {
    res.statusCode = 503
    res.setHeader('Content-Type','application/json')
    return res.end(JSON.stringify({ ok:false, error:'db_not_configured' }))
  }

  await ensureSchema()
  const pool = getPool()
  try {
    const { rows } = await pool.query('select id, email, name, created_at from users where id = $1 limit 1', [payload.sub])
    const user = rows[0]
    if (!user) { res.statusCode = 404; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ ok:false, error:'user_not_found' })) }
    res.setHeader('Content-Type','application/json')
    return res.end(JSON.stringify({ ok:true, user }))
  } catch (e) {
    res.statusCode = 500; res.setHeader('Content-Type','application/json')
    return res.end(JSON.stringify({ ok:false, error:'me_failed' }))
  }
}
