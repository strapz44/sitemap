const sample = [
  { siteName: 'https://example.com', urls: [{ loc: 'https://example.com/' }] },
  { siteName: 'https://vercel.com', urls: [{ loc: 'https://vercel.com/' }] }
];

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { method } = req;
  if (method === 'GET') {
    return res.status(200).json(sample);
  }
  if (method === 'POST') {
    // Accept url via query or JSON body, but do not persist (demo only)
    const url = (req.query && req.query.url) || (req.body && req.body.url) || '';
    return res.status(201).json({ ok: true, url });
  }
  res.status(405).json({ error: 'Method Not Allowed' });
};
