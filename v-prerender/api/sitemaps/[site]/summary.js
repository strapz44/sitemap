function setCors(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

module.exports = async (req, res) => {
  setCors(req, res)
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }

  const siteParam = decodeURIComponent((req.query && req.query.site) || 'example.com')
  const now = new Date()
  const daysAgo = (n) => new Date(now.getTime() - n*24*3600*1000).toISOString()
  const body = {
    site: siteParam,
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
  res.end(JSON.stringify(body))
}
