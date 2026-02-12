module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  const site = decodeURIComponent(req.query.site || 'example.com');
  const now = Date.now();
  const daysAgo = (n) => new Date(now - n * 24 * 3600 * 1000).toISOString();
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  // Provide richer mock summary so UI can display metrics
  const urlsSubmitted = 42;
  const urlsIndexed = 36;
  res.status(200).json({
    site,
    lastmodLatest: daysAgo(5),
    lastCrawl: daysAgo(2),
    changefreqCounts: { daily: 3, weekly: 7, monthly: 1 },
    // New fields consumed by the UI
    errors: 1,
    warnings: 4,
    httpStatus: 200,
    size: '3.2 KB',
    score: 92,
    urlsSubmitted,
    urlsIndexed,
  });
};
