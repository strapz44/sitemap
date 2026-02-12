import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { parse as parseUrl } from 'url'

// https://vitejs.dev/config/
function localApiMock() {
  return {
    name: 'local-api-mock',
    configureServer(server) {
      const app = server.middlewares
      let mockSitemaps = [
        { siteName: 'https://quiveutfairemestravaux.com', urls: [] },
        { siteName: 'https://citrondigital.fr', urls: [] },
        { siteName: 'https://nike.com', urls: [] },
      ]

      function setCors(req, res) {
        const origin = req.headers.origin || '*'
        const allow = /^https?:\/\/(localhost|127\.0\.0\.1)(:\\d+)?$/i.test(origin) ? origin : '*'
        res.setHeader('Access-Control-Allow-Origin', allow)
        res.setHeader('Vary', 'Origin')
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        res.setHeader('Cache-Control', 'no-store')
      }

      function normalize(raw) {
        try {
          const s = (raw || '').trim()
          if (!s) return ''
          const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`
          const u = new URL(withProto)
          return `${u.protocol}//${u.host}`
        } catch {
          return ''
        }
      }

      app.use((req, res, next) => {
        const { pathname, query } = parseUrl(req.url || '', true)
        if (!pathname || !pathname.startsWith('/api/')) return next()
        setCors(req, res)
        if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }

        if (pathname === '/api/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ status: 'ok' }))
        }

        if (pathname === '/api/sitemaps' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify(mockSitemaps))
        }

        if (pathname === '/api/sitemaps' && req.method === 'POST') {
          const raw = (query && query.url) || ''
          const site = normalize(raw)
          if (!site) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'url invalide' })) }
          if (!mockSitemaps.find(s => s.siteName === site)) mockSitemaps.unshift({ siteName: site, urls: [] })
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ ok: true }))
        }

        if (pathname.startsWith('/api/sitemaps/') && pathname.endsWith('/summary') && req.method === 'GET') {
          const site = decodeURIComponent(pathname.split('/')[3] || 'example.com')
          const now = new Date()
          const daysAgo = (n) => new Date(now.getTime() - n*24*3600*1000).toISOString()
          const body = {
            site,
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
          }
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify(body))
        }

        if (pathname.startsWith('/api/sitemaps/') && pathname.endsWith('/html') && req.method === 'GET') {
          const site = decodeURIComponent(pathname.split('/')[3] || 'example.com')
          const raw = site.startsWith('http') ? site.replace(/\/$/, '') : `https://${site.replace(/\/$/, '')}`
          const limit = Math.max(1, Math.min(parseInt((query && query.limit) || '25', 10) || 25, 100))
          const pages = Array.from({ length: limit }, (_, i) => {
            const url = i === 0 ? `${raw}/` : `${raw}/page-${i}`
            return { url, status: 200, title: `Sample page ${i || 1}`, html: `<html><head><title>Sample ${i || 1}</title></head><body><h1>Sample ${i || 1}</h1></body></html>` }
          })
          const body = { site: raw, count: pages.length, concurrency: 4, saved: true, pages }
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify(body))
        }

        if (pathname.startsWith('/api/sitemaps/') && req.method === 'GET') {
          const site = decodeURIComponent(pathname.split('/')[3] || 'example.com')
          const base = /^https?:\/\//i.test(site) ? site.replace(/\/$/, '') : `https://${site.replace(/\/$/, '')}`
          const now = new Date()
          const iso = (d) => new Date(d).toISOString()
          const urls = [
            { loc: `${base}/`, lastmod: iso(now), priority: '1.0', changefreq: 'weekly' },
            { loc: `${base}/about`, lastmod: iso(now.getTime() - 7*24*3600*1000), priority: '0.7', changefreq: 'monthly' },
            { loc: `${base}/contact`, lastmod: iso(now.getTime() - 30*24*3600*1000), priority: '0.6', changefreq: 'monthly' },
          ]
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ siteName: base, urls }))
        }

        if (pathname.startsWith('/api/sitemap/') && req.method === 'GET') {
          const site = decodeURIComponent(pathname.split('/')[3] || 'example.com')
          const base = /^https?:\/\//i.test(site) ? site.replace(/\/$/, '') : `https://${site.replace(/\/$/, '')}`
          res.statusCode = 302
          res.setHeader('Location', `/api/sitemaps/${encodeURIComponent(base)}`)
          return res.end()
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), localApiMock()],
  server: {
    port: 5173,
    cors: true,
  },
})
