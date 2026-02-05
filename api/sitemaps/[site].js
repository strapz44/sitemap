module.exports = (req, res) => {
  const { method } = req;
  if (method === 'DELETE') {
    const site = decodeURIComponent(req.query.site || 'example.com');
    return res.status(200).json({ ok: true, deleted: site });
  }
  res.status(405).json({ error: 'Method Not Allowed' });
};
