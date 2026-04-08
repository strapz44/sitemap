<template>
  <div class="auth-page">
    <div class="card">
      <h1 class="title">Nouveau mot de passe</h1>

      <div v-if="done" class="success-block">
        <div class="success-icon">✓</div>
        <p class="success-msg">Votre mot de passe a été réinitialisé avec succès.</p>
        <router-link class="submit link-btn" to="/login">Se connecter</router-link>
      </div>

      <div v-else-if="!token" class="error-block">
        <p class="error">Lien invalide ou expiré. Veuillez refaire une demande.</p>
        <router-link class="submit link-btn" to="/forgot-password">Renvoyer un lien</router-link>
      </div>

      <form v-else class="form" @submit.prevent="onSubmit">
        <label class="label">Nouveau mot de passe</label>
        <input class="input" type="password" v-model="password" placeholder="Minimum 8 caractères" required />
        <div class="strength">
          <div class="strength-bar" :style="{ width: strengthPct + '%', background: strengthColor }"></div>
        </div>

        <label class="label">Confirmer le mot de passe</label>
        <input class="input" type="password" v-model="confirm" placeholder="Confirmez votre mot de passe" required />

        <button class="submit" type="submit" :disabled="loading">{{ loading ? 'Mise à jour…' : 'Réinitialiser' }}</button>
        <div v-if="error" class="error">{{ error }}</div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const token = computed(() => route.query.token || '')

const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')
const done = ref(false)

const API_URL = (['localhost','127.0.0.1'].includes(window.location.hostname) ? '/api'
  : ((import.meta?.env?.VITE_API_URL) || (process?.env?.VUE_APP_API_URL) || '/api'))

const strengthPct = computed(() => {
  const p = password.value
  if (!p) return 0
  let s = 0
  if (p.length >= 8) s += 25
  if (/[A-Z]/.test(p)) s += 25
  if (/[a-z]/.test(p)) s += 25
  if (/\d/.test(p)) s += 15
  if (/[^A-Za-z0-9]/.test(p)) s += 10
  return Math.min(s, 100)
})

const strengthColor = computed(() => {
  const s = strengthPct.value
  if (s < 40) return '#ef4444'
  if (s < 70) return '#f59e0b'
  return '#10b981'
})

async function onSubmit() {
  error.value = ''
  if (password.value !== confirm.value) { error.value = 'Les mots de passe ne correspondent pas.'; return }
  if (password.value.length < 8) { error.value = 'Minimum 8 caractères.'; return }
  if (!/[A-Z]/.test(password.value) || !/[a-z]/.test(password.value) || !/\d/.test(password.value)) {
    error.value = 'Le mot de passe doit contenir majuscule, minuscule et chiffre.'
    return
  }
  loading.value = true
  try {
    await axios.post(`${API_URL}/auth/reset-password`, { token: token.value, password: password.value })
    done.value = true
  } catch (e) {
    const detail = e?.response?.data?.error
    if (detail === 'invalid_token') error.value = 'Lien expiré ou déjà utilisé. Refaites une demande.'
    else if (detail === 'weak_password') error.value = 'Mot de passe trop faible (majuscule, minuscule et chiffre requis).'
    else error.value = 'Erreur lors de la réinitialisation.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page { min-height: 100vh; display: grid; place-items: center; background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdfa 100%); padding: 24px; }
.card {
  width: 420px; max-width: 92vw; border-radius: 16px; padding: 22px 22px 18px;
  background: rgba(255,255,255,0.55);
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 16px 36px rgba(2,6,23,0.1), inset 0 1px 0 rgba(255,255,255,0.5);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
}
.title { margin: 0 0 12px; color: #0f172a; font-size: 1.3rem; font-weight: 800; }
.form { display: grid; gap: 10px; }
.label { font-size: 12px; color: #64748b; letter-spacing: .04em; text-transform: uppercase; }
.input { height: 44px; border-radius: 12px; padding: 10px 12px; background: rgba(255,255,255,0.92); border: 1px solid rgba(148,163,184,0.35); color: #0f172a; }
.input:focus { outline: none; border-color: var(--accent-border); box-shadow: 0 0 0 4px var(--accent-ring); }
.strength { height: 4px; border-radius: 4px; background: #e2e8f0; margin: -4px 0 4px; overflow: hidden; }
.strength-bar { height: 100%; border-radius: 4px; transition: width .3s, background .3s; }
.submit { height: 44px; border-radius: 12px; background: #1BFD9C; color: #041015; border: 1px solid #1BFD9C; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; text-decoration: none; }
.submit:disabled { opacity: .7; cursor: not-allowed; }
.error { color: #ef4444; font-size: .95rem; }
.error-block { text-align: center; }
.success-block { text-align: center; }
.success-icon { width: 48px; height: 48px; background: #10b981; color: #fff; font-size: 1.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
.success-msg { font-size: 0.95rem; color: #334155; margin-bottom: 16px; }
.link-btn { margin-top: 10px; }
</style>
