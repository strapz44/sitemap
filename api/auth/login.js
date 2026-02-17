const crypto = require('crypto')
const { getPool, ensureSchema } = require('../_db')
const { setCors, handlePreflight } = require('../_cors')
const { signToken, setAuthCookie } = require('../_tokens')

function readBody(req) {
  return new Promise(resolve => {
    let data = ''
    req.on('data', c => { data += c })
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '').toLowerCase()
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) }
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(data)
        const obj = {}; for (const [k, v] of params.entries()) obj[k] = v
        resolve(obj)
      } else { resolve({}) }
    })
  })
}

function scryptAsync(password, salt, len = 32) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, len, (err, dk) => err ? reject(err) : resolve(dk))
  })
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('s2$')) return false
  const [, saltHex, hashHex] = stored.split('$')
  if (!saltHex || !hashHex) return false
  const hash = await scryptAsync(password, Buffer.from(saltHex, 'hex'), 32)
  try {
    return crypto.timingSafeEqual(Buffer.from(hashHex, 'hex'), hash)
  } catch { return false }
}

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }

  if (req.method !== 'POST' && req.method !== 'GET') { res.statusCode = 405; return res.end('Method Not Allowed') }

  if (!(process.env.POSTGRES_URL || process.env.DATABASE_URL)) {
    res.statusCode = 503
    res.setHeader('Content-Type','application/json')
    return res.end(JSON.stringify({ ok:false, error:'db_not_configured' }))
  }

  await ensureSchema()
  const pool = getPool()

  let email = ''
  let password = ''
  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost')
    email = (url.searchParams.get('email') || '').toString()
    password = (url.searchParams.get('password') || '').toString()
  } else {
    const body = await readBody(req)
    email = (body.email || '').toString()
    password = (body.password || '').toString()
  }

  try {
    const { rows } = await pool.query('select id, email, name, password_hash from users where lower(email) = lower($1) limit 1', [email])
    const user = rows[0]
    if (!user) { res.statusCode = 401; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ ok:false, error:'invalid_credentials' })) }

    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) { res.statusCode = 401; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ ok:false, error:'invalid_credentials' })) }

    const token = signToken({ sub: user.id, email: user.email, name: user.name }, 60*60*24*7)
    setAuthCookie(res, token, req, 60*60*24*7)

    res.setHeader('Content-Type','application/json')
    return res.end(JSON.stringify({ ok:true, user: { id: user.id, email: user.email, name: user.name } }))
  } catch (e) {
    res.statusCode = 500; res.setHeader('Content-Type','application/json')
    return res.end(JSON.stringify({ ok:false, error:'login_failed' }))
  }
}
