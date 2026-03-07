import axios from 'axios'

const API_BASE = (['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? '/api'
  : (process?.env?.VUE_APP_API_URL || '/api'))

export default {
  list() {
    return axios.get(`${API_BASE}/sitemaps`).then(r => r.data)
  },

  get(siteName) {
    return axios.get(`${API_BASE}/sitemaps/${encodeURIComponent(siteName)}`).then(r => r.data)
  },

  summary(siteName) {
    return axios.get(`${API_BASE}/sitemaps/${encodeURIComponent(siteName)}/summary`).then(r => r.data)
  },

  add(url) {
    return axios.post(`${API_BASE}/sitemaps?url=${encodeURIComponent(url)}`).then(r => r.data)
  },

  refresh(siteName) {
    return axios.post(`${API_BASE}/sitemaps/${encodeURIComponent(siteName)}/refresh`).then(r => r.data)
  },

  remove(siteName) {
    return axios.delete(`${API_BASE}/sitemaps/${encodeURIComponent(siteName)}`).then(r => r.data)
  },

  downloadHtml(siteName, { limit = 25, concurrency = 4 } = {}) {
    return axios.get(`${API_BASE}/sitemaps/${encodeURIComponent(siteName)}/html`, {
      params: { limit, concurrency, save: true },
    }).then(r => r.data)
  },
}
