<template>
  <div class="auth-page">
    <div class="card">
      <h1 class="title">Mot de passe oublié</h1>
      <p class="desc" v-if="!sent">Entrez votre email pour recevoir un lien de réinitialisation.</p>
      <form v-if="!sent" class="form" @submit.prevent="onSubmit">
        <label class="label">Email</label>
        <input class="input" type="email" v-model.trim="email" placeholder="Votre adresse email" required />
        <button class="submit" type="submit" :disabled="loading">{{ loading ? 'Envoi…' : 'Envoyer le lien' }}</button>
        <div v-if="error" class="error">{{ error }}</div>
        <div class="links">
          <router-link class="link" to="/login">Retour à la connexion</router-link>
        </div>
      </form>
      <div v-else class="success-block">
        <div class="success-icon">✓</div>
        <p class="success-msg">Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.</p>
        <router-link class="submit link-btn" to="/login">Retour à la connexion</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const email = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)

const API_URL = (['localhost','127.0.0.1'].includes(window.location.hostname) ? '/api'
  : ((import.meta?.env?.VITE_API_URL) || (process?.env?.VUE_APP_API_URL) || '/api'))

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await axios.post(`${API_URL}/auth/forgot-password`, { email: email.value })
    sent.value = true
  } catch (e) {
    const detail = e?.response?.data?.error
    error.value = detail === 'rate_limited'
      ? 'Trop de tentatives. Réessayez dans quelques minutes.'
      : 'Erreur lors de l\'envoi.'
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
.title { margin: 0 0 4px; color: #0f172a; font-size: 1.3rem; font-weight: 800; }
.desc { font-size: 0.9rem; color: #64748b; margin-bottom: 12px; }
.form { display: grid; gap: 10px; }
.label { font-size: 12px; color: #64748b; letter-spacing: .04em; text-transform: uppercase; }
.input { height: 44px; border-radius: 12px; padding: 10px 12px; background: rgba(255,255,255,0.92); border: 1px solid rgba(148,163,184,0.35); color: #0f172a; }
.input:focus { outline: none; border-color: var(--accent-border); box-shadow: 0 0 0 4px var(--accent-ring); }
.submit { height: 44px; border-radius: 12px; background: #1BFD9C; color: #041015; border: 1px solid #1BFD9C; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; text-decoration: none; }
.submit:disabled { opacity: .7; cursor: not-allowed; }
.error { color: #ef4444; font-size: .95rem; }
.links { display: flex; justify-content: flex-end; margin-top: 6px; }
.link { color: var(--accent); text-decoration: none; font-weight: 600; }
.success-block { text-align: center; }
.success-icon { width: 48px; height: 48px; background: #10b981; color: #fff; font-size: 1.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
.success-msg { font-size: 0.95rem; color: #334155; margin-bottom: 16px; }
.link-btn { margin-top: 10px; }
</style>
