/**
 * Store in-memory partagé pour les sitemaps (Vercel serverless).
 * En serverless, chaque cold-start repart de zéro.
 * Pour la persistance, migrer vers une base (PostgreSQL / Redis).
 */

let sitemaps = []

const store = {
  /** Retourne la liste complète des sitemaps */
  get() {
    return sitemaps
  },

  /** Remplace la liste complète */
  set(list) {
    sitemaps = Array.isArray(list) ? list : []
  },

  /** Marque un site comme crawlé (touch lastCrawl) */
  touchCrawl(siteName) {
    const s = sitemaps.find(x => x.siteName === siteName)
    if (s) {
      s.lastCrawl = new Date().toISOString()
    }
    return s || null
  },

  /** Retourne un résumé pour un site */
  getSummary(siteName) {
    const s = sitemaps.find(x => x.siteName === siteName)
    if (!s) return null
    return {
      site: s.siteName,
      urlCount: Array.isArray(s.urls) ? s.urls.length : 0,
      lastCrawl: s.lastCrawl || null,
      lastmodLatest: s.lastmodLatest || null,
    }
  },
}

module.exports = store
