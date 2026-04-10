import http from '../lib/http'

export default {
  list() {
    return http.get('/sitemaps').then(r => r.data)
  },

  get(siteName) {
    return http.get(`/sitemaps/${encodeURIComponent(siteName)}`).then(r => r.data)
  },

  summary(siteName) {
    return http.get(`/sitemaps/${encodeURIComponent(siteName)}/summary`).then(r => r.data)
  },

  add(url) {
    return http.post(`/sitemaps?url=${encodeURIComponent(url)}`).then(r => r.data)
  },

  refresh(siteName) {
    return http.post(`/sitemaps/${encodeURIComponent(siteName)}/refresh`).then(r => r.data)
  },

  remove(siteName) {
    return http.delete(`/sitemaps/${encodeURIComponent(siteName)}`).then(r => r.data)
  },

  downloadHtml(siteName, { limit = 25, concurrency = 4 } = {}) {
    return http.get(`/sitemaps/${encodeURIComponent(siteName)}/html`, {
      params: { limit, concurrency, save: true },
    }).then(r => r.data)
  },
}
