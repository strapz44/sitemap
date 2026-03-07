<template>
  <!-- using the CardNav design from React Bits as the base for our navbar -->
  <CardNav
    :items="menuItems"
    className="premium-glass glass-surface glass-surface--fallback"
    baseColor="transparent"
    menuColor="#ffffff"
    buttonBgColor="#111111"
    buttonTextColor="#ffffff"
    ease="power3.out"
    @cta="go('dashboard')"
  >
    <!-- allow overriding CTA text if needed -->
    <template #cta>Connexion</template>
  </CardNav>
</template>

<script setup>
import { useRouter } from 'vue-router'
import CardNav from './CardNav.vue'

const router = useRouter()

function go(name) {
  router.push({ name })
}

// build the three primary cards used by the navigation
// each card contains a list of links which execute router pushes
const menuItems = [
  {
    label: 'Dashboard',
    bgColor: 'rgba(255,255,255,0.15)',
    textColor: '#111',
    links: [
      {
        label: 'Voir',
        href: '#',
        ariaLabel: 'Aller au tableau de bord',
        onClick: () => go('dashboard')
      }
    ]
  },
  {
    label: 'Sitemaps',
    bgColor: 'rgba(255,255,255,0.15)',
    textColor: '#111',
    links: [
      {
        label: 'Explorer',
        href: '#',
        ariaLabel: 'Parcourir les sitemaps',
        onClick: () => go('home')
      }
    ]
  },
  {
    label: 'Analytics',
    bgColor: 'rgba(255,255,255,0.15)',
    textColor: '#111',
    links: [
      {
        label: 'Consulter',
        href: '#',
        ariaLabel: 'Voir les statistiques',
        onClick: () => go('analytics')
      }
    ]
  }
]
</script>

<style scoped>
.navbar {
  background: #ffffff;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 50;
  font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  letter-spacing: 0.2px;
  height: 44px;
  border-bottom: 1px solid #e5e7eb;
}

.navbar::before { content: none; }

.nav-container {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  height: 44px;
}

.card-nav {
  --radius: 16px;
  border-radius: 16px;
  padding: 0.4rem 0.6rem;
  position: relative;
  overflow: visible;
}
.card-nav { width: clamp(520px, 62vw, 780px); margin: 0 auto; display: block; }
.card-nav { position: relative; z-index: 1; }
.card-nav:not(.glass-surface) {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.42));
  backdrop-filter: saturate(180%) blur(18px);
  -webkit-backdrop-filter: saturate(180%) blur(18px);
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 16px 36px rgba(2, 6, 23, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
:deep(.card-nav.glass-surface) { overflow: hidden; color-scheme: light; }
.nav-link { color: #334155; }
.nav-link.active, .nav-link:hover { color: var(--accent); }
:deep(.card-nav.glass-surface) { height: 48px; min-height: 48px; }
.card-nav :deep(.glass-surface__content) { display: grid; align-items: center; padding: 0.4rem 0.6rem; border-radius: inherit; height: 48px; min-height: 48px; }

.card-nav:not(.glass-surface)::before { content: none; }

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
  background: #ffffff !important;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.3rem 0.55rem;
  cursor: pointer;
  transition: background-color .2s ease, border-color .2s ease;
  color: #334155;
}
.menu-btn:hover {
  border-color: var(--accent-border);
  background: rgba(255,255,255,0.14) !important;
}

.right-actions { display: flex; gap: 8px; align-items: center; justify-self: end; }
.login-btn {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #334155;
  border-radius: 10px;
  padding: 0.35rem 0.75rem;
  font-weight: 600;
  cursor: pointer;
}
.login-btn:hover { background: #f8fafc; border-color: var(--accent-border); color: #0f172a; }

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
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 12px 28px rgba(2,6,23,0.08);
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