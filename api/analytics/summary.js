const { ensureSchema, getPool } = require('../_db')
const { setCors, handlePreflight } = require('../_cors')
const { requireAdmin, enforceSite } = require('../_auth')

function parseDate(v) {
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
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
  const now = new Date()
  const to = parseDate(toStr) || now
  const from = parseDate(fromStr) || new Date(to.getTime() - 7*24*3600*1000)

  try {
    const { rows } = await pool.query(`
      with filtered as (
        select * from events
        where ts >= $1 and ts <= $2
          and ($3::text is null or site = $3)
      ),
      session_counts as (
        select session_id, count(*) as c
        from filtered
        where session_id is not null
        group by session_id
      )
      select
        (select count(*) from filtered where type = 'pageview') as pageviews,
        (select count(distinct session_id) from filtered where session_id is not null) as sessions,
        (select count(distinct visitor_id) from filtered where visitor_id is not null) as visitors,
        (select count(*) from session_counts where c = 1) as bounces
    `, [from.toISOString(), to.toISOString(), site])

    const r = rows[0] || { pageviews: 0, sessions: 0, visitors: 0, bounces: 0 }
    const bounce_rate = r.sessions > 0 ? r.bounces / r.sessions : 0

    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({
      from: from.toISOString(),
      to: to.toISOString(),
      site,
      pageviews: Number(r.pageviews || 0),
      sessions: Number(r.sessions || 0),
      visitors: Number(r.visitors || 0),
      bounces: Number(r.bounces || 0),
      bounce_rate
    }))
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'summary_failed' }))
  }
}
