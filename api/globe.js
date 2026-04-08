const { setCors, handlePreflight } = require('./_cors')
const store = require('./_store')
const http = require('http')
const https = require('https')
const dns = require('dns').promises

// Cache TTL: 1 heure
const geoCache = new Map() // { domain -> { lat, lng, country, city, ts } }
const CACHE_TTL_MS = 60 * 60 * 1000

function extractDomain(siteUrl) {
  try {
    return new URL(siteUrl).hostname
  } catch {
    return siteUrl
  }
}

function fetchJson(url) {
  const client = url.startsWith('https') ? https : http
  return new Promise((resolve, reject) => {
    client.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

async function resolveIp(domain) {
  try {
    const addrs = await dns.resolve4(domain)
    return addrs[0] || null
  } catch {
    try {
      const addrs = await dns.resolve6(domain)
      return addrs[0] || null
    } catch {
      return null
    }
  }
}

async function geolocate(domain) {
  const now = Date.now()
  const cached = geoCache.get(domain)
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return cached
  }

  try {
    const ip = await resolveIp(domain)
    if (!ip) throw new Error('no ip')

    // ip-api.com — gratuit jusqu'à 45 req/min, pas de clé requise (HTTP uniquement en free tier)
    const data = await fetchJson(`http://ip-api.com/json/${ip}?fields=status,lat,lon,country,city,regionName`)
    if (data.status !== 'success') throw new Error('geo failed')

    const result = {
      lat: data.lat,
      lng: data.lon,
      country: data.country,
      city: data.city,
      region: data.regionName,
      ip,
      ts: now,
    }
    geoCache.set(domain, result)
    return result
  } catch {
    // Fallback: coordonnées nulles, on ne bloque pas
    return { lat: null, lng: null, country: null, city: null, region: null, ip: null, ts: now }
  }
}

module.exports = async (req, res) => {
  const allowed = setCors(req, res)
  if (req.method === 'OPTIONS') return handlePreflight(req, res)
  if (!allowed) { res.statusCode = 403; return res.end('Origin not allowed') }

  if (req.method !== 'GET') {
    res.statusCode = 405
    return res.end('Method Not Allowed')
  }

  const sitemaps = store.get()
  const results = await Promise.all(
    sitemaps.map(async (item) => {
      const domain = extractDomain(item.siteName)
      const geo = await geolocate(domain)
      return {
        site: item.siteName,
        domain,
        lat: geo.lat,
        lng: geo.lng,
        country: geo.country,
        city: geo.city,
        region: geo.region,
        ip: geo.ip,
        urlCount: Array.isArray(item.urls) ? item.urls.length : 0,
      }
    })
  )

  // Filtrer les sites sans coordonnées
  const located = results.filter(r => r.lat !== null && r.lng !== null)

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'public, max-age=300') // 5 min browser cache
  res.end(JSON.stringify({ sites: located, total: sitemaps.length, located: located.length }))
}
