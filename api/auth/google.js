/**
 * Google OAuth 2.0 — Prerender V3
 *
 * Flow:
 *   1. GET /api/auth/google            → redirect to Google consent page
 *   2. GET /api/auth/google?code=...   → exchange code, create/find user, set cookies, redirect to app
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID      — from Google Cloud Console
 *   GOOGLE_CLIENT_SECRET  — from Google Cloud Console
 *   APP_URL               — e.g. https://prerender.vercel.app
 *
 * In Google Cloud Console → OAuth 2.0 credentials → Authorized redirect URIs:
 *   https://yourapp.vercel.app/api/auth/google
 */

const https = require('https')
const { getDb } = require('../_mongo')
const { signToken, setAuthCookie, generateRefreshToken, setRefreshCookie, REFRESH_TTL } = require('../_tokens')
const { setCors, handlePreflight } = require('../_cors')

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const APP_URL       = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')
const REDIRECT_URI  = `${APP_URL}/api/auth/google`

// ── Helper: simple HTTPS GET/POST ───────────────────────────────

function httpsPost(url, postData) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const body = typeof postData === 'string' ? postData : new URLSearchParams(postData).toString()
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          'Accept': 'application/json',
        },
      },
      (res) => {
        let data = ''
        res.on('data', (c) => { data += c })
        res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(data) } })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function httpsGet(url, accessToken) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
      },
      (res) => {
        let data = ''
        res.on('data', (c) => { data += c })
        res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(data) } })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

// ── Main handler ────────────────────────────────────────────────

module.exports = async (req, res) => {
  setCors(req, res)
  if (req.method === 'OPTIONS') return handlePreflight(req, res)

  const url = new URL(req.url, `https://${req.headers.host}`)
  const code  = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  // ── Step 1: no code → redirect to Google ──────────────────────
  if (!code) {
    if (!CLIENT_ID) {
      res.statusCode = 503
      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: false, error: 'google_oauth_not_configured' }))
    }

    const params = new URLSearchParams({
      client_id:     CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      response_type: 'code',
      scope:         'openid email profile',
      access_type:   'online',
      prompt:        'select_account',
    })

    res.statusCode = 302
    res.setHeader('Location', `https://accounts.google.com/o/oauth2/v2/auth?${params}`)
    return res.end()
  }

  // ── User denied ────────────────────────────────────────────────
  if (error) {
    res.statusCode = 302
    res.setHeader('Location', `${APP_URL}/login?error=google_denied`)
    return res.end()
  }

  // ── Step 2: exchange code for tokens ──────────────────────────
  try {
    const tokenData = await httpsPost('https://oauth2.googleapis.com/token', {
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    })

    if (!tokenData.access_token) {
      console.error('[google oauth] Token exchange failed:', tokenData)
      res.statusCode = 302
      res.setHeader('Location', `${APP_URL}/login?error=google_token_failed`)
      return res.end()
    }

    // ── Step 3: get user info from Google ─────────────────────
    const profile = await httpsGet(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      tokenData.access_token
    )

    if (!profile.email) {
      res.statusCode = 302
      res.setHeader('Location', `${APP_URL}/login?error=google_no_email`)
      return res.end()
    }

    // ── Step 4: find or create user in MongoDB ────────────────
    const db = await getDb()
    const users = db.collection('users')

    let user = await users.findOne({
      email: { $regex: new RegExp(`^${profile.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    })

    const now = new Date()

    if (!user) {
      // Create new user from Google profile
      const result = await users.insertOne({
        email:         profile.email.toLowerCase(),
        name:          profile.name || profile.email.split('@')[0],
        password_hash: null,          // Google users have no password
        googleId:      profile.id,
        avatar:        profile.picture || null,
        twoFactor:     { enabled: false, secret: null, backupCodes: [] },
        provider:      'google',
        lastLogin:     now,
        loginCount:    1,
        createdAt:     now,
        updatedAt:     now,
      })
      user = { _id: result.insertedId, email: profile.email.toLowerCase(), name: profile.name }
    } else {
      // Update existing user
      await users.updateOne(
        { _id: user._id },
        { $set: { googleId: profile.id, lastLogin: now, updatedAt: now }, $inc: { loginCount: 1 } }
      )
    }

    // ── Step 5: issue JWT + refresh token ─────────────────────
    const token = signToken({ sub: user._id.toString(), email: user.email, name: user.name })
    setAuthCookie(res, token, req)

    const refreshToken = generateRefreshToken()
    await db.collection('sessions').insertOne({
      userId:    user._id,
      refreshToken,
      provider:  'google',
      userAgent: (req.headers['user-agent'] || '').slice(0, 256),
      ip:        (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown',
      createdAt: now,
      expiresAt: new Date(now.getTime() + REFRESH_TTL * 1000),
    })
    setRefreshCookie(res, refreshToken, req)

    // ── Step 6: redirect to dashboard ─────────────────────────
    res.statusCode = 302
    res.setHeader('Location', `${APP_URL}/dashboard`)
    return res.end()

  } catch (err) {
    console.error('[google oauth] Error:', err.message || err)
    res.statusCode = 302
    res.setHeader('Location', `${APP_URL}/login?error=google_error`)
    return res.end()
  }
}
