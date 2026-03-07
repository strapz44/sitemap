const { ensureSchema, getPool } = require('../_db')
const { setCors, handlePreflight } = require('../_cors')
const { requireAdmin, enforceSite } = require('../_auth')
const { formatResponse, formatError, validateDateRange, calculateTrend } = require('./_helpers')

function parseDate(v) {
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(formatError('NOT_ALLOWED', 'Method Not Allowed'))) }
  if (!requireAdmin(req, res)) return

  if (!(process.env.POSTGRES_URL || process.env.DATABASE_URL)) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify(formatError('DB_NOT_CONFIGURED', 'Database not configured')))
  }

  await ensureSchema()
  const pool = getPool()

  try {
    const url = new URL(req.url, 'http://localhost')
    const fromStr = url.searchParams.get('from')
    const toStr = url.searchParams.get('to')
    const site = url.searchParams.get('site') || null

    if (!enforceSite(req, res, site)) return

    const validation = validateDateRange(fromStr, toStr)
    if (!validation.isValid) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify(formatError('INVALID_DATES', validation.error)))
    }

    const { fromDate, toDate } = validation
    
    // Calculer la période précédente pour comparaison
    const daysDiff = (toDate - fromDate) / (1000 * 60 * 60 * 24)
    const previousFromDate = new Date(fromDate.getTime() - (toDate - fromDate))
    const previousToDate = fromDate

    // Récupérer les stats pour la période courante ET précédente
    const [current, previous] = await Promise.all([
      pool.query(`
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
        ),
        bounce_sessions as (
          select count(*) as c from session_counts where c = 1
        )
        select
          (select count(*) from filtered where type = 'pageview') as pageviews,
          (select count(distinct session_id) from filtered where session_id is not null) as sessions,
          (select count(distinct visitor_id) from filtered where visitor_id is not null) as visitors,
          (select c from bounce_sessions) as bounces,
          coalesce((select c from bounce_sessions)::numeric / nullif((select count(distinct session_id) from filtered where session_id is not null), 0), 0) as bounce_rate
      `, [fromDate, toDate, site]),
      pool.query(`
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
        ),
        bounce_sessions as (
          select count(*) as c from session_counts where c = 1
        )
        select
          (select count(*) from filtered where type = 'pageview') as pageviews,
          (select count(distinct session_id) from filtered where session_id is not null) as sessions,
          (select count(distinct visitor_id) from filtered where visitor_id is not null) as visitors,
          (select c from bounce_sessions) as bounces,
          coalesce((select c from bounce_sessions)::numeric / nullif((select count(distinct session_id) from filtered where session_id is not null), 0), 0) as bounce_rate
      `, [previousFromDate, previousToDate, site])
    ])

    const currentStats = current.rows[0] || {}
    const previousStats = previous.rows[0] || {}

    // Calculer les tendances
    const trends = {
      pageviews: calculateTrend(currentStats.pageviews || 0, previousStats.pageviews || 0),
      sessions: calculateTrend(currentStats.sessions || 0, previousStats.sessions || 0),
      visitors: calculateTrend(currentStats.visitors || 0, previousStats.visitors || 0),
      bounce_rate: calculateTrend(currentStats.bounce_rate || 0, previousStats.bounce_rate || 0)
    }

    const summary = {
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        days: Math.ceil(daysDiff)
      },
      current: {
        pageviews: parseInt(currentStats.pageviews || 0),
        sessions: parseInt(currentStats.sessions || 0),
        visitors: parseInt(currentStats.visitors || 0),
        bounces: parseInt(currentStats.bounces || 0),
        bounce_rate: parseFloat(currentStats.bounce_rate || 0)
      },
      previous: {
        pageviews: parseInt(previousStats.pageviews || 0),
        sessions: parseInt(previousStats.sessions || 0),
        visitors: parseInt(previousStats.visitors || 0),
        bounces: parseInt(previousStats.bounces || 0),
        bounce_rate: parseFloat(previousStats.bounce_rate || 0)
      },
      trends: trends,
      growth: {
        pageviews_percent: trends.pageviews.value,
        sessions_percent: trends.sessions.value,
        visitors_percent: trends.visitors.value,
        bounce_rate_change: trends.bounce_rate.value
      }
    }

    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 200
    res.end(JSON.stringify(formatResponse(summary)))
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(formatError('SERVER_ERROR', e.message)))
  }
}
