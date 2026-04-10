/**
 * Centralized HTTP client — Prerender V3.
 *
 * Features:
 *   - Consistent baseURL and credentials across all services
 *   - Automatic token refresh on 401 (with request deduplication)
 *   - Configurable auth-expiry callback (set from main.js)
 *   - 30s timeout to prevent hanging requests
 */

import axios from 'axios'

const http = axios.create({
  baseURL: process.env.VUE_APP_API_URL || '/api',
  timeout: 30_000,
  withCredentials: true,
  headers: {
    'x-site': typeof window !== 'undefined' ? window.location.host : '',
  },
})

// ── Auth-expiry callback (set by main.js to avoid circular imports) ──

let _onAuthExpired = null

export function onAuthExpired(handler) {
  _onAuthExpired = handler
}

// ── 401 Interceptor — automatic token refresh ───────────────────────

let refreshPromise = null

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config

    // Skip retry for auth endpoints or already-retried requests
    if (
      config._retry ||
      config.url?.includes('/auth/refresh') ||
      config.url?.includes('/auth/login')
    ) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401) {
      config._retry = true

      // Deduplicate concurrent refresh calls
      if (!refreshPromise) {
        refreshPromise = http.post('/auth/refresh')
          .finally(() => { refreshPromise = null })
      }

      try {
        await refreshPromise
        return http(config) // retry original request with fresh token
      } catch {
        if (_onAuthExpired) _onAuthExpired()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

export default http
