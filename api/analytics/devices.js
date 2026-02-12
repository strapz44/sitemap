module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  const site = decodeURIComponent(req.query.site || 'example.com')
  const base = [...site].reduce((a,c)=>a+c.charCodeAt(0),0)
  function rng(n){ return ((base + n*6863) % 1000) / 1000 }
  const desktop = Math.round(400 + rng(1)*800)
  const mobile = Math.round(300 + rng(2)*700)
  const tablet = Math.round(50 + rng(3)*150)
  const total = desktop + mobile + tablet
  res.status(200).json({ site, total, devices: [
    { device: 'Desktop', sessions: desktop, share: +(desktop/total).toFixed(3) },
    { device: 'Mobile', sessions: mobile, share: +(mobile/total).toFixed(3) },
    { device: 'Tablet', sessions: tablet, share: +(tablet/total).toFixed(3) },
  ]})
}
