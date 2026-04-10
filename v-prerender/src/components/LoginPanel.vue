<template>
  <div v-if="open" class="overlay" @click.self="emitClose">
    <div class="modal" :class="{ 'is-open': ready }">

      <!-- Close -->
      <button class="close-btn" @click="emitClose">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <form class="form" @submit.prevent="onSubmit">

        <!-- Logo + Titre -->
        <div class="form-head">
          <div class="logo-ring">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
          </div>
          <h1 class="title">{{ needs2FA ? 'Vérification 2FA' : 'Connexion' }}</h1>
          <p class="subtitle">Accédez à votre espace Prerender</p>
        </div>

        <!-- Champs principaux -->
        <template v-if="!needs2FA">
          <!-- Email -->
          <div class="field">
            <span class="field-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </span>
            <input
              type="email"
              class="input"
              v-model.trim="email"
              placeholder="Adresse email"
              required
              autocomplete="email"
            />
          </div>

          <!-- Mot de passe -->
          <div class="field">
            <span class="field-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </span>
            <input
              type="password"
              class="input"
              v-model.trim="password"
              placeholder="Mot de passe"
              required
              autocomplete="current-password"
            />
          </div>
        </template>

        <!-- 2FA -->
        <template v-else>
          <p class="totp-hint">Entrez le code à 6 chiffres de votre application authenticator.</p>

          <div v-if="!showBackup" class="field">
            <span class="field-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </span>
            <input
              type="text"
              class="input"
              v-model.trim="totpCode"
              placeholder="Code à 6 chiffres"
              maxlength="6"
              inputmode="numeric"
            />
          </div>

          <div v-else class="field">
            <span class="field-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
            </span>
            <input
              type="text"
              class="input"
              v-model.trim="backupCode"
              placeholder="Code de secours"
            />
          </div>

          <button type="button" class="toggle-backup" @click="showBackup = !showBackup">
            {{ showBackup ? '← Utiliser l\'authenticator' : 'Utiliser un code de secours' }}
          </button>
        </template>

        <!-- Erreur -->
        <div v-if="error" class="error-msg">{{ error }}</div>

        <!-- Submit -->
        <button class="submit-btn" type="submit" :disabled="loading">
          <span v-if="loading" class="spinner-sm"></span>
          {{ loading ? 'Connexion…' : needs2FA ? 'Vérifier' : 'Se connecter' }}
        </button>

        <!-- Divider -->
        <p class="divider-text">ou se connecter avec</p>

        <!-- Google -->
        <button type="button" class="google-btn" @click="loginWithGoogle">
          <svg class="google-icon" viewBox="0 0 40 40">
            <path d="M36.3425 16.7358H35V16.6667H20V23.3333H29.4192C28.045 27.2142 24.3525 30 20 30C14.4775 30 10 25.5225 10 20C10 14.4775 14.4775 9.99999 20 9.99999C22.5492 9.99999 24.8683 10.9617 26.6342 12.5325L31.3483 7.81833C28.3717 5.04416 24.39 3.33333 20 3.33333C10.7958 3.33333 3.33335 10.7958 3.33335 20C3.33335 29.2042 10.7958 36.6667 20 36.6667C29.2042 36.6667 36.6667 29.2042 36.6667 20C36.6667 18.8825 36.5517 17.7917 36.3425 16.7358Z" fill="#FFC107"/>
            <path d="M5.25497 12.2425L10.7308 16.2583C12.2125 12.59 15.8008 9.99999 20 9.99999C22.5491 9.99999 24.8683 10.9617 26.6341 12.5325L31.3483 7.81833C28.3716 5.04416 24.39 3.33333 20 3.33333C13.5983 3.33333 8.04663 6.94749 5.25497 12.2425Z" fill="#FF3D00"/>
            <path d="M20 36.6667C24.305 36.6667 28.2167 35.0192 31.1742 32.34L26.0159 27.975C24.3425 29.2425 22.2625 30 20 30C15.665 30 11.9842 27.2359 10.5975 23.3784L5.16254 27.5659C7.92087 32.9634 13.5225 36.6667 20 36.6667Z" fill="#4CAF50"/>
            <path d="M36.3425 16.7358H35V16.6667H20V23.3333H29.4192C28.7592 25.1975 27.56 26.805 26.0133 27.9758C26.0142 27.975 26.015 27.975 26.0158 27.9742L31.1742 32.3392C30.8092 32.6708 36.6667 28.3333 36.6667 20C36.6667 18.8825 36.5517 17.7917 36.3425 16.7358Z" fill="#1976D2"/>
          </svg>
          <span>Se connecter avec Google</span>
        </button>

        <!-- Footer -->
        <div class="footer-links">
          <router-link class="foot-link" to="/forgot-password" @click="emitClose">Mot de passe oublié ?</router-link>
          <router-link class="foot-link" to="/register" @click="emitClose">Pas encore de compte ? S'inscrire</router-link>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'success', 'error'])
const router = useRouter()

const email      = ref('')
const password   = ref('')
const totpCode   = ref('')
const backupCode = ref('')
const loading    = ref(false)
const error      = ref('')
const ready      = ref(false)
const needs2FA   = ref(false)
const showBackup = ref(false)

const API_URL = (['localhost','127.0.0.1'].includes(window.location.hostname)
  ? '/api'
  : ((import.meta?.env?.VITE_API_URL) || (process?.env?.VUE_APP_API_URL) || '/api'))

watch(() => props.open, async (v) => {
  if (v) {
    email.value = ''; password.value = ''; totpCode.value = ''; backupCode.value = ''
    error.value = ''; needs2FA.value = false; showBackup.value = false; ready.value = false
    await nextTick()
    requestAnimationFrame(() => { ready.value = true })
  } else {
    ready.value = false
  }
})

function emitClose() { if (!loading.value) emit('close') }

function loginWithGoogle() {
  // Redirect to backend Google OAuth handler
  window.location.href = '/api/auth/google'
}

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    const payload = { email: email.value, password: password.value }
    if (needs2FA.value) {
      if (backupCode.value) payload.backupCode = backupCode.value
      else payload.totpCode = totpCode.value
    }
    const { data } = await axios.post(`${API_URL}/auth/login`, payload)
    if (data.requires2FA) { needs2FA.value = true; loading.value = false; return }
    if (data.ok) {
      emit('success', data)
      emit('close')
      router.push({ name: 'dashboard' })
    }
  } catch (e) {
    const detail = e?.response?.data?.error || e?.message
    error.value = {
      invalid_credentials: 'Email ou mot de passe incorrect',
      invalid_totp:        'Code authenticator invalide',
      invalid_backup_code: 'Code de secours invalide',
      rate_limited:        'Trop de tentatives. Réessayez plus tard.',
    }[detail] || 'Erreur de connexion'
    emit('error', e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── Overlay ───────────────────────────────────────────────── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

/* ── Modal card ────────────────────────────────────────────── */
.modal {
  background: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  padding: 40px 36px 32px;
  position: relative;
  opacity: 0;
  transform: translateY(20px) scale(0.97);
  transition: opacity .35s cubic-bezier(.22,1,.36,1), transform .35s cubic-bezier(.22,1,.36,1);
  box-shadow: 0 24px 60px rgba(0,0,0,0.18);
}
.modal.is-open {
  opacity: 1;
  transform: none;
}

/* ── Close ─────────────────────────────────────────────────── */
.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f1f5f9;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  cursor: pointer;
  transition: background .2s;
}
.close-btn:hover { background: #e2e8f0; color: #0f172a; }

/* ── Header ────────────────────────────────────────────────── */
.form-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: 28px;
}
.logo-ring {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}
.title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}
.subtitle {
  font-size: 0.88rem;
  color: #94a3b8;
  margin: 0;
}

/* ── Form ──────────────────────────────────────────────────── */
.form { display: flex; flex-direction: column; gap: 14px; }

.field {
  position: relative;
  display: flex;
  align-items: center;
}
.field-icon {
  position: absolute;
  left: 0;
  display: flex;
  align-items: center;
  padding: 0 14px;
  color: #94a3b8;
  pointer-events: none;
}
.input {
  display: block;
  width: 100%;
  padding: 13px 14px 13px 46px;
  font-size: 0.95rem;
  color: #374151;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
  box-sizing: border-box;
}
.input::placeholder { color: #cbd5e1; }
.input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

/* ── 2FA ───────────────────────────────────────────────────── */
.totp-hint { font-size: 0.86rem; color: #64748b; margin: 0; }
.toggle-backup {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0;
  text-align: left;
}
.toggle-backup:hover { text-decoration: underline; }

/* ── Error ─────────────────────────────────────────────────── */
.error-msg {
  font-size: 0.875rem;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: 8px;
  padding: 10px 14px;
}

/* ── Submit ────────────────────────────────────────────────── */
.submit-btn {
  width: 100%;
  padding: 13px;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #ffffff;
  background: #3b82f6;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background .2s, box-shadow .2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.submit-btn:hover:not(:disabled) {
  background: #2563eb;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
}
.submit-btn:disabled { opacity: .65; cursor: not-allowed; }

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Divider ───────────────────────────────────────────────── */
.divider-text {
  text-align: center;
  font-size: 0.87rem;
  color: #94a3b8;
  margin: 0;
  position: relative;
}
.divider-text::before,
.divider-text::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 30%;
  height: 1px;
  background: #e2e8f0;
}
.divider-text::before { left: 0; }
.divider-text::after  { right: 0; }

/* ── Google ────────────────────────────────────────────────── */
.google-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  font-size: 0.93rem;
  font-weight: 500;
  color: #374151;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: background .2s, border-color .2s;
}
.google-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
.google-icon { width: 22px; height: 22px; }

/* ── Footer links ──────────────────────────────────────────── */
.footer-links {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.foot-link {
  font-size: 0.85rem;
  color: #3b82f6;
  text-decoration: none;
}
.foot-link:hover { text-decoration: underline; }
</style>
