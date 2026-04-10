/**
 * Serverless handler factory — Prerender V3 API.
 *
 * Eliminates boilerplate from individual endpoints by providing:
 *   - CORS preflight handling
 *   - HTTP method validation
 *   - Request body parsing (1 MB limit)
 *   - Optional JWT authentication
 *   - Optional in-memory rate limiting
 *   - Global error boundary with structured logging
 *   - JSON response helper
 *
 * @example
 *   const { createHandler } = require('../_handler')
 *
 *   module.exports = createHandler({ methods: ['POST'] }, async ({ body, ip, json }) => {
 *     return json(200, { ok: true, data: body })
 *   })
 *
 * @example — with authentication
 *   module.exports = createHandler({ methods: ['GET'], auth: true }, async ({ auth, json }) => {
 *     return json(200, { ok: true, userId: auth.sub })
 *   })
 */

const { setCors, handlePreflight } = require('./_cors')

// ── JSON Response ───────────────────────────────────────────────

function json(res, statusCode, data) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  return res.end(JSON.stringify(data))
}

// ── Body Parser (1 MB limit) ────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 1_048_576) { data = ''; req.destroy() }
    })
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '').toLowerCase()
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) }
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        resolve(Object.fromEntries(new URLSearchParams(data)))
      } else {
        resolve({})
      }
    })
  })
}

// ── Client IP ───────────────────────────────────────────────────

function getClientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    (req.headers['x-real-ip'] || '').toString().trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}

// ── Handler Factory ─────────────────────────────────────────────

function createHandler(options, handler) {
  const methods = options.methods || ['GET', 'POST']
  const rlConfig = options.rateLimit || null
  const requireAuth = options.auth || false

  return async (req, res) => {
    // 1. CORS
    const allowed = setCors(req, res)
    if (req.method === 'OPTIONS') return handlePreflight(req, res)
    if (!allowed) return json(res, 403, { ok: false, error: 'origin_not_allowed' })

    // 2. Method validation
    if (!methods.includes(req.method)) {
      return json(res, 405, { ok: false, error: 'method_not_allowed' })
    }

    // 3. In-memory rate limiting (first line of defense)
    if (rlConfig) {
      const { rateLimit } = require('./_rateLimit')
      const rl = rateLimit(rlConfig, req)
      if (!rl.ok) {
        res.setHeader('Retry-After', String(rl.retryAfterSec))
        return json(res, 429, { ok: false, error: 'rate_limited', retryAfter: rl.retryAfterSec })
      }
    }

    // 4. Body parsing (POST / PUT / PATCH)
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method)
      ? await parseBody(req)
      : {}

    // 5. Build context
    const ctx = {
      body,
      ip: getClientIp(req),
      json: (code, data) => json(res, code, data),
      req,
      res,
    }

    // 6. JWT authentication (optional)
    if (requireAuth) {
      const { getTokenFromRequest, verifyToken } = require('./_tokens')
      const token = getTokenFromRequest(req)
      const payload = verifyToken(token)
      if (!payload || !payload.sub) {
        return json(res, 401, { ok: false, error: 'unauthenticated' })
      }
      ctx.auth = payload // { sub, email, name, iat, exp }
    }

    // 7. Execute handler with error boundary
    try {
      return await handler(ctx)
    } catch (err) {
      console.error(`[API ${req.method} ${req.url}]`, err.message || err)
      if (!res.writableEnded) {
        return json(res, 500, { ok: false, error: 'internal_error' })
      }
    }
  }
}

module.exports = { createHandler, json, parseBody, getClientIp }
