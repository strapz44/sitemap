module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  const site = decodeURIComponent(req.query.site || 'example.com')
  const base = [...site].reduce((a,c)=>a+c.charCodeAt(0),0)
  function rng(n){ return ((base + n*7919) % 1000) / 1000 }
  const channels = [
    { channel: 'Organic',   sessions: Math.round(400 + rng(1)*800) },
    { channel: 'Direct',    sessions: Math.round(250 + rng(2)*500) },
    { channel: 'Referral',  sessions: Math.round(120 + rng(3)*240) },
    { channel: 'Social',    sessions: Math.round(80  + rng(4)*200) },
    { channel: 'Paid',      sessions: Math.round(60  + rng(5)*160) },
    { channel: 'Email',     sessions: Math.round(40  + rng(6)*120) },
  ]
  const total = channels.reduce((s,c)=>s+c.sessions,0)
  channels.forEach(c => c.share = +(c.sessions/total).toFixed(3))
  res.status(200).json({ site, total, channels })
}
