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
      app.post('/api/auth/login', (req, res) => {
        try {
          const email = (req.body && req.body.email) || 'dev@example.com'
          return res.json({ token: 'dev-mock-token', user: { email } })
        } catch (e) {
          return res.json({ token: 'dev-mock-token', user: { email: 'dev@example.com' } })
        }
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
