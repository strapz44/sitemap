module.exports = (req, res) => {
  const site = decodeURIComponent(req.query.site || 'example.com');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, refreshed: site, ts: Date.now() });
};
