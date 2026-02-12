function seedFor(site, range){
  const s = [...decodeURIComponent(site || '')].reduce((a,c)=>a+c.charCodeAt(0),0)
  const r = (range||'7d').length
  return s + r*131
}
function prngFactory(seed){
  let x = (seed % 2147483647) || 1
  return function(){ x = (x * 48271) % 2147483647; return x / 2147483647 }
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  const site = decodeURIComponent(req.query.site || 'example.com')
  const range = req.query.range || '7d'
  const points = range === '24h' ? 24 : (range === '30d' ? 30 : 7)
  const seed = seedFor(site, range)
  const rnd = prngFactory(seed)
  const start = Date.now() - (points-1) * 24*3600*1000
  const series = []
  for (let i=0;i<points;i++){
    const base = 100 + i*5 + Math.sin(i/2)*20
    const sessions = Math.round(base + rnd()*40)
    const users = Math.round(sessions * (0.82 + rnd()*0.1))
    const pageviews = Math.round(sessions * (1.8 + rnd()*1.2))
    series.push({
      t: new Date(start + i*24*3600*1000).toISOString(),
      sessions, users, pageviews
    })
  }
  res.status(200).json({ site, range, series })
}
