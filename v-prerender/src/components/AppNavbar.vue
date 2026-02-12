<template>
<nav class="navbar">
  <GlassSurface
    :borderRadius="24"
    :borderWidth="0.07"
    :brightness="50"
    :opacity="0.9"
    :blur="8"
    :displace="0.5"
    :backgroundOpacity="0.2"
    :saturation="1"
    :distortionScale="-60"
    :redOffset="0"
    :greenOffset="10"
    :blueOffset="20"
    xChannel="R"
    yChannel="G"
    mixBlendMode="normal"
    rootClass="card-nav premium-glass"
  >
  <div class="nav-container">
    <div class="links" ref="linksEl" @mouseleave="positionActive()">
      <a href="#" ref="homeRef" :class="['nav-link','tab', { active: route.name === 'dashboard' }]" @mouseenter="(e) => positionIndicator(e.currentTarget)" @click.prevent="go('dashboard')">Dashboard</a>
      <a href="#" ref="sitemapsRef" :class="['nav-link','tab', { active: isSitemapsRoute }]" @mouseenter="(e) => positionIndicator(e.currentTarget)" @click.prevent="go('home')">Sitemaps</a>
      <a href="#" ref="analyticsRef" :class="['nav-link','tab', { active: route.name === 'analytics' }]" @mouseenter="(e) => positionIndicator(e.currentTarget)" @click.prevent="go('analytics')">Analytics</a>
      <span class="indicator" ref="indicatorRef"></span>
    </div>
    <div class="right-actions">
      <button class="login-btn" @click="go('login')">Connexion</button>
      <button class="menu-btn" :aria-expanded="isOpen.toString()" aria-label="Ouvrir le menu" @click="toggle">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>
  </GlassSurface>

  <div class="menu-panel" :class="{ open: isOpen }">
    <a href="#" class="panel-link" @click.prevent="go('dashboard')">Dashboard</a>
    <a href="#" class="panel-link" @click.prevent="go('home')">Sitemaps</a>
    <a href="#" class="panel-link" @click.prevent="go('analytics')">Analytics</a>
  </div>
</nav>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch, computed } from 'vue'
import gsap from 'gsap'
import { useRoute, useRouter } from 'vue-router'
import GlassSurface from './vendor/GlassSurface.vue'
const route = useRoute()
const router = useRouter()
const isOpen = ref(false)
function toggle(){ isOpen.value = !isOpen.value }
const linksEl = ref(null)
const homeRef = ref(null)
const sitemapsRef = ref(null)
const analyticsRef = ref(null)
const indicatorRef = ref(null)
const activeElRef = ref(null)
const isSitemapsRoute = computed(() => route.name === 'home' || route.name === 'sitemap-details')
function go(name){ router.push({ name }) }
function positionIndicator(el){
  const c = linksEl.value, i = indicatorRef.value
  if(!el || !c || !i) return
  const r = el.getBoundingClientRect()
  const pr = c.getBoundingClientRect()
  const left = r.left - pr.left
  gsap.to(i, { duration: 0.25, width: r.width, x: left, opacity: 1, ease: 'power2.out' })
}
function updateActiveByRoute(){
  let el = null
  const n = route.name
  if (n === 'dashboard') el = homeRef.value
  else if (n === 'analytics') el = analyticsRef.value
  else el = sitemapsRef.value
  activeElRef.value = el
  positionIndicator(el)
}
function positionActive(){ if (activeElRef.value) positionIndicator(activeElRef.value) }
function onResize(){ positionActive() }
onMounted(() => { nextTick(updateActiveByRoute); window.addEventListener('resize', onResize) })
watch(() => route.name, () => nextTick(updateActiveByRoute))
onBeforeUnmount(() => { window.removeEventListener('resize', onResize) })
</script>

<style scoped>
.navbar {
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 50;
  font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  letter-spacing: 0.2px;
  height: 48px;
}

.navbar::before {
  content: '';
  position: absolute;
  inset: -40px -20px;
  border-radius: 999px;
  background:
    radial-gradient(38% 42% at 18% 48%, rgba(139, 92, 246, 0.55) 0%, rgba(139, 92, 246, 0.18) 40%, transparent 70%),
    radial-gradient(40% 38% at 62% 52%, rgba(56, 189, 248, 0.50) 0%, rgba(56, 189, 248, 0.16) 42%, transparent 70%),
    radial-gradient(26% 30% at 84% 46%, rgba(236, 72, 153, 0.40) 0%, rgba(236, 72, 153, 0.10) 45%, transparent 70%);
  filter: blur(36px) saturate(1.15);
  opacity: 0.85;
  pointer-events: none;
  z-index: 0;
  animation: aurora-shift 22s ease-in-out infinite alternate;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  height: 48px;
}

.card-nav {
  --radius: 16px;
  border-radius: 16px;
  padding: 0.4rem 0.6rem;
  position: relative;
  overflow: visible;
}
.card-nav { width: clamp(560px, 68vw, 820px); margin: 0 auto; display: block; }
.card-nav { position: relative; z-index: 1; }
.card-nav:not(.glass-surface) {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.42));
  backdrop-filter: saturate(180%) blur(18px);
  -webkit-backdrop-filter: saturate(180%) blur(18px);
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 16px 36px rgba(2, 6, 23, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
:deep(.card-nav.glass-surface) { overflow: hidden; color-scheme: light; }
.nav-link { color: #e5e7eb; }
.nav-link.active, .nav-link:hover { color: #ffffff; }
:deep(.card-nav.glass-surface) { height: 48px; min-height: 48px; }
.card-nav :deep(.glass-surface__content) { display: grid; align-items: center; padding: 0.4rem 0.6rem; border-radius: inherit; height: 48px; min-height: 48px; }

.card-nav:not(.glass-surface)::before { 
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(120% 80% at 20% 40%, rgba(0,0,0,0.06), transparent 60%),
              radial-gradient(120% 80% at 80% 60%, rgba(0,0,0,0.05), transparent 60%);
  mix-blend-mode: soft-light;
  pointer-events: none;
  background-size: 200% 100%;
  animation: texture-flow 18s ease-in-out infinite;
}

.premium-glass::before { content: none; }

@keyframes navborder {
  0% { }
  100% { }
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

@keyframes aurora-shift {
  0% { transform: translate3d(-2%, -1%, 0) scale(1.02); }
  50% { transform: translate3d(2%, 2%, 0) scale(1.03); }
  100% { transform: translate3d(-1%, 1%, 0) scale(1.02); }
}

.nav-link {
  color: #64748b;
  text-decoration: none;
  font-size: 0.86rem;
  font-weight: 600;
  transition: color 0.2s ease, background-color 0.2s ease;
  padding: 0.28rem 0.56rem;
  border-radius: 8px;
  position: relative;
  overflow: visible;
  letter-spacing: 0.2px;
}

.nav-link:hover {
  color: var(--accent);
  text-shadow: none;
  transform: none;
  box-shadow: none;
}

/* Tabs (Figma-like) */
.nav-link.tab { border-radius: 6px; padding-bottom: 0.35rem; }
.nav-link.tab.active { color: var(--accent); }
.links { display: flex; gap: 1rem; align-items: center; justify-self: center; position: relative; }
.indicator { position: absolute; left: 0; bottom: -4px; height: 2px; width: 0; background: var(--accent); border-radius: 999px; opacity: 0; will-change: transform, width, opacity; }

.menu-btn {
  justify-self: end;
  background: rgba(255,255,255,0.10) !important;
  background-color: rgba(255,255,255,0.10) !important;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 10px;
  padding: 0.3rem 0.55rem;
  cursor: pointer;
  backdrop-filter: saturate(160%) blur(8px);
  -webkit-backdrop-filter: saturate(160%) blur(8px);
  transition: background-color .2s ease, border-color .2s ease;
  color: #e5e7eb;
}
.menu-btn:hover {
  border-color: var(--accent-border);
  background: rgba(255,255,255,0.14) !important;
}

.right-actions { display: flex; gap: 8px; align-items: center; justify-self: end; }
.login-btn {
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.18);
  color: #e5e7eb;
  border-radius: 12px;
  padding: 0.4rem 0.8rem;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: saturate(160%) blur(8px);
  -webkit-backdrop-filter: saturate(160%) blur(8px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
}
.login-btn:hover { background: rgba(255,255,255,0.14); border-color: var(--accent-border); color: #fff; }

/* Responsive panel (CardNav style) */
.menu-panel {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 10px);
  margin: 0 auto;
  max-width: 1200px;
  padding: 0.75rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: saturate(160%) blur(16px);
  -webkit-backdrop-filter: saturate(160%) blur(16px);
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 12px 28px rgba(2,6,23,0.12), inset 0 1px 0 rgba(255,255,255,0.25);
  display: grid;
  gap: 0.6rem;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-12px) scale(.98);
  transform-origin: top right;
  transition: transform .35s ease, opacity .25s ease, visibility 0s linear .25s;
}
.menu-panel.open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0) scale(1);
  transition: transform .35s ease, opacity .25s ease;
}

.panel-link {
  color: #0f172a;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  transition: background-color .2s ease, color .2s ease;
}
.panel-link:hover {
  transform: none;
  background: #f1f5f9;
  box-shadow: none;
}

/* Reflow rules */
@media (max-width: 900px) {
  .nav-container { grid-template-columns: auto 1fr auto; }
  .nav-link.center { display: none; }
}
@media (min-width: 901px) {
  .menu-panel { display: none; }
}

.nav-link::after { content: none; }

.nav-link:hover::after { transform: none; }

.nav-link.home {
  justify-self: start;
}

.nav-link.center {
  justify-self: center;
  grid-column: 2;
}
</style>