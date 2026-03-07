const { ensureSchema, getPool } = require('../_db')
const { setCors, handlePreflight } = require('../_cors')
const { requireAdmin } = require('../_auth')

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
    const jobId = url.searchParams.get('jobId')

    if (!jobId) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: false, error: 'jobId is required' }))
    }

    // Récupérer le statut du job
    let job = null
    try {
      const result = await pool.query(`
        SELECT id, site, status, progress, pages_added, error, started_at, completed_at, updated_at
        FROM analysis_jobs
        WHERE id = $1
      `, [jobId])
      if (result.rows.length > 0) {
        job = result.rows[0]
      }
    } catch (e) {
      // Table n'existe pas
    }

    if (!job) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: false, error: 'Job not found' }))
    }

    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 200
    res.end(JSON.stringify({
      ok: true,
      id: job.id,
      siteName: job.site,
      status: job.status,
      progress: job.progress || 0,
      pagesAdded: job.pages_added || 0,
      error: job.error,
      createdAt: job.started_at,
      completedAt: job.completed_at,
      updatedAt: job.updated_at
    }))
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: e.message }))
  }
}
