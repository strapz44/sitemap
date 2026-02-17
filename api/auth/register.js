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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').toString())
}

function scryptAsync(password, salt, len = 32) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, len, (err, dk) => err ? reject(err) : resolve(dk))
  })
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = await scryptAsync(password, salt, 32)
  return `s2$${salt.toString('hex')}$${hash.toString('hex')}`
}

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }

  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed') }

  if (!(process.env.POSTGRES_URL || process.env.DATABASE_URL)) {
    res.statusCode = 503
    res.setHeader('Content-Type','application/json')
    return res.end(JSON.stringify({ ok:false, error:'db_not_configured' }))
  }

  await ensureSchema()
  const pool = getPool()

  const body = await readBody(req)
  const email = (body.email || '').toString().trim()
  const password = (body.password || '').toString()
  const name = (body.name || '').toString().trim() || null

  if (!isValidEmail(email)) {
    res.statusCode = 400; res.setHeader('Content-Type','application/json')
    return res.end(JSON.stringify({ ok:false, error:'invalid_email' }))
  }
  if (!password || password.length < 8) {
    res.statusCode = 400; res.setHeader('Content-Type','application/json')
    return res.end(JSON.stringify({ ok:false, error:'weak_password' }))
  }

  try {
    const { rows: existing } = await pool.query('select id from users where lower(email) = lower($1) limit 1', [email])
    if (existing.length) { res.statusCode = 409; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ ok:false, error:'email_taken' })) }

    const password_hash = await hashPassword(password)
    const { rows } = await pool.query('insert into users (email, password_hash, name) values ($1,$2,$3) returning id, email, name', [email, password_hash, name])
    const user = rows[0]

    const token = signToken({ sub: user.id, email: user.email, name: user.name }, 60*60*24*7)
    setAuthCookie(res, token, req, 60*60*24*7)

    res.statusCode = 201
    res.setHeader('Content-Type','application/json')
    return res.end(JSON.stringify({ ok:true, user }))
  } catch (e) {
    res.statusCode = 500; res.setHeader('Content-Type','application/json')
    return res.end(JSON.stringify({ ok:false, error:'register_failed' }))
  }
}
