let db = [
  { siteName: 'https://example.com', urls: [{ loc: 'https://example.com/' }] },
  { siteName: 'https://vercel.com', urls: [{ loc: 'https://vercel.com/' }] }
];

function normalize(url) {
  try {
    const raw = (url || '').trim();
    if (!raw) return '';
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withProto);
    return `${u.protocol}//${u.host}`;
  } catch (e) {
    return '';
  }
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Max-Age', '600');
  res.setHeader('Cache-Control', 'no-store');
  const { method } = req;
  if (method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (method === 'GET') {
    return res.status(200).json(db);
  }
  if (method === 'POST') {
    // Accept url via query or JSON body, but do not persist (demo only)
    const url = (req.query && req.query.url) || (req.body && req.body.url) || '';
    const site = normalize(url);
    if (!site) {
      return res.status(400).json({ error: 'Invalid url' });
    }
    if (!db.find(it => it.siteName === site)) {
      db.push({ siteName: site, urls: [{ loc: `${site}/` }] });
    }
    return res.status(201).json({ ok: true, url: site });
  }
  res.status(405).json({ error: 'Method Not Allowed' });
};
