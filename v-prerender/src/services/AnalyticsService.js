import axios from 'axios'

const API_BASE = (['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? '/api'
  : (process?.env?.VUE_APP_API_URL || '/api'))

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
    return axios.get(`${API_BASE}/analytics/summary?${params}`).then(r => r.data)
  },

  /**
   * Récupère les séries temporelles
   */
  timeseries(from, to, site = null) {
    const params = new URLSearchParams()
    params.append('from', from)
    params.append('to', to)
    if (site) params.append('site', site)
    return axios.get(`${API_BASE}/analytics/timeseries?${params}`).then(r => r.data)
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
    return axios.get(`${API_BASE}/analytics/top-pages?${params}`).then(r => r.data)
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
    return axios.get(`${API_BASE}/analytics/top?${params}`).then(r => r.data)
  },

  /**
   * Récupère les stats comparatives (current vs previous period)
   */
  compare(from, to, site = null) {
    const params = new URLSearchParams()
    params.append('from', from)
    params.append('to', to)
    if (site) params.append('site', site)
    return axios.get(`${API_BASE}/analytics/compare?${params}`).then(r => r.data)
  },

  /**
   * Lance l'analyse d'un site (refresh analytics)
   */
  analyze(siteName) {
    return axios.post(`${API_BASE}/analytics/analyze`, { siteName }).then(r => r.data)
  },

  /**
   * Récupère l'historique des analyses
   */
  getAnalysisHistory(siteName, limit = 10) {
    return axios.get(`${API_BASE}/analytics/analysis-history?siteName=${encodeURIComponent(siteName)}&limit=${limit}`).then(r => r.data)
  },

  /**
   * Récupère le statut d'une analyse en cours
   */
  getAnalysisStatus(jobId) {
    return axios.get(`${API_BASE}/analytics/analysis-status?jobId=${jobId}`).then(r => r.data)
  },
}
