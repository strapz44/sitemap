/**
 * Module CORS partagé pour les API Vercel serverless functions.
 */

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean)

const ALLOW_ALL = process.env.CORS_ALLOW_ALL === 'true'

function getOrigin(req) {
  return (req.headers.origin || '').toLowerCase()
}

function isAllowed(origin) {
  if (ALLOW_ALL) return true
  if (!origin) return true // same-origin requests
  if (ALLOWED_ORIGINS.length === 0) return true // no restriction configured
  return ALLOWED_ORIGINS.some(o => origin === o || origin.endsWith(`.${o.replace(/^https?:\/\//, '')}`))
}

/**
 * Set CORS headers. Returns true if origin is allowed.
 */
function setCors(req, res) {
  const origin = getOrigin(req)
  if (!isAllowed(origin)) return false

  const respOrigin = origin || '*'
  res.setHeader('Access-Control-Allow-Origin', respOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Site')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Max-Age', '86400')
  return true
}

/**
 * Handle OPTIONS preflight and end the response.
 */
function handlePreflight(req, res) {
  res.statusCode = 204
  res.end()
}

module.exports = { setCors, handlePreflight }
