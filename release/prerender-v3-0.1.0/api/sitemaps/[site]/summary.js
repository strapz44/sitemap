module.exports = (req, res) => {
  const site = decodeURIComponent(req.query.site || 'example.com');
  const now = Date.now();
  const daysAgo = (n) => new Date(now - n * 24 * 3600 * 1000).toISOString();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    site,
    lastmodLatest: daysAgo(5),
    lastCrawl: daysAgo(2),
    changefreqCounts: { daily: 3, weekly: 7, monthly: 1 },
  });
};
