<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="title">Connexion</h1>
      <form class="form" @submit.prevent="onSubmit">
        <template v-if="!needs2FA">
          <label class="label">Email</label>
          <input class="input" type="email" v-model.trim="email" placeholder="Entrer votre email" required />
          <label class="label">Mot de passe</label>
          <input class="input" type="password" v-model.trim="password" placeholder="Entrer votre mot de passe" required />
        </template>
        <template v-else>
          <div class="twofa-notice">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#302b63" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Vérification en deux étapes requise
          </div>
          <label class="label">Code authenticator</label>
          <input class="input input-code" type="text" v-model.trim="totpCode" placeholder="000 000" maxlength="6" inputmode="numeric" autocomplete="one-time-code" />
          <button type="button" class="link-btn" @click="showBackup = !showBackup">Utiliser un code de secours</button>
          <template v-if="showBackup">
            <label class="label">Code de secours</label>
            <input class="input" type="text" v-model.trim="backupCode" placeholder="Code de secours" />
          </template>
        </template>
        <button class="submit" type="submit" :disabled="loading">{{ loading ? 'Connexion…' : (needs2FA ? 'Vérifier' : 'Connexion') }}</button>
        <div v-if="error" class="error">{{ error }}</div>
        <div class="links">
          <router-link class="link" to="/forgot-password">Mot de passe oublié ?</router-link>
          <router-link class="link" to="/register">Créer un compte</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route  = useRoute()
const { login } = useAuth()

const email = ref('')
const password = ref('')
const totpCode = ref('')
const backupCode = ref('')
const loading = ref(false)
const error = ref('')
const needs2FA = ref(false)
const showBackup = ref(false)

async function onSubmit(){
  error.value = ''
  loading.value = true
  try {
    const payload = { email: email.value, password: password.value }
    if (needs2FA.value) {
      if (backupCode.value) payload.backupCode = backupCode.value
      else payload.totpCode = totpCode.value
    }
    const data = await login(payload)
    console.debug('[LoginView] login result:', data)
    if (data.requires2FA) {
      needs2FA.value = true
      loading.value = false
      return
    }
    if (data.ok) {
      const redirect = route.query.redirect || '/dashboard'
      console.debug('[LoginView] navigating to:', redirect)
      await router.push(redirect)
    }
  } catch (e) {
    const status = e?.response?.status
    const detail = e?.response?.data?.error || e?.message
    const msg = {
      invalid_credentials: 'Email ou mot de passe incorrect',
      invalid_totp: 'Code authenticator invalide',
      invalid_backup_code: 'Code de secours invalide',
      rate_limited: 'Trop de tentatives. Réessayez plus tard.',
      too_many_attempts_ip: 'Trop de tentatives depuis cette adresse IP.',
      too_many_attempts_email: 'Trop de tentatives pour cet email.',
    }[detail] || `Erreur de connexion${status ? ` (${status})` : ''}`
    error.value = msg
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page { min-height: 100vh; display: grid; place-items: center; background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdfa 100%); padding: 24px; }
.login-card {
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
.input { height: 44px; border-radius: 12px; padding: 10px 12px; background: rgba(255,255,255,0.82); border: 1px solid rgba(148,163,184,0.35); color: #0f172a; }
.input:focus { outline: none; border-color: var(--accent-border); box-shadow: 0 0 0 4px var(--accent-ring); }
.submit { height: 44px; border-radius: 12px; background: #1BFD9C; color: #041015; border: 1px solid #1BFD9C; font-weight: 800; cursor: pointer; }
.submit:disabled { opacity: .7; cursor: not-allowed; }
.error { color: #ef4444; font-size: .95rem; }
.links { display: flex; justify-content: space-between; margin-top: 6px; }
.link { color: var(--accent); text-decoration: none; font-weight: 600; }
.twofa-notice { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; color: #302b63; font-weight: 600; padding: 10px 12px; background: rgba(48,43,99,0.06); border-radius: 10px; border: 1px solid rgba(48,43,99,0.12); }
.input-code { text-align: center; font-size: 1.4rem; letter-spacing: 0.3em; font-weight: 700; font-family: 'SF Mono', 'Fira Code', monospace; }
.link-btn { background: none; border: none; color: var(--accent, #302b63); font-size: 0.85rem; cursor: pointer; text-decoration: underline; padding: 0; text-align: left; }
</style>
