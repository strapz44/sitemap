const { ensureSchema, getPool } = require('../_db')
const { setCors, handlePreflight } = require('../_cors')
const { requireAdmin, enforceSite } = require('../_auth')

function parseDate(v) {
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function toInt(v, def, min, max) {
  const n = parseInt(v, 10)
  if (isNaN(n)) return def
  return Math.min(max, Math.max(min, n))
}

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }
  if (req.method !== 'GET') { res.statusCode = 405; return res.end('Method Not Allowed') }
  if (!requireAdmin(req, res)) return

  if (!(process.env.POSTGRES_URL || process.env.DATABASE_URL)) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'db_not_configured' }))
  }

  await ensureSchema()
  const pool = getPool()

  const url = new URL(req.url, 'http://localhost')
  const fromStr = url.searchParams.get('from')
  const toStr = url.searchParams.get('to')
  const site = url.searchParams.get('site') || null
  if (!enforceSite(req, res, site)) return
  const limit = toInt(url.searchParams.get('limit') || '10', 10, 1, 100)
  const now = new Date()
  const to = parseDate(toStr) || now
  const from = parseDate(fromStr) || new Date(to.getTime() - 7*24*3600*1000)

  try {
    const { rows } = await pool.query(`
      select pathname, count(*) as hits
      from events
      where ts >= $1 and ts <= $2
        and ($3::text is null or site = $3)
        and pathname is not null and pathname <> ''
      group by pathname
      order by hits desc
      limit $4
    `, [from.toISOString(), to.toISOString(), site, limit])

    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({
      from: from.toISOString(),
      to: to.toISOString(),
      site,
      items: rows.map(r => ({ pathname: r.pathname, hits: Number(r.hits || 0) }))
    }))
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'top_pages_failed' }))
  }
}
