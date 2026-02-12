function setCors(req, res) {
  try {
    const origin = req.headers.origin || '*'
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  } catch {}
}

module.exports = async (req, res) => {
  setCors(req, res)
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }

  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ ok: true }))
}
