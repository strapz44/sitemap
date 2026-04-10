const { createHandler } = require('./_handler')

/** GET /api/health — Liveness probe. */
module.exports = createHandler({ methods: ['GET'] }, async ({ json }) => {
  return json(200, { status: 'ok', timestamp: Date.now() })
})
