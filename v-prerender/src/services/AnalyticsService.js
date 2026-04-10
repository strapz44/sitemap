import http from '../lib/http'

export default {
  /**
   * Récupère le résumé des analytics
   * @param {string} from - Date de début (ISO 8601)
   * @param {string} to - Date de fin (ISO 8601)
   * @param {string} site - Site optionnel
   */
  summary(from, to, site = null) {
    const params = new URLSearchParams()
    params.append('from', from)
    params.append('to', to)
    if (site) params.append('site', site)
    return http.get(`/analytics/summary?${params}`).then(r => r.data)
  },

  /**
   * Récupère les séries temporelles
   */
  timeseries(from, to, site = null) {
    const params = new URLSearchParams()
    params.append('from', from)
    params.append('to', to)
    if (site) params.append('site', site)
    return http.get(`/analytics/timeseries?${params}`).then(r => r.data)
  },

  /**
   * Récupère les top pages
   */
  topPages(from, to, limit = 10, site = null) {
    const params = new URLSearchParams()
    params.append('from', from)
    params.append('to', to)
    params.append('limit', limit)
    if (site) params.append('site', site)
    return http.get(`/analytics/top-pages?${params}`).then(r => r.data)
  },

  /**
   * Récupère les top par catégorie
   */
  top(by, from, to, limit = 10, site = null) {
    const params = new URLSearchParams()
    params.append('by', by)
    params.append('from', from)
    params.append('to', to)
    params.append('limit', limit)
    if (site) params.append('site', site)
    return http.get(`/analytics/top?${params}`).then(r => r.data)
  },

  /**
   * Récupère les stats comparatives (current vs previous period)
   */
  compare(from, to, site = null) {
    const params = new URLSearchParams()
    params.append('from', from)
    params.append('to', to)
    if (site) params.append('site', site)
    return http.get(`/analytics/compare?${params}`).then(r => r.data)
  },

  /**
   * Lance l'analyse d'un site (refresh analytics)
   */
  analyze(siteName) {
    return http.post('/analytics/analyze', { siteName }).then(r => r.data)
  },

  /**
   * Récupère l'historique des analyses
   */
  getAnalysisHistory(siteName, limit = 10) {
    return http.get(`/analytics/analysis-history?siteName=${encodeURIComponent(siteName)}&limit=${limit}`).then(r => r.data)
  },

  /**
   * Récupère le statut d'une analyse en cours
   */
  getAnalysisStatus(jobId) {
    return http.get(`/analytics/analysis-status?jobId=${jobId}`).then(r => r.data)
  },
}
