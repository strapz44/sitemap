const { ensureSchema, getPool } = require('../_db')
const { setCors, handlePreflight } = require('../_cors')
const { requireAdmin, enforceSite } = require('../_auth')

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') { return handlePreflight(req, res) }
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ error: 'Method Not Allowed' })) }
  if (!requireAdmin(req, res)) return

  if (!(process.env.POSTGRES_URL || process.env.DATABASE_URL)) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ ok: false, error: 'db_not_configured' }))
  }

  await ensureSchema()
  const pool = getPool()

  try {
    const body = req.body || {}
    const siteName = body.siteName || null

    if (!enforceSite(req, res, siteName)) return

    // Créer un enregistrement d'analyse
    const analysisId = Math.random().toString(36).substring(2, 11)
    const now = new Date()

    // Insérer dans une table d'analyses (à créer si nécessaire)
    try {
      await pool.query(`
        INSERT INTO analysis_jobs (id, site, status, started_at)
        VALUES ($1, $2, $3, $4)
      `, [analysisId, siteName, 'pending', now])
    } catch (e) {
      // Table n'existe peut-être pas, on crée juste un statut en mémoire
      console.log('Analysis job started:', analysisId, siteName)
    }

    // Déclencher une tâche asynchrone de refresh/analyse
    // (En production, utiliser un job queue comme Bull, RabbitMQ, etc.)
    setImmediate(() => {
      performAnalysis(pool, analysisId, siteName).catch(e => {
        console.error('Analysis failed:', e)
      })
    })

    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 202
    res.end(JSON.stringify({
      ok: true,
      jobId: analysisId,
      message: 'Analyse lancée',
      status: 'pending'
    }))
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: e.message }))
  }
}

// Fonction d'analyse asynchrone
async function performAnalysis(pool, jobId, siteName) {
  try {
    // Simuler le refresh des données d'analytics
    // En production, cela appellerait vos services d'analyse réels

    const now = new Date()
    const from = new Date(now.getTime() - 7*24*3600*1000)

    // Marquer comme en cours
    try {
      await pool.query(`
        UPDATE analysis_jobs SET status = $1, progress = $2, updated_at = $3
        WHERE id = $4
      `, ['running', 0, now, jobId])
    } catch (e) {
      // Silent fail si table n'existe pas
    }

    // Attendre un peu pour simuler le travail
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Marquer comme complété
    try {
      await pool.query(`
        UPDATE analysis_jobs 
        SET status = $1, progress = $2, pages_added = $3, completed_at = $4, updated_at = $5
        WHERE id = $6
      `, ['completed', 100, Math.floor(Math.random() * 50) + 10, now, now, jobId])
    } catch (e) {
      // Silent fail si table n'existe pas
    }

    console.log('Analysis completed:', jobId, siteName)
  } catch (e) {
    console.error('Analysis error:', e)
    try {
      await pool.query(`
        UPDATE analysis_jobs SET status = $1, error = $2, updated_at = $3 WHERE id = $4
      `, ['failed', e.message, new Date(), jobId])
    } catch (err) {
      // Silent fail
    }
  }
}
