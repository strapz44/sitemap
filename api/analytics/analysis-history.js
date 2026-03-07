const { ensureSchema, getPool } = require('../_db')
const { setCors, handlePreflight } = require('../_cors')
const { requireAdmin, enforceSite } = require('../_auth')

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ error: 'Method Not Allowed' })) }
  if (!requireAdmin(req, res)) return

  if (!(process.env.POSTGRES_URL || process.env.DATABASE_URL)) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'db_not_configured' }))
  }

  await ensureSchema()
  const pool = getPool()

  try {
    const url = new URL(req.url, 'http://localhost')
    const siteName = url.searchParams.get('siteName') || null
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)

    if (!enforceSite(req, res, siteName)) return

    // Récupérer l'historique des analyses
    let rows = []
    try {
      const result = await pool.query(`
        SELECT id, site, status, progress, pages_added, error, started_at, completed_at, updated_at
        FROM analysis_jobs
        WHERE ($1::text is null or site = $1)
        ORDER BY updated_at DESC
        LIMIT $2
      `, [siteName, limit])
      rows = result.rows
    } catch (e) {
      // Table n'existe peut-être pas, retourner un tableau vide
      rows = []
    }

    // Transformer les résultats
    const items = rows.map(row => ({
      id: row.id,
      siteName: row.site,
      status: row.status,
      progress: row.progress || 0,
      pagesAdded: row.pages_added || 0,
      error: row.error,
      createdAt: row.started_at,
      completedAt: row.completed_at,
      updatedAt: row.updated_at
    }))

    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 200
    res.end(JSON.stringify({ ok: true, items, total: items.length }))
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: e.message }))
  }
}
