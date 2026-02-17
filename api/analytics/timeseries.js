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
      days as (
        select generate_series(date_trunc('day', $1::timestamptz), date_trunc('day', $2::timestamptz), interval '1 day') as day
      ),
      agg as (
        select date_trunc('day', ts) as day,
               count(*) filter (where type = 'pageview') as pageviews,
               count(distinct session_id) as sessions,
               count(distinct visitor_id) as visitors
        from filtered
        group by 1
      )
      select d.day as ts,
             coalesce(a.pageviews, 0) as pageviews,
             coalesce(a.sessions, 0) as sessions,
             coalesce(a.visitors, 0) as visitors
      from days d
      left join agg a on a.day = d.day
      order by d.day
    `, [from.toISOString(), to.toISOString(), site])

    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({
      from: from.toISOString(),
      to: to.toISOString(),
      site,
      items: rows.map(r => ({
        ts: new Date(r.ts).toISOString(),
        pageviews: Number(r.pageviews || 0),
        sessions: Number(r.sessions || 0),
        visitors: Number(r.visitors || 0),
      }))
    }))
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'timeseries_failed' }))
  }
}
