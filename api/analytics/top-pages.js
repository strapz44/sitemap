module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  const site = decodeURIComponent(req.query.site || 'example.com')
  const base = [...site].reduce((a,c)=>a+c.charCodeAt(0),0)
  function rng(n){ return ((base + n*7333) % 1000) / 1000 }
  const pages = Array.from({ length: 8 }).map((_,i) => {
    const pv = Math.round(120 + rng(i+1)*900)
    const us = Math.round(pv * (0.55 + rng(i+9)*0.35))
    const dur = Math.round(30 + rng(i+17)*160)
    const br = +(0.2 + rng(i+25)*0.55).toFixed(2)
    const path = i === 0 ? '/' : `/page-${i}`
    return { path, pageviews: pv, users: us, avgDurationSec: dur, bounceRate: br }
  })
  res.status(200).json({ site, pages })
}
