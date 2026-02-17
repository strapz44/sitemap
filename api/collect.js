const { ensureSchema, getPool } = require('./_db')
const crypto = require('crypto')
const { setCors, handlePreflight } = require('./_cors')
const { rateLimit } = require('./_rateLimit')

function parseJSONSafe(str) {
  try { return JSON.parse(str) } catch { return null }
}

async function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '').toLowerCase()
      if (ct.includes('application/json')) {
        resolve(parseJSONSafe(data) || {})
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(data)
        const obj = {}
        for (const [k, v] of params.entries()) obj[k] = v
        resolve(obj)
      } else {
        resolve(parseJSONSafe(data) || {})
      }
    })
  })
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }

  const rl = rateLimit({ keyPrefix: 'collect', limit: Number(process.env.RATE_LIMIT_MAX || 60), windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000) }, req)
  if (!rl.ok) {
    res.statusCode = 429
    res.setHeader('Retry-After', String(rl.retryAfterSec))
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'rate_limited', retry_after: rl.retryAfterSec }))
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.statusCode = 405
    return res.end('Method Not Allowed')
  }

  if (!(process.env.POSTGRES_URL || process.env.DATABASE_URL)) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'db_not_configured' }))
  }

  await ensureSchema()
  const pool = getPool()

  const ipHeader = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString()
  const ip = ipHeader.split(',')[0].trim()
  const ua = (req.headers['user-agent'] || '').toString()
  const site = (req.headers['x-site'] || '').toString() || null

  let payload = {}
  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost')
    payload = Object.fromEntries(url.searchParams.entries())
  } else {
    payload = await readBody(req)
  }

  const type = (payload.type || 'pageview').toString()
  const urlStr = (payload.url || '').toString() || null
  let pathname = (payload.pathname || '').toString()
  if (!pathname && urlStr) {
    try { pathname = new URL(urlStr).pathname } catch { pathname = '' }
  }
  pathname = pathname ? pathname.toString() : null
  const title = (payload.title || '').toString() || null
  const referrer = (payload.referrer || '').toString() || null
  const lang = (payload.lang || '').toString() || null
  const screen = (payload.screen || '').toString() || null
  const device = (payload.device || '').toString() || null
  const browser = (payload.browser || '').toString() || null
  const os = (payload.os || '').toString() || null
  const utm_source = (payload.utm_source || '').toString() || null
  const utm_medium = (payload.utm_medium || '').toString() || null
  const utm_campaign = (payload.utm_campaign || '').toString() || null
  const event_name = (payload.event_name || '').toString() || null
  const event_params = payload.event_params && typeof payload.event_params === 'object' ? payload.event_params : null

  const session_id = (payload.session_id || '').toString() || null
  let visitor_id = (payload.visitor_id || '').toString() || null
  if (!visitor_id) {
    const salt = (process.env.ANON_SALT || '').toString()
    if (salt && (ip || ua)) visitor_id = sha256(`${salt}|${ip}|${ua}`)
  }

  try {
    const { rows } = await pool.query(
      `insert into events (
        site, session_id, visitor_id, type, url, pathname, title, referrer, lang, screen, device, browser, os,
        utm_source, utm_medium, utm_campaign, event_name, event_params
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
      ) returning id, ts`,
      [
        site, session_id, visitor_id, type, urlStr, pathname, title, referrer, lang, screen, device, browser, os,
        utm_source, utm_medium, utm_campaign, event_name, event_params
      ]
    )

    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: true, id: rows[0]?.id || null }))
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'collect_failed' }))
  }
}
