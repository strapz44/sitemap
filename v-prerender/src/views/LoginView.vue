<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="title">Connexion</h1>
      <form class="form" @submit.prevent="onSubmit">
        <label class="label">Email</label>
        <input class="input" type="email" v-model.trim="email" placeholder="Entrer votre email" required />
        <label class="label">Mot de passe</label>
        <input class="input" type="password" v-model.trim="password" placeholder="Entrer votre mot de passe" required />
        <button class="submit" type="submit" :disabled="loading">{{ loading ? 'Connexion…' : 'Connexion' }}</button>
        <div v-if="error" class="error">{{ error }}</div>
        <div class="links">
          <a class="link" href="#" @click.prevent>Mot de passe oublié ?</a>
          <router-link class="link" to="/register">Créer un compte</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const API_URL = ((import.meta?.env?.VITE_API_URL) || (process?.env?.VUE_APP_API_URL) || '/api')

async function onSubmit(){
  error.value = ''
  loading.value = true
  try {
    try { await axios.get(`${API_URL}/health`) } catch (e) { void e }
    const isLocal = ['localhost','127.0.0.1'].includes(window.location.hostname)
    const url = isLocal
      ? `${API_URL}/auth/login?email=${encodeURIComponent(email.value)}&password=${encodeURIComponent(password.value)}`
      : `${API_URL}/auth/login`
    const payload = isLocal ? undefined : { email: email.value, password: password.value }
    await axios.post(url, payload)
    router.push('/dashboard')
  } catch (e) {
    const status = e?.response?.status
    const detail = e?.response?.data?.error || e?.message
    error.value = `Impossible de se connecter${status ? ` (HTTP ${status})` : ''}: ${detail || 'erreur inconnue'}`
  } finally {
    loading.value = false
  }
}
 </script>

<style scoped>
.login-page { min-height: 100vh; display: grid; place-items: center; background: radial-gradient(120% 80% at 0% 0%, #f3f4f6, #ffffff); padding: 24px; }
.login-card {
  width: 420px; max-width: 92vw; border-radius: 16px; padding: 22px 22px 18px;
  background: linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.52));
  border: 1px solid rgba(148,163,184,0.35);
  box-shadow: 0 16px 36px rgba(2,6,23,0.12), inset 0 1px 0 rgba(255,255,255,0.35);
  backdrop-filter: saturate(180%) blur(16px);
  -webkit-backdrop-filter: saturate(180%) blur(16px);
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
</style>
