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
        const exists = mockSitemaps.find(s => s.siteName === raw)
        if (!exists) mockSitemaps.unshift({ siteName: raw, urls: [] })
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
        })
      })
      return middlewares
    },
    proxy: {},
  },
}
