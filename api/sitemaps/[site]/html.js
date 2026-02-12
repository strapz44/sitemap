module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const site = decodeURIComponent(req.query.site || 'example.com');
  const limitRaw = req.query.limit || '25';
  const concurrencyRaw = req.query.concurrency || '4';
  const save = String(req.query.save) === 'true';

  const limit = Math.max(1, Math.min(parseInt(limitRaw, 10) || 25, 100));
  const concurrency = Math.max(1, Math.min(parseInt(concurrencyRaw, 10) || 4, 16));

  const base = site.startsWith('http') ? site.replace(/\/$/, '') : `https://${site.replace(/\/$/, '')}`;

  const pages = Array.from({ length: limit }, (_, i) => {
    const url = i === 0 ? `${base}/` : `${base}/page-${i}`;
    return {
      url,
      status: 200,
      title: `Sample page ${i || 1}`,
      html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Sample ${i || 1}</title></head><body><main><h1>Sample ${i || 1}</h1><p>Mock HTML for ${url}</p></main></body></html>`
    };
  });

  return res.status(200).json({ site: base, count: pages.length, concurrency, saved: save, pages });
};
