<template>
  <div class="auth-page">
    <div class="card">
      <h1 class="title">Créer un compte</h1>
      <form class="form" @submit.prevent="onSubmit">
        <label class="label">Nom</label>
        <input class="input" type="text" v-model.trim="name" placeholder="Votre nom" />
        <label class="label">Email</label>
        <input class="input" type="email" v-model.trim="email" placeholder="Entrer votre email" required />
        <label class="label">Mot de passe</label>
        <input class="input" type="password" v-model.trim="password" placeholder="Min 8 car. · majuscule · minuscule · chiffre" required />
        <div v-if="password" class="strength">
          <div class="strength-bar" :style="{ width: strengthPct + '%', background: strengthColor }"></div>
        </div>
        <button class="submit" type="submit" :disabled="loading">{{ loading ? 'Création…' : 'Créer le compte' }}</button>
        <div v-if="error" class="error">{{ error }}</div>
        <div class="links">
          <router-link class="link" to="/login">J'ai déjà un compte</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const API_URL = (['localhost','127.0.0.1'].includes(window.location.hostname)
  ? '/api'
  : ((import.meta?.env?.VITE_API_URL) || (process?.env?.VUE_APP_API_URL) || '/api'))

const strength = computed(() => {
  const p = password.value
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p)) s++
  if (/[a-z]/.test(p)) s++
  if (/[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
})
const strengthPct = computed(() => strength.value * 20)
const strengthColor = computed(() => ['#ef4444','#f97316','#eab308','#22c55e','#10b981'][Math.max(0, strength.value - 1)] || '#ef4444')

async function onSubmit(){
  error.value = ''
  if (password.value.length < 8 || !/[A-Z]/.test(password.value) || !/[a-z]/.test(password.value) || !/[0-9]/.test(password.value)) {
    error.value = 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre'
    return
  }
  loading.value = true
  try {
    await axios.post(`${API_URL}/auth/register`, { name: name.value, email: email.value, password: password.value })
    router.push('/dashboard')
  } catch (e) {
    const detail = e?.response?.data?.error || e?.message
    const msg = {
      email_taken: 'Un compte existe déjà avec cet email',
      invalid_email: 'Adresse email invalide',
      weak_password: e?.response?.data?.message || 'Mot de passe trop faible',
      rate_limited: 'Trop de tentatives. Réessayez plus tard.',
    }[detail] || `Erreur lors de la création du compte`
    error.value = msg
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
.submit { height: 44px; border-radius: 12px; background: #1BFD9C; color: #041015; border: 1px solid #1BFD9C; font-weight: 800; cursor: pointer; }
.submit:disabled { opacity: .7; cursor: not-allowed; }
.error { color: #ef4444; font-size: .95rem; }
.links { display: flex; justify-content: flex-end; margin-top: 6px; }
.link { color: var(--accent); text-decoration: none; font-weight: 600; }
.strength { height: 4px; background: rgba(0,0,0,0.06); border-radius: 2px; overflow: hidden; margin-top: -4px; }
.strength-bar { height: 100%; border-radius: 2px; transition: width .3s, background .3s; }
</style>
