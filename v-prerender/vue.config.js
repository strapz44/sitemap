const webpack = require('webpack')

module.exports = {
  productionSourceMap: false,
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: 'true',
        __VUE_PROD_DEVTOOLS__: 'false',
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
      }),
    ],
  },
  devServer: {
    port: 5173,
    setupMiddlewares(middlewares, devServer) {
      if (!devServer) return middlewares
      const app = devServer.app
      // CORS for /api/* routes (allow localhost origins)
      app.use((req, res, next) => {
        try {
          const origin = req.headers.origin || '*'
          if (req.path && req.path.startsWith('/api/')) {
            const allowList = [
              /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i,
              /^https?:\/\/v-prerender\.vercel\.app$/i,
            ]
            const allow = allowList.some(re => re.test(origin)) ? origin : '*'
            res.setHeader('Access-Control-Allow-Origin', allow)
            res.setHeader('Access-Control-Allow-Credentials', 'true')
            res.setHeader('Vary', 'Origin')
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            res.setHeader('Access-Control-Allow-Private-Network', 'true')
            res.setHeader('Access-Control-Max-Age', '600')
            if (req.method === 'OPTIONS') return res.status(204).end()
          }
        } catch (e) { /* no-op */ }
        next()
      })
      // Health mock
      app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }) })
      // Auth mock (DEV only)
      const express = require('express')
      app.use(express.json())
      app.post('/api/auth/login', (req, res) => {
        try {
          const email = (req.body && req.body.email) || 'dev@example.com'
          res.cookie('auth_token', 'mock-jwt-token', { httpOnly: false, path: '/' })
          res.cookie('refresh_token', 'mock-refresh-token', { httpOnly: true, path: '/api/auth' })
          return res.json({ ok: true, user: { id: '1', email, name: 'Dev User', twoFactor: { enabled: false } } })
        } catch (e) {
          return res.json({ ok: true, user: { id: '1', email: 'dev@example.com', name: 'Dev User', twoFactor: { enabled: false } } })
        }
      })
      app.post('/api/auth/register', (req, res) => {
        const email = (req.body && req.body.email) || 'dev@example.com'
        const name = (req.body && req.body.name) || 'Dev User'
        res.cookie('auth_token', 'mock-jwt-token', { httpOnly: false, path: '/' })
        res.cookie('refresh_token', 'mock-refresh-token', { httpOnly: true, path: '/api/auth' })
        return res.json({ ok: true, user: { id: '1', email, name, twoFactor: { enabled: false } } })
      })
      app.get('/api/auth/me', (req, res) => {
        const cookies = (req.headers.cookie || '')
        if (!cookies.includes('auth_token=')) {
          return res.status(401).json({ ok: false, error: 'unauthenticated' })
        }
        return res.json({ ok: true, user: { id: '1', email: 'dev@example.com', name: 'Dev User', twoFactor: { enabled: false } } })
      })
      app.post('/api/auth/logout', (_req, res) => {
        res.clearCookie('auth_token', { path: '/' })
        res.clearCookie('refresh_token', { path: '/api/auth' })
        return res.json({ ok: true })
      })
      app.post('/api/auth/forgot-password', (req, res) => {
        const email = (req.body && req.body.email) || ''
        console.info(`[DEV mock] Password reset email would be sent to: ${email}`)
        console.info(`[DEV mock] Reset link: http://localhost:5173/reset-password?token=dev-mock-token-123`)
        return res.json({ ok: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' })
      })
      app.post('/api/auth/reset-password', (req, res) => {
        const token = (req.body && req.body.token) || ''
        if (!token) return res.status(400).json({ ok: false, error: 'missing_token' })
        return res.json({ ok: true, message: 'Mot de passe mis à jour avec succès. Veuillez vous reconnecter.' })
      })

      // Google OAuth mock (dev only — auto-login without real Google)
      app.get('/api/auth/google', (req, res) => {
        const code = req.query.code
        if (!code) {
          // Simulate redirect to Google → immediately return with mock code
          return res.redirect('/api/auth/google?code=dev-mock-code')
        }
        // Simulate callback — set cookies and redirect to dashboard
        res.cookie('auth_token', 'mock-jwt-token-google', { httpOnly: false, path: '/' })
        res.cookie('refresh_token', 'mock-refresh-token-google', { httpOnly: true, path: '/api/auth' })
        return res.redirect('/dashboard')
      })
      app.post('/api/auth/2fa', (req, res) => {
        const action = req.body && req.body.action
        if (action === 'setup') return res.json({ ok: true, otpauthUri: 'otpauth://totp/Prerender:dev@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Prerender' })
        if (action === 'enable') return res.json({ ok: true, backupCodes: ['a1b2c3d4','e5f6a7b8','c9d0e1f2','a3b4c5d6','e7f8a9b0','c1d2e3f4','a5b6c7d8','e9f0a1b2'] })
        if (action === 'disable') return res.json({ ok: true })
        return res.status(400).json({ error: 'invalid_action' })
      })
      app.post('/api/auth/refresh', (_req, res) => {
        res.cookie('auth_token', 'mock-jwt-token-refreshed', { httpOnly: false, path: '/' })
        res.cookie('refresh_token', 'mock-refresh-token-refreshed', { httpOnly: true, path: '/api/auth' })
        return res.json({ ok: true })
      })

      // Collect endpoint (analytics tracking)
      app.post('/api/collect', (_req, res) => {
        return res.json({ ok: true })
      })

      let mockSitemaps = [
        { siteName: 'https://quiveutfairemestravaux.com', urls: [] },
        { siteName: 'https://citrondigital.fr', urls: [] },
        { siteName: 'https://nike.com', urls: [] },
      ]

      app.get('/api/sitemaps', (_req, res) => {
        res.json(mockSitemaps)
      })

      app.post('/api/sitemaps', (req, res) => {
        const raw = (req.body && req.body.url) || (req.query && req.query.url) || ''
        if (!raw) return res.status(400).json({ error: 'url manquante' })
        const normalize = (u) => {
          try {
            const withProto = /^https?:\/\//i.test(u) ? u : `https://${u}`
            const url = new URL(withProto)
            return `${url.protocol}//${url.host}`
          } catch (e) { return '' }
        }
        const site = normalize(raw)
        if (!site) return res.status(400).json({ error: 'url invalide' })
        const exists = mockSitemaps.find(s => s.siteName === site)
        if (!exists) mockSitemaps.unshift({ siteName: site, urls: [] })
        res.json({ ok: true })
      })

      app.delete('/api/sitemaps/:site', (req, res) => {
        const site = decodeURIComponent(req.params.site)
        mockSitemaps = mockSitemaps.filter(s => s.siteName !== site)
        res.json({ ok: true })
      })

      app.post('/api/sitemaps/:site/refresh', (_req, res) => {
        res.json({ ok: true })
      })

      app.get('/api/sitemaps/:site/summary', (req, res) => {
        const now = new Date()
        const daysAgo = (n) => new Date(now.getTime() - n*24*3600*1000).toISOString()
        res.json({
          site: decodeURIComponent(req.params.site),
          lastmodLatest: daysAgo(5),
          lastCrawl: daysAgo(2),
          changefreqCounts: { daily: 3, weekly: 7, monthly: 1 },
          errors: 1,
          warnings: 4,
          httpStatus: 200,
          size: '3.2 KB',
          score: 92,
          urlsSubmitted: 42,
          urlsIndexed: 36,
        })
      })

      app.get('/api/sitemaps/:site', (req, res) => {
        const raw = decodeURIComponent(req.params.site)
        const base = /^https?:\/\//i.test(raw) ? raw.replace(/\/$/, '') : `https://${raw.replace(/\/$/, '')}`
        const now = new Date()
        const iso = (d) => new Date(d).toISOString()
        const urls = [
          { loc: `${base}/`, lastmod: iso(now), priority: '1.0', changefreq: 'weekly' },
          { loc: `${base}/about`, lastmod: iso(now.getTime() - 7*24*3600*1000), priority: '0.7', changefreq: 'monthly' },
          { loc: `${base}/contact`, lastmod: iso(now.getTime() - 30*24*3600*1000), priority: '0.6', changefreq: 'monthly' },
        ]
        res.json({ siteName: base, urls })
      })

      app.get('/api/sitemap/:site', (req, res) => {
        const raw = decodeURIComponent(req.params.site)
        const base = /^https?:\/\//i.test(raw) ? raw.replace(/\/$/, '') : `https://${raw.replace(/\/$/, '')}`
        res.redirect(302, `/api/sitemaps/${encodeURIComponent(base)}`)
      })

      // Globe geolocation endpoint (real DNS + ip-api.com)
      app.get('/api/globe', async (_req, res) => {
        const dns = require('dns').promises
        const http = require('http')

        function fetchJson(url) {
          return new Promise((resolve, reject) => {
            http.get(url, (r) => {
              let d = ''
              r.on('data', c => d += c)
              r.on('end', () => { try { resolve(JSON.parse(d)) } catch (e) { reject(e) } })
            }).on('error', reject)
          })
        }

        async function geolocate(domain) {
          try {
            const addrs = await dns.resolve4(domain)
            const ip = addrs[0]
            if (!ip) return null
            const data = await fetchJson(`http://ip-api.com/json/${ip}?fields=status,lat,lon,country,city,regionName`)
            if (data.status !== 'success') return null
            return { lat: data.lat, lng: data.lon, country: data.country, city: data.city }
          } catch { return null }
        }

        try {
          const results = await Promise.all(mockSitemaps.map(async (item) => {
            let domain
            try { domain = new URL(item.siteName).hostname } catch { domain = item.siteName }
            const geo = await geolocate(domain)
            return {
              site: item.siteName,
              domain,
              lat: geo?.lat || null,
              lng: geo?.lng || null,
              country: geo?.country || null,
              city: geo?.city || null,
              urlCount: (item.urls || []).length
            }
          }))
          const located = results.filter(r => r.lat != null)
          res.json({ total: results.length, located: located.length, sites: results })
        } catch (e) {
          res.json({ total: 0, located: 0, sites: [] })
        }
      })

      // ── Analytics mock endpoints ──────────────────────────
      function generateTimeseries(days = 7) {
        const items = []
        const now = Date.now()
        for (let d = days - 1; d >= 0; d--) {
          const ts = new Date(now - d * 24 * 3600 * 1000).toISOString()
          items.push({
            ts,
            pageviews: Math.floor(120 + Math.random() * 280 + Math.sin(d * 0.8) * 60),
            sessions: Math.floor(60 + Math.random() * 140 + Math.sin(d * 0.8) * 30),
          })
        }
        return items
      }

      app.get('/api/analytics/summary', (req, res) => {
        const pv = Math.floor(800 + Math.random() * 1200)
        const ss = Math.floor(pv * 0.45)
        res.json({
          pageviews: pv,
          sessions: ss,
          visitors: Math.floor(ss * 0.72),
          bounces: Math.floor(ss * 0.38),
          bounce_rate: 0.38 + Math.random() * 0.12,
        })
      })

      app.get('/api/analytics/timeseries', (req, res) => {
        const from = req.query.from
        const to = req.query.to
        let days = 7
        if (from && to) {
          days = Math.max(1, Math.round((new Date(to) - new Date(from)) / (24*3600*1000)))
        }
        res.json({ items: generateTimeseries(days) })
      })

      app.get('/api/analytics/top-pages', (req, res) => {
        const pages = [
          { pathname: '/', hits: 342 },
          { pathname: '/about', hits: 189 },
          { pathname: '/services', hits: 156 },
          { pathname: '/contact', hits: 98 },
          { pathname: '/blog', hits: 87 },
          { pathname: '/pricing', hits: 76 },
          { pathname: '/faq', hits: 54 },
          { pathname: '/portfolio', hits: 43 },
          { pathname: '/team', hits: 31 },
          { pathname: '/careers', hits: 22 },
        ]
        const limit = parseInt(req.query.limit || '10', 10)
        res.json({ items: pages.slice(0, limit) })
      })

      app.get('/api/analytics/top', (req, res) => {
        const by = req.query.by || 'utm_source'
        const sets = {
          utm_source: [
            { name: 'Google', hits: 423 }, { name: 'Direct', hits: 312 },
            { name: 'Twitter', hits: 145 }, { name: 'LinkedIn', hits: 98 },
            { name: 'GitHub', hits: 76 }, { name: 'Newsletter', hits: 54 },
          ],
          referrer_domain: [
            { name: 'google.com', hits: 389 }, { name: 'twitter.com', hits: 134 },
            { name: 'linkedin.com', hits: 87 }, { name: 'github.com', hits: 72 },
            { name: 'reddit.com', hits: 45 }, { name: 'dev.to', hits: 31 },
          ],
          device: [
            { name: 'Desktop', hits: 624 }, { name: 'Mobile', hits: 298 },
            { name: 'Tablet', hits: 56 },
          ],
          browser: [
            { name: 'Chrome', hits: 512 }, { name: 'Safari', hits: 198 },
            { name: 'Firefox', hits: 134 }, { name: 'Edge', hits: 87 },
            { name: 'Opera', hits: 23 },
          ],
          os: [
            { name: 'Windows', hits: 412 }, { name: 'macOS', hits: 234 },
            { name: 'iOS', hits: 156 }, { name: 'Android', hits: 123 },
            { name: 'Linux', hits: 53 },
          ],
        }
        const items = sets[by] || sets.utm_source
        const limit = parseInt(req.query.limit || '10', 10)
        res.json({ items: items.slice(0, limit) })
      })

      app.get('/api/analytics/compare', (req, res) => {
        res.json({ current: { pageviews: 1240, sessions: 580 }, previous: { pageviews: 1100, sessions: 510 }, change: { pageviews: 12.7, sessions: 13.7 } })
      })

      app.post('/api/analytics/analyze', (req, res) => {
        res.json({ jobId: 'mock-' + Date.now(), status: 'completed', pagesAdded: Math.floor(5 + Math.random() * 15) })
      })

      app.get('/api/analytics/analysis-history', (req, res) => {
        const items = [
          { id: '1', siteName: req.query.siteName || 'unknown', status: 'completed', pagesAdded: 12, createdAt: new Date(Date.now() - 3600*1000).toISOString() },
          { id: '2', siteName: req.query.siteName || 'unknown', status: 'completed', pagesAdded: 8, createdAt: new Date(Date.now() - 24*3600*1000).toISOString() },
        ]
        res.json({ items })
      })

      app.get('/api/analytics/analysis-status', (req, res) => {
        res.json({ jobId: req.query.jobId, status: 'completed' })
      })

      app.get('/api/sitemaps/:site/html', (req, res) => {
        const raw = decodeURIComponent(req.params.site)
        const base = /^https?:\/\//i.test(raw) ? raw.replace(/\/$/, '') : `https://${raw.replace(/\/$/, '')}`
        const limit = Math.max(1, Math.min(parseInt(req.query.limit || '25', 10) || 25, 100))
        const pages = Array.from({ length: limit }, (_, i) => {
          const url = i === 0 ? `${base}/` : `${base}/page-${i}`
          return { url, status: 200, title: `Sample page ${i || 1}`, html: `<html><head><title>Sample ${i || 1}</title></head><body><h1>Sample ${i || 1}</h1></body></html>` }
        })
        res.json({ site: base, count: pages.length, concurrency: 4, saved: true, pages })
      })
      return middlewares
    },
    proxy: {},
  },
}
