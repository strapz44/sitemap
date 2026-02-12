module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  const site = decodeURIComponent(req.query.site || 'example.com')
  const seed = [...site].reduce((a,c)=>a+c.charCodeAt(0),0)
  function prng(n){ let x = (seed + n*9973) % 2147483647; return (x/2147483647) }
  const sessions = Math.round(800 + prng(1)*1200)
  const users = Math.round(sessions * (0.82 + prng(2)*0.1))
  const pageviews = Math.round(sessions * (1.8 + prng(3)*1.2))
  const avgDurationSec = Math.round(45 + prng(4)*95)
  const bounceRate = +(0.35 + prng(5)*0.25).toFixed(2)
  const conversionRate = +(0.02 + prng(6)*0.04).toFixed(3)
  const activeVisitors = Math.round(5 + prng(7)*30)
  res.status(200).json({
    site,
    range: req.query.range || '7d',
    sessions, users, pageviews, avgDurationSec, bounceRate, conversionRate, activeVisitors
  })
}
