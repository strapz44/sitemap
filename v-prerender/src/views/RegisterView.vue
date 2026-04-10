<template>
  <div class="auth-page">
    <div class="container">
      <form class="form" @submit.prevent="onSubmit">

        <!-- Logo + Titre -->
        <div class="logo-ring">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
          </svg>
        </div>

        <h1 class="title">Créer un compte</h1>

        <!-- Nom -->
        <div class="field">
          <span class="field-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </span>
          <input
            type="text"
            class="input"
            v-model.trim="name"
            placeholder="Votre nom"
            autocomplete="name"
          />
        </div>

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
            placeholder="Mot de passe (min. 8 car.)"
            required
            autocomplete="new-password"
          />
        </div>

        <!-- Barre de force -->
        <div v-if="password" class="strength-wrap">
          <div class="strength-track">
            <div class="strength-bar" :style="{ width: strengthPct + '%', background: strengthColor }"></div>
          </div>
          <span class="strength-label" :style="{ color: strengthColor }">{{ strengthLabel }}</span>
        </div>

        <!-- Erreur -->
        <div v-if="error" class="error-msg">{{ error }}</div>

        <!-- Submit -->
        <button class="submit-btn" type="submit" :disabled="loading">
          <span v-if="loading" class="spinner-sm"></span>
          {{ loading ? 'Création…' : 'Créer le compte' }}
        </button>

        <!-- Divider -->
        <p class="divider-text">ou s'inscrire avec</p>

        <!-- Google -->
        <button type="button" class="google-btn" @click="loginWithGoogle">
          <svg class="google-icon" viewBox="0 0 40 40">
            <path d="M36.3425 16.7358H35V16.6667H20V23.3333H29.4192C28.045 27.2142 24.3525 30 20 30C14.4775 30 10 25.5225 10 20C10 14.4775 14.4775 9.99999 20 9.99999C22.5492 9.99999 24.8683 10.9617 26.6342 12.5325L31.3483 7.81833C28.3717 5.04416 24.39 3.33333 20 3.33333C10.7958 3.33333 3.33335 10.7958 3.33335 20C3.33335 29.2042 10.7958 36.6667 20 36.6667C29.2042 36.6667 36.6667 29.2042 36.6667 20C36.6667 18.8825 36.5517 17.7917 36.3425 16.7358Z" fill="#FFC107"/>
            <path d="M5.25497 12.2425L10.7308 16.2583C12.2125 12.59 15.8008 9.99999 20 9.99999C22.5491 9.99999 24.8683 10.9617 26.6341 12.5325L31.3483 7.81833C28.3716 5.04416 24.39 3.33333 20 3.33333C13.5983 3.33333 8.04663 6.94749 5.25497 12.2425Z" fill="#FF3D00"/>
            <path d="M20 36.6667C24.305 36.6667 28.2167 35.0192 31.1742 32.34L26.0159 27.975C24.3425 29.2425 22.2625 30 20 30C15.665 30 11.9842 27.2359 10.5975 23.3784L5.16254 27.5659C7.92087 32.9634 13.5225 36.6667 20 36.6667Z" fill="#4CAF50"/>
            <path d="M36.3425 16.7358H35V16.6667H20V23.3333H29.4192C28.7592 25.1975 27.56 26.805 26.0133 27.9758C26.0142 27.975 26.015 27.975 26.0158 27.9742L31.1742 32.3392C30.8092 32.6708 36.6667 28.3333 36.6667 20C36.6667 18.8825 36.5517 17.7917 36.3425 16.7358Z" fill="#1976D2"/>
          </svg>
          <span>S'inscrire avec Google</span>
        </button>

        <!-- Lien connexion -->
        <p class="signin-link">
          Déjà un compte ?
          <router-link to="/login" class="foot-link">Se connecter</router-link>
        </p>

      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { register } = useAuth()

const name     = ref('')
const email    = ref('')
const password = ref('')
const loading  = ref(false)
const error    = ref('')

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
const strengthPct   = computed(() => strength.value * 20)
const strengthColor = computed(() =>
  ['#ef4444','#f97316','#eab308','#22c55e','#10b981'][Math.max(0, strength.value - 1)] || '#ef4444'
)
const strengthLabel = computed(() =>
  ['Très faible','Faible','Moyen','Fort','Très fort'][Math.max(0, strength.value - 1)] || 'Très faible'
)

function loginWithGoogle() {
  window.location.href = '/api/auth/google'
}

async function onSubmit() {
  error.value = ''
  if (password.value.length < 8 || !/[A-Z]/.test(password.value) || !/[a-z]/.test(password.value) || !/[0-9]/.test(password.value)) {
    error.value = 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre'
    return
  }
  loading.value = true
  try {
    const data = await register({ name: name.value, email: email.value, password: password.value })
    if (data.ok) router.push('/dashboard')
  } catch (e) {
    const detail = e?.response?.data?.error || e?.message
    error.value = {
      email_taken:   'Un compte existe déjà avec cet email',
      invalid_email: 'Adresse email invalide',
      weak_password: e?.response?.data?.message || 'Mot de passe trop faible',
      rate_limited:  'Trop de tentatives. Réessayez plus tard.',
    }[detail] || 'Erreur lors de la création du compte'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  padding: 24px;
}

.container {
  width: 100%;
  max-width: 420px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Logo ──────────────────────────────────────────────────── */
.logo-ring {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}

.title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px;
  text-transform: capitalize;
}

/* ── Fields ────────────────────────────────────────────────── */
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

/* ── Strength ──────────────────────────────────────────────── */
.strength-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: -6px;
}
.strength-track {
  flex: 1;
  height: 4px;
  background: #f1f5f9;
  border-radius: 2px;
  overflow: hidden;
}
.strength-bar {
  height: 100%;
  border-radius: 2px;
  transition: width .3s, background .3s;
}
.strength-label {
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

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

/* ── Footer ────────────────────────────────────────────────── */
.signin-link {
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}
.foot-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}
.foot-link:hover { text-decoration: underline; }
</style>
