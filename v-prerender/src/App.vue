<template>
  <div id="app" class="theme-violet">
    <AppNavbar @open-login="loginOpen = true" />
    <LoginPanel :open="loginOpen" @close="loginOpen = false" />
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <AppDock />
  </div>
</template>

<script setup>
import AppNavbar from './components/AppNavbar.vue'
import AppDock from './components/AppDock.vue'
import LoginPanel from './components/LoginPanel.vue'
import { ref } from 'vue'
const loginOpen = ref(false)
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Orbitron:wght@600&display=swap');
@import url('./assets/styles/tailwind.css');
@import url('./assets/styles/theme-glass-v1.css');
@import url('./assets/styles/figma-tokens.css');
@import url('./assets/styles/glowing-effect.css');

/* CSS Houdini @property must be global — does not work inside scoped styles */
@property --glow-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@property --noise-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

body {
  font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  margin: 0;
  background: #f8fafc;
  color: #0f172a;
}

html, body, #app {
  background: #f8fafc;
}

/* ── Page route transitions ──────────────── */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

main {
  padding: 2rem;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 12px;
  background-color: transparent;
}

th, td {
  text-align: left;
  padding: 16px;
  background-color: rgba(255,255,255,0.6);
  color: #1e293b;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 8px;
}

th {
  background: rgba(241,245,249,0.9);
  font-size: 0.85rem;
  letter-spacing: 0.03rem;
  text-transform: uppercase;
  font-weight: 600;
  color: #475569;
}

tr:hover td {
  background-color: rgba(248,250,252,0.9);
}

button:not(.btn-add):not(.action-btn):not(.delete-btn):not(.menu-btn) {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
}

</style>
