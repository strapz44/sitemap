const state = {
  sitemaps: [
    { siteName: 'https://quiveutfairemestravaux.com', urls: [] },
    { siteName: 'https://citrondigital.fr', urls: [] },
    { siteName: 'https://nike.com', urls: [] },
  ],
  summaries: Object.create(null), // { [siteName]: { lastCrawl, lastmodLatest, changefreqCounts, errors, warnings, httpStatus, size, score, urlsSubmitted, urlsIndexed } }
}

function defaultSummary(site) {
  const now = new Date()
  return {
    site,
    lastmodLatest: now.toISOString(),
    lastCrawl: null,
    changefreqCounts: { daily: 0, weekly: 0, monthly: 0 },
    errors: 0,
    warnings: 0,
    httpStatus: 200,
    size: '—',
    score: 0,
    urlsSubmitted: 0,
    urlsIndexed: 0,
  }
}

function ensureSummary(site) {
  const key = String(site || '').trim()
  if (!key) return null
  if (!state.summaries[key]) state.summaries[key] = defaultSummary(key)
  return state.summaries[key]
}

module.exports.get = function get() {
  return state.sitemaps
}

module.exports.set = function set(next) {
  state.sitemaps = Array.isArray(next) ? next : state.sitemaps
}

module.exports.ensureSummary = ensureSummary

module.exports.getSummary = function getSummary(site) {
  const s = ensureSummary(site)
  return s || null
}

module.exports.touchCrawl = function touchCrawl(site) {
  const s = ensureSummary(site)
  if (s) s.lastCrawl = new Date().toISOString()
  return s
}
