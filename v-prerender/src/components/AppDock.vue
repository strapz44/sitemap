<template>
  <nav class="dock" role="navigation" aria-label="Dock">
    <GlassSurface
      rootClass="dock-list premium-glass"
      :borderRadius="16"
      :borderWidth="0.07"
      :brightness="40"
      :opacity="0.75"
      :blur="14"
      :displace="0.8"
      :backgroundOpacity="0.06"
      :saturation="1.2"
      :distortionScale="-120"
      :redOffset="0"
      :greenOffset="12"
      :blueOffset="24"
      xChannel="R"
      yChannel="G"
      mixBlendMode="normal"
    >
    <ul class="dock-items" @mouseleave="hoverIdx = -1">
      <li v-for="(it, i) in items" :key="it.name" class="dock-item">
        <a href="#" class="dock-btn"
           :class="{ active: route.name === it.to }"
           @mouseenter="hoverIdx = i"
           @focus="hoverIdx = i"
           @click.prevent="go(it.to)"
           :aria-label="it.label">
          <span class="glow" :class="'tone-' + (it.tone || 'violet')"></span>
          <span class="icon" v-html="it.icon"></span>
        </a>
        <span v-if="hoverIdx === i" class="tooltip">{{ it.label }}</span>
      </li>
    </ul>
    </GlassSurface>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GlassSurface from './vendor/GlassSurface.vue'

const route = useRoute()
const router = useRouter()
const hoverIdx = ref(-1)
function go(name){ router.push({ name }) }

// SVG icons (Heroicons solid style, 22x22)
const iconHome = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="22" height="22"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>'
const iconGrid = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="22" height="22"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>'
const iconChart = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="22" height="22"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>'
const iconCog = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="22" height="22"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>'

const items = [
  { name: 'home', label: 'Sitemaps', to: 'home', tone: 'blue', icon: iconHome },
  { name: 'dashboard', label: 'Dashboard', to: 'dashboard', tone: 'violet', icon: iconGrid },
  { name: 'analytics', label: 'Analytics', to: 'analytics', tone: 'green', icon: iconChart },
  { name: 'settings', label: 'Réglages', to: 'home', tone: 'orange', icon: iconCog }
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
.dock::before {
  content: none;
}
.dock-list {
  display: flex;
  gap: 10px;
  padding: 8px;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
}
.dock-list.glass-surface { position: relative; z-index: 1; }
.dock-list:not(.premium-glass).glass-surface--svg,
.dock-list:not(.premium-glass).glass-surface--fallback {
  background: rgba(255,255,255,0.78);
  border: 1px solid rgba(148,163,184,0.35);
  box-shadow: 0 16px 36px rgba(2,6,23,0.12), inset 0 1px 0 rgba(255,255,255,0.35);
}
.dock-list:not(.glass-surface)::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(120% 80% at 20% 40%, rgba(0,0,0,0.08), transparent 60%),
              radial-gradient(120% 80% at 80% 60%, rgba(0,0,0,0.06), transparent 60%);
  mix-blend-mode: soft-light;
  pointer-events: none;
  background-size: 200% 100%;
  animation: texture-flow 18s ease-in-out infinite;
}
.dock-list:not(.glass-surface)::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background: linear-gradient(135deg,
    rgba(255,255,255,0.55) 0%,
    rgba(255,255,255,0.22) 35%,
    rgba(255,255,255,0.10) 55%,
    rgba(255,255,255,0.0) 75%);
  mix-blend-mode: screen;
  pointer-events: none;
  background-size: 220% 100%;
  animation: sheen-slide 8s ease-in-out infinite;
  opacity: 0.9;
  will-change: background-position;
}
.dock-items { list-style: none; margin: 0; padding: 0; display: flex; gap: 10px; }
.dock-item { position: relative; }
.dock-btn {
  position: relative;
  width: 44px; height: 44px;
  display: grid; place-items: center;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  color: #3b82f6;
  overflow: hidden;
  transition: transform .15s ease, border-color .2s ease, color .2s ease, background-color .2s ease, box-shadow .2s ease;
}
.dock-btn::before { content: none; }
.dock-btn::after { content: none; }
.dock-btn:hover { transform: translateY(-3px); color: var(--accent); border-color: var(--accent-border); box-shadow: none; background: rgba(255,255,255,0.06); }
.dock-btn.active { color: var(--accent); border-color: var(--accent-border); background: rgba(255,255,255,0.10); }
.dock-btn:focus-visible { outline: none; box-shadow: 0 0 0 4px var(--accent-ring), 0 6px 16px rgba(2,6,23,0.12); border-color: var(--accent); }
.icon svg { display: block; }
.dock-btn .glow {
  position: absolute;
  inset: -10px;
  border-radius: 14px;
  filter: blur(16px);
  opacity: 0;
  transform: translateY(6px);
  transition: opacity .25s ease, transform .25s ease;
  pointer-events: none;
}
.dock-btn:hover .glow, .dock-btn.active .glow { opacity: .35; transform: translateY(0); }
.tone-blue { background: radial-gradient(40% 40% at 30% 30%, rgba(56,189,248,0.7), transparent 60%), radial-gradient(40% 40% at 70% 70%, rgba(10,132,255,0.7), transparent 60%); }
.tone-violet { background: radial-gradient(40% 40% at 30% 30%, rgba(139,92,246,0.7), transparent 60%), radial-gradient(40% 40% at 70% 70%, rgba(98,0,234,0.6), transparent 60%); }
.tone-green { background: radial-gradient(40% 40% at 30% 30%, rgba(34,197,94,0.7), transparent 60%), radial-gradient(40% 40% at 70% 70%, rgba(16,185,129,0.6), transparent 60%); }
.tone-orange { background: radial-gradient(40% 40% at 30% 30%, rgba(251,146,60,0.7), transparent 60%), radial-gradient(40% 40% at 70% 70%, rgba(245,158,11,0.6), transparent 60%); }
.tone-red { background: radial-gradient(40% 40% at 30% 30%, rgba(244,63,94,0.7), transparent 60%), radial-gradient(40% 40% at 70% 70%, rgba(239,68,68,0.6), transparent 60%); }
.icon svg { display: block; }
.tooltip {
  position: absolute; left: 50%; bottom: 58px; transform: translateX(-50%);
  background: #0f172a; color: #fff; font-size: 11px; padding: 4px 7px; border-radius: 6px;
  border: 1px solid rgba(148,163,184,0.2);
  white-space: nowrap; pointer-events: none;
}

@keyframes sheen-slide {
  0% { background-position: -120% 0; }
  50% { background-position: 120% 0; }
  100% { background-position: -120% 0; }
}

@keyframes texture-flow {
  0% { background-position: 0% 0; }
  50% { background-position: 100% 0; }
  100% { background-position: 0% 0; }
}
</style>
