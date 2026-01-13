<template>
  <nav class="dock" role="navigation" aria-label="Dock">
    <ul class="dock-list" @mouseleave="hoverIdx = -1">
      <li v-for="(it, i) in items" :key="it.name" class="dock-item">
        <a href="#" class="dock-btn"
           :class="{ active: route.name === it.to }"
           @mouseenter="hoverIdx = i"
           @focus="hoverIdx = i"
           @click.prevent="go(it.to)"
           :aria-label="it.label">
          <span class="icon" v-html="it.icon"></span>
        </a>
        <span v-if="hoverIdx === i" class="tooltip">{{ it.label }}</span>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const hoverIdx = ref(-1)
function go(name){ router.push({ name }) }

// Inline SVG icons (stroke currentColor, 24x24)
const items = [
  {
    name: 'home',
    label: 'Sitemaps',
    to: 'home',
    icon: `<svg viewBox='0 0 24 24' width='22' height='22' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M3 11l9-7 9 7'/><path d='M9 22V12h6v10'/></svg>`
  },
  {
    name: 'dashboard',
    label: 'Dashboard',
    to: 'dashboard',
    icon: `<svg viewBox='0 0 24 24' width='22' height='22' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='7' height='7' rx='1.5'/><rect x='14' y='3' width='7' height='7' rx='1.5'/><rect x='14' y='14' width='7' height='7' rx='1.5'/><rect x='3' y='14' width='7' height='7' rx='1.5'/></svg>`
  },
  {
    name: 'analytics',
    label: 'Analytics',
    to: 'analytics',
    icon: `<svg viewBox='0 0 24 24' width='22' height='22' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M3 12l4 4 5-5 5 4 4-7'/><path d='M21 21H3'/></svg>`
  },
  {
    name: 'settings',
    label: 'Réglages',
    to: 'home',
    icon: `<svg viewBox='0 0 24 24' width='22' height='22' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z'/><path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.05.05a2 2 0 0 1-2.83 2.83l-.05-.05a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.07a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.07a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 9.93 3H10a2 2 0 0 1 4 0v.07a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 21 10h.07a2 2 0 0 1 0 4H21a1.65 1.65 0 0 0-1.6 1.5Z'/></svg>`
  }
]
</script>

<style scoped>
.dock {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 40;
}
.dock-list {
  display: flex;
  gap: 10px;
  padding: 8px;
  background: rgba(255,255,255,0.9);
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(2,6,23,0.08);
}
.dock-item { position: relative; }
.dock-btn {
  width: 44px; height: 44px;
  display: grid; place-items: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #64748b;
  transition: transform .15s ease, border-color .2s ease, color .2s ease, background-color .2s ease;
}
.dock-btn:hover { transform: translateY(-3px); color: #8b5cf6; border-color: #c7b9fb; }
.dock-btn.active { color: #8b5cf6; border-color: #8b5cf6; background: #faf7ff; }
.icon svg { display: block; }
.tooltip {
  position: absolute; left: 50%; bottom: 58px; transform: translateX(-50%);
  background: #0f172a; color: #fff; font-size: 11px; padding: 4px 7px; border-radius: 6px;
  border: 1px solid rgba(148,163,184,0.2);
  white-space: nowrap; pointer-events: none;
}
</style>
