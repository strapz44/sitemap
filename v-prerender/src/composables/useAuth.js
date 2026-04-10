/**
 * Auth composable — Prerender V3.
 *
 * Provides reactive authentication state shared across all components.
 * Module-level refs ensure a single source of truth (singleton pattern).
 *
 * @example
 *   import { useAuth } from '@/composables/useAuth'
 *
 *   const { user, isAuthenticated, login, logout } = useAuth()
 */

import { ref, computed, readonly } from 'vue'
import AuthService from '../services/AuthService'

// ── Singleton State (shared across all component instances) ─────

const user = ref(null)
const loading = ref(false)
const initialized = ref(false)

// ── Composable ──────────────────────────────────────────────────

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)

  /**
   * Fetch current user from /api/auth/me.
   * Called once on app mount to restore session.
   */
  async function fetchUser() {
    if (loading.value) return
    try {
      loading.value = true
      const data = await AuthService.me()
      user.value = data.user || null
    } catch {
      user.value = null
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  /**
   * Login with email/password (and optional TOTP code).
   * Returns the raw API response for the caller to handle 2FA flow.
   */
  async function login(credentials) {
    const data = await AuthService.login(credentials)
    if (data.ok && data.user) {
      user.value = data.user
      initialized.value = true
    }
    return data
  }

  /**
   * Register a new account.
   */
  async function register(credentials) {
    const data = await AuthService.register(credentials)
    if (data.ok && data.user) {
      user.value = data.user
      initialized.value = true
    }
    return data
  }

  /**
   * Logout and clear local state.
   */
  async function logout() {
    try {
      await AuthService.logout()
    } finally {
      user.value = null
    }
  }

  /**
   * Clear auth state (called on token expiry).
   */
  function clear() {
    user.value = null
    initialized.value = false
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    initialized: readonly(initialized),
    isAuthenticated,
    fetchUser,
    login,
    register,
    logout,
    clear,
  }
}
