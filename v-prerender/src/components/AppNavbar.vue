<template>
<nav class="navbar">
  <div class="nav-container card-nav">
    <div class="links" ref="linksEl" @mouseleave="positionActive()">
      <a href="#" ref="homeRef" :class="['nav-link','tab', { active: route.name === 'dashboard' }]" @mouseenter="(e) => positionIndicator(e.currentTarget)" @click.prevent="go('dashboard')">Dashboard</a>
      <a href="#" ref="sitemapsRef" :class="['nav-link','tab', { active: isSitemapsRoute }]" @mouseenter="(e) => positionIndicator(e.currentTarget)" @click.prevent="go('home')">Sitemaps</a>
      <a href="#" ref="analyticsRef" :class="['nav-link','tab', { active: route.name === 'analytics' }]" @mouseenter="(e) => positionIndicator(e.currentTarget)" @click.prevent="go('analytics')">Analytics</a>
      <span class="indicator" ref="indicatorRef"></span>
    </div>
    <div class="right-actions">
      <button class="login-btn" @click="emit('open-login')">Connexion</button>
      <button class="menu-btn" :aria-expanded="isOpen.toString()" aria-label="Ouvrir le menu" @click="toggle">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>

  <div class="menu-panel" :class="{ open: isOpen }">
    <a href="#" class="panel-link" @click.prevent="go('dashboard')">Dashboard</a>
    <a href="#" class="panel-link" @click.prevent="go('home')">Sitemaps</a>
    <a href="#" class="panel-link" @click.prevent="go('analytics')">Analytics</a>
  </div>
</nav>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()
const emit = defineEmits(['open-login'])
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
  i.style.width = r.width + 'px'
  i.style.transform = `translateX(${left}px)`
  i.style.opacity = '1'
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
  background: linear-gradient(to bottom, rgba(248, 250, 252, 0.7), rgba(248, 250, 252, 0));
  backdrop-filter: saturate(120%) blur(10px);
  -webkit-backdrop-filter: saturate(120%) blur(10px);
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 50;
  font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  letter-spacing: 0.2px;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 2rem;
}

.card-nav {
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.25));
  backdrop-filter: saturate(160%) blur(14px);
  -webkit-backdrop-filter: saturate(160%) blur(14px);
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 8px 24px rgba(2, 6, 23, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  padding: 0.6rem 1rem;
  position: relative;
  overflow: visible;
}

.card-nav::before { content: none; }

@keyframes navborder {
  0% { }
  100% { }
}

.nav-link {
  color: #64748b;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  transition: color 0.2s ease, background-color 0.2s ease;
  padding: 0.4rem 0.8rem;
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
.indicator { position: absolute; left: 0; bottom: -6px; height: 2px; width: 0; background: var(--accent); border-radius: 999px; opacity: 0; transition: transform .18s ease, width .18s ease, opacity .18s ease; }

.menu-btn {
  justify-self: end;
  background: rgba(255, 255, 255, 0.6) !important;
  background-color: rgba(255, 255, 255, 0.6) !important;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  backdrop-filter: saturate(160%) blur(10px);
  -webkit-backdrop-filter: saturate(160%) blur(10px);
  transition: background-color .2s ease, border-color .2s ease;
  color: var(--accent);
}
.menu-btn:hover {
  border-color: var(--accent);
  box-shadow: none;
}

.right-actions { display: flex; gap: 8px; align-items: center; justify-self: end; }
.login-btn {
  background: #ffffff;
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 8px;
  padding: 0.4rem 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.login-btn:hover { background: var(--accent-hover-bg); }

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