<template>
  <div v-if="open" class="overlay" @click.self="emitClose">
    <div class="panel" :class="{ 'is-open': ready }">
      <div class="panel-header">
        <button class="close-btn" @click="emitClose">×</button>
      </div>
      <form class="form" @submit.prevent="onSubmit">
        <label class="label stagger-item" style="--i: 0">EMAIL</label>
        <input class="input stagger-item" style="--i: 1" type="email" v-model.trim="email" placeholder="Entrer votre email" required />

        <label class="label stagger-item" style="--i: 2">MOT DE PASSE</label>
        <input class="input stagger-item" style="--i: 3" type="password" v-model.trim="password" placeholder="Entrer votre mot de passe" required />

        <button class="submit stagger-item" style="--i: 4" type="submit" :disabled="loading">
          {{ loading ? 'Connexion…' : 'Connexion' }}
        </button>

        <div v-if="error" class="error stagger-item" style="--i: 5">{{ error }}</div>

        <div class="actions stagger-item" style="--i: 6">
          <a href="#" class="link" @click.prevent>Mot de passe oublié ?</a>
          <div class="sep"></div>
          <a href="#" class="link" @click.prevent>Pas encore de compte ? S’inscrire</a>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import axios from 'axios'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'success', 'error'])

const email = ref('')
const password = ref('')
const totpCode = ref('')
const backupCode = ref('')
const loading = ref(false)
const error = ref('')
const ready = ref(false)
const needs2FA = ref(false)
const showBackup = ref(false)

const API_URL = (['localhost','127.0.0.1'].includes(window.location.hostname)
  ? '/api'
  : ((import.meta?.env?.VITE_API_URL) || (process?.env?.VUE_APP_API_URL) || '/api'))

watch(() => props.open, async (v) => {
  if (v) {
    email.value = ''
    password.value = ''
    totpCode.value = ''
    backupCode.value = ''
    error.value = ''
    needs2FA.value = false
    showBackup.value = false
    ready.value = false
    await nextTick()
    requestAnimationFrame(() => { ready.value = true })
  } else {
    ready.value = false
  }
})

function emitClose(){ if (!loading.value) emit('close') }

async function onSubmit(){
  error.value = ''
  loading.value = true
  try {
    const payload = { email: email.value, password: password.value }
    if (needs2FA.value) {
      if (backupCode.value) payload.backupCode = backupCode.value
      else payload.totpCode = totpCode.value
    }
    const { data } = await axios.post(`${API_URL}/auth/login`, payload)
    if (data.requires2FA) {
      needs2FA.value = true
      loading.value = false
      return
    }
    if (data.ok) {
      emit('success', data)
      emit('close')
    }
  } catch (e) {
    const detail = e?.response?.data?.error || e?.message
    const msg = {
      invalid_credentials: 'Email ou mot de passe incorrect',
      invalid_totp: 'Code authenticator invalide',
      invalid_backup_code: 'Code de secours invalide',
      rate_limited: 'Trop de tentatives. Réessayez plus tard.',
    }[detail] || `Erreur de connexion`
    error.value = msg
    emit('error', e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.overlay { position: fixed; inset: 0; background: var(--overlay-bg, rgba(255, 255, 255, 0.35)); backdrop-filter: blur(8px) saturate(160%); -webkit-backdrop-filter: blur(8px) saturate(160%); display: flex; justify-content: flex-end; z-index: 1000; }
.panel { width: 380px; max-width: 92vw; height: 100%; background: var(--panel-bg, linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.55))); backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%); color: #111827; border-left: 1px solid rgba(255,255,255,0.5); padding: 24px; box-shadow: -12px 0 30px rgba(0,0,0,0.06), -4px 0 12px rgba(0,0,0,0.03); transform: translateX(16px); opacity: 0; transition: transform .45s cubic-bezier(.22,1,.36,1), opacity .45s cubic-bezier(.22,1,.36,1); }
.panel.is-open { transform: none; opacity: 1; }
.stagger-item { opacity: 0; transform: translateY(10px) scale(0.98); transition: opacity .45s cubic-bezier(.22,1,.36,1), transform .45s cubic-bezier(.22,1,.36,1); transition-delay: calc(var(--i, 0) * 70ms + 120ms); }
.panel.is-open .stagger-item { opacity: 1; transform: none; }
.panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.panel-header h3 { margin: 0; letter-spacing: .06em; font-weight: 700; color: #0b1220; }
.close-btn { background: rgba(255,255,255,0.65); border: 1px solid rgba(0,0,0,0.06); color: #0b1220; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; }
.form { display: grid; gap: 12px; }
.label { font-size: 12px; color: #6b7280; letter-spacing: .06em; }
.input { background: rgba(255,255,255,0.78); border: 1px solid rgba(0,0,0,0.08); color: #111827; border-radius: 12px; padding: 12px 14px; }
.input:focus { outline: none; border-color: var(--accent-border); box-shadow: 0 0 0 4px var(--accent-ring); }
.submit { margin-top: 8px; background: #1BFD9C; color: #041015; border: 1px solid #1BFD9C; border-radius: 12px; padding: 12px 14px; font-weight: 700; cursor: pointer; }
.submit:disabled { opacity: .7; cursor: not-allowed; }
.error { color: #ef4444; font-size: 0.95rem; margin-top: 6px; }
.actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; color: #6b7280; }
.link { color: var(--accent); text-decoration: none; }
.sep { flex: 1 1 auto; height: 1px; background: rgba(0,0,0,0.06); }

</style>
