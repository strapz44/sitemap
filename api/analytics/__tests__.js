/**
 * Test Suite pour Analytics APIs
 * Démonstration complète du système
 * 
 * Usage: 
 * - Node.js: node api/analytics/__tests__.js
 * - Browser console: Disponible via le dashboard
 */

const axios = require('axios')

// Configuration
const API_BASE = process.env.API_URL || 'http://localhost:3000/api'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'test-token'

// Utilitaires
const log = {
  success: (msg) => console.log('[OK]', msg),
  error: (msg) => console.error('[ERROR]', msg),
  info: (msg) => console.log('[INFO]', msg),
  section: (title) => console.log('\n' + title + '\n' + '='.repeat(50))
}

// Tests
async function runTests() {
  const client = axios.create({
    baseURL: API_BASE,
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    }
  })

  try {
    log.section('ANALYTICS REALTIME SYNC TESTS')

    // Test 1: Summary
    log.info('Test 1: GET /api/analytics/summary')
    const from = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    const to = new Date().toISOString()

    const summary = await client.get('/analytics/summary', {
      params: { from, to }
    })
    log.success('Summary loaded')
    console.log('  Pageviews:', summary.data.pageviews)
    console.log('  Sessions:', summary.data.sessions)
    console.log('  Visitors:', summary.data.visitors)
    console.log('  Bounce rate:', (summary.data.bounce_rate * 100).toFixed(1) + '%')

    // Test 2: Timeseries
    log.info('Test 2: GET /api/analytics/timeseries')
    const timeseries = await client.get('/analytics/timeseries', {
      params: { from, to }
    })
    log.success('Timeseries loaded: ' + timeseries.data.items?.length + ' days')
    if (timeseries.data.items?.length > 0) {
      console.log('  First day:', timeseries.data.items[0])
    }

    // Test 3: Top Pages
    log.info('Test 3: GET /api/analytics/top-pages')
    const topPages = await client.get('/analytics/top-pages', {
      params: { from, to, limit: 5 }
    })
    log.success('Top pages loaded: ' + topPages.data.items?.length)
    topPages.data.items?.slice(0, 3).forEach((page, i) => {
      console.log(`  ${i + 1}. ${page.pathname} (${page.hits} hits)`)
    })

    // Test 4: Top Sources
    log.info('Test 4: GET /api/analytics/top?by=utm_source')
    const sources = await client.get('/analytics/top', {
      params: { by: 'utm_source', from, to, limit: 5 }
    })
    log.success('Top sources loaded: ' + sources.data.items?.length)
    sources.data.items?.slice(0, 3).forEach((src, i) => {
      console.log(`  ${i + 1}. ${src.name} (${src.hits} hits)`)
    })

    // Test 5: Comparisons
    log.info('Test 5: GET /api/analytics/compare')
    const compare = await client.get('/analytics/compare', {
      params: { from, to }
    })
    log.success('Comparison loaded')
    console.log('  Current pageviews:', compare.data.items?.current?.pageviews)
    console.log('  Previous pageviews:', compare.data.items?.previous?.pageviews)
    console.log('  Growth:', compare.data.items?.growth?.pageviews_percent + '%')

    // Test 6: Analyze
    log.info('Test 6: POST /api/analytics/analyze')
    const analyze = await client.post('/analytics/analyze', {
      siteName: 'example.com'
    })
    log.success('Analysis started: ' + analyze.data.jobId)
    const jobId = analyze.data.jobId

    // Test 7: Analysis Status
    log.info('Test 7: GET /api/analytics/analysis-status')
    await new Promise(r => setTimeout(r, 1000))
    const status = await client.get('/analytics/analysis-status', {
      params: { jobId }
    })
    log.success('Status: ' + status.data.status)
    console.log('  Progress:', status.data.progress + '%')

    // Test 8: Analysis History
    log.info('Test 8: GET /api/analytics/analysis-history')
    const history = await client.get('/analytics/analysis-history', {
      params: { siteName: 'example.com', limit: 5 }
    })
    log.success('History loaded: ' + history.data.items?.length + ' jobs')
    if (history.data.items?.length > 0) {
      console.log('  Latest:', history.data.items[0])
    }

    log.section('ALL TESTS PASSED')
  } catch (e) {
    log.error('Test failed: ' + e.message)
    if (e.response?.data) {
      console.error('Response:', e.response.data)
    }
    process.exit(1)
  }
}

// Frontend Test Suite (pour exécuter dans le navigateur)
const FrontendTests = {
  /**
   * Teste les appels API depuis le navigateur
   */
  async runDashboardTests() {
    const AnalyticsService = (await import('./AnalyticsService.js')).default
    const log = console
    
    try {
      log.group('Dashboard Real-time Tests')
      
      // Test 1: Load summary
      const from = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      const to = new Date().toISOString()
      
      const summary = await AnalyticsService.summary(from, to)
      log.log('[OK] Summary:', summary)
      
      // Test 2: Load timeseries
      const ts = await AnalyticsService.timeseries(from, to)
      log.log('[OK] Timeseries:', ts)
      
      // Test 3: Top pages
      const pages = await AnalyticsService.topPages(from, to, 10)
      log.log('[OK] Top Pages:', pages)
      
      // Test 4: Trigger analysis
      const job = await AnalyticsService.analyze('example.com')
      log.log('[OK] Analysis started:', job)
      
      log.groupEnd()
      console.log('All frontend tests passed!')
    } catch (e) {
      console.error('[ERROR] Frontend test failed:', e)
    }
  },

  /**
   * Teste la performance de chargement
   */
  async performanceBenchmark() {
    const AnalyticsService = (await import('./AnalyticsService.js')).default
    const from = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    const to = new Date().toISOString()

    const start = performance.now()
    
    await Promise.all([
      AnalyticsService.summary(from, to),
      AnalyticsService.timeseries(from, to),
      AnalyticsService.topPages(from, to),
      AnalyticsService.top('utm_source', from, to),
      AnalyticsService.top('device', from, to),
      AnalyticsService.compare(from, to)
    ])
    
    const duration = performance.now() - start
    console.log(`All 6 API calls completed in ${duration.toFixed(2)}ms`)
    console.log(`  Average per call: ${(duration / 6).toFixed(2)}ms`)
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests, FrontendTests }
}

// Run if executed directly
if (require.main === module) {
  runTests().catch(console.error)
}
