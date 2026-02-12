module.exports = (req, res) => {
  const { method } = req;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  const site = decodeURIComponent(req.query.site || 'example.com');
  if (method === 'OPTIONS') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(204).end();
  }
  if (method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    // Return a minimal mock document with URLs so the details page can render
    const base = site.startsWith('http') ? site.replace(/\/$/, '') : `https://${site.replace(/\/$/, '')}`;
    const now = new Date();
    const iso = (d) => new Date(d).toISOString();
    const urls = [
      { loc: `${base}/`, lastmod: iso(now), priority: '1.0', changefreq: 'weekly' },
      { loc: `${base}/about`, lastmod: iso(now.getTime() - 7*24*3600*1000), priority: '0.7', changefreq: 'monthly' },
      { loc: `${base}/contact`, lastmod: iso(now.getTime() - 30*24*3600*1000), priority: '0.6', changefreq: 'monthly' },
    ];
    return res.status(200).json({ siteName: base, urls });
  }
  if (method === 'DELETE') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, deleted: site });
  }
  res.status(405).json({ error: 'Method Not Allowed' });
};
