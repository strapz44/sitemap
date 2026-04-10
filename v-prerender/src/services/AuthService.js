/**
 * Authentication API service — Prerender V3.
 *
 * Encapsulates all auth-related HTTP calls.
 * Uses the centralized HTTP client (auto-refresh, credentials, timeout).
 */

import http from '../lib/http'

export default {

  // ── Session ───────────────────────────────────────

  login(credentials) {
    return http.post('/auth/login', credentials).then(r => r.data)
  },

  register(credentials) {
    return http.post('/auth/register', credentials).then(r => r.data)
  },

  logout() {
    return http.post('/auth/logout').then(r => r.data)
  },

  me() {
    return http.get('/auth/me').then(r => r.data)
  },

  refresh() {
    return http.post('/auth/refresh').then(r => r.data)
  },

  // ── Password Reset ────────────────────────────────

  forgotPassword(email) {
    return http.post('/auth/forgot-password', { email }).then(r => r.data)
  },

  resetPassword(token, password) {
    return http.post('/auth/reset-password', { token, password }).then(r => r.data)
  },

  // ── Two-Factor Authentication ─────────────────────

  setup2FA() {
    return http.post('/auth/2fa', { action: 'setup' }).then(r => r.data)
  },

  enable2FA(code) {
    return http.post('/auth/2fa', { action: 'enable', code }).then(r => r.data)
  },

  disable2FA(password) {
    return http.post('/auth/2fa', { action: 'disable', password }).then(r => r.data)
  },
}
