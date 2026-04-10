<template>
  <div class="globe-page">

    <!-- ── Hero: titre + globe 3D ──────────────────────────── -->
    <section class="hero-section">
      <div class="hero-content">
        <span class="badge-live">
          <span class="live-dot" />
          Temps réel
        </span>
        <h1 class="hero-title">Sites surveillés<br />
          <ShinyText><GradientText>dans le monde</GradientText></ShinyText>
        </h1>
        <p class="hero-sub">
          Visualisation géographique de vos sites indexés.<br />
          {{ statsText }}
        </p>
      </div>

      <div class="globe-container glow-card glow-card--blue glow-card-dark">
        <Globe3D :sites="sites" :size="460" :dark="true" :auto-rotate="true" />
      </div>
    </section>

    <!-- ── World Map ─────────────────────────────────────────── -->
    <section class="map-section">
      <div class="section-header">
        <h2 class="section-title">Connexions géographiques</h2>
        <p class="section-sub">Arcs de connexion entre vos sites surveillés</p>
      </div>
      <div class="map-card glow-card glow-card--subtle glow-card-light">
        <WorldMap :api-base="apiBase" arc-color="#38bdf8" dot-color="#0ea5e9" label-color="#64748b" />
      </div>
    </section>

    <!-- ── Liste des sites localisés ────────────────────────── -->
    <section class="sites-section">
      <div class="section-header">
        <h2 class="section-title">Sites localisés</h2>
        <button class="refresh-btn" @click="refreshSites" :disabled="loading">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M1 4v6h6M23 20v-6h-6"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
          Actualiser
        </button>
      </div>

      <div v-if="loading" class="sites-loading">Chargement…</div>
      <div v-else-if="sites.length === 0" class="sites-empty">
        Aucun site localisé. Ajoutez des sites dans <router-link to="/sitemaps">Sitemaps</router-link>.
      </div>

      <div v-else class="sites-grid">
        <Pin3D
          v-for="site in sites"
          :key="site.site"
        >
          <div class="site-card glow-card glow-card--subtle glow-card-light">
            <div class="site-flag">{{ countryCode(site.country) }}</div>
            <div class="site-info">
              <div class="site-domain">{{ site.domain }}</div>
              <div class="site-location">{{ site.city }}<span v-if="site.city && site.country">, </span>{{ site.country }}</div>
            </div>
            <div class="site-coords">
              <span class="coord">{{ formatCoord(site.lat, 'N', 'S') }}</span>
              <span class="coord">{{ formatCoord(site.lng, 'E', 'O') }}</span>
            </div>
            <div class="site-urls" v-if="site.urlCount > 0">
              <span class="url-badge">{{ site.urlCount }} URLs</span>
            </div>
          </div>
        </Pin3D>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import Globe3D from '../components/Globe3D.vue'
import WorldMap from '../components/WorldMap.vue'
import Pin3D from '../components/Pin3D.vue'
import GradientText from '../components/GradientText.vue'
import ShinyText from '../components/ShinyText.vue'

const apiBase = ''  // Vercel proxie /api/* automatiquement

const loading = ref(true)
const sites = ref([])

const statsText = computed(() => {
  if (loading.value) return 'Chargement…'
  if (sites.value.length === 0) return 'Aucun site localisé pour le moment.'
  const countries = [...new Set(sites.value.map(s => s.country).filter(Boolean))]
  return `${sites.value.length} site${sites.value.length > 1 ? 's' : ''} dans ${countries.length} pays`
})

async function refreshSites() {
  loading.value = true
  try {
    const { data } = await axios.get('/api/globe')
    sites.value = data.sites || []
  } catch (e) {
    console.error('[GlobeView] fetch error', e)
    sites.value = []
  } finally {
    loading.value = false
  }
}

function formatCoord(val, pos, neg) {
  if (val == null) return '—'
  const abs = Math.abs(val).toFixed(2)
  return `${abs}° ${val >= 0 ? pos : neg}`
}

// Code pays court (sans emoji)
function countryCode(country) {
  if (!country) return '—'
  const map = {
    'France': 'FR', 'United States': 'US', 'Germany': 'DE',
    'United Kingdom': 'UK', 'Spain': 'ES', 'Italy': 'IT',
    'Canada': 'CA', 'Australia': 'AU', 'Japan': 'JP',
    'China': 'CN', 'Brazil': 'BR', 'India': 'IN',
    'Netherlands': 'NL', 'Sweden': 'SE', 'Switzerland': 'CH',
    'Belgium': 'BE', 'Portugal': 'PT', 'Poland': 'PL',
    'Singapore': 'SG', 'Ireland': 'IE',
  }
  return map[country] || country.substring(0, 2).toUpperCase()
}

onMounted(refreshSites)
</script>

<style scoped>

.globe-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdfa 100%);
  padding: 88px 24px 120px;
  font-family: 'Inter', system-ui, sans-serif;
}

/* ── Hero ── */
.hero-section {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2rem;
  align-items: center;
  max-width: 1100px;
  margin: 0 auto 3rem;
}

.hero-content { display: flex; flex-direction: column; gap: 0.75rem; }

.badge-live {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0ea5e9;
  background: rgba(14, 165, 233, 0.08);
  border: 1px solid rgba(14, 165, 233, 0.2);
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  width: fit-content;
}

.live-dot {
  width: 6px; height: 6px;
  background: #22c55e;
  border-radius: 50%;
  animation: blink 1.4s ease-in-out infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

.hero-title {
  font-size: 2.4rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.15;
  margin: 0;
}
.accent { color: #0ea5e9; }

.hero-sub {
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

.globe-container {
  width: 460px;
  height: 460px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: transparent;
}

/* ── Map section ── */
.map-section {
  max-width: 1100px;
  margin: 0 auto 3rem;
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}
.section-sub {
  font-size: 0.82rem;
  color: #94a3b8;
  margin: 0;
}

.map-card {
  border-radius: 1rem;
  padding: 1.5rem;
  overflow: hidden;
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
}

/* ── Sites section ── */
.sites-section {
  max-width: 1100px;
  margin: 0 auto;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 8px;
  padding: 0.3rem 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}
.refresh-btn:hover:not(:disabled) { background: #f1f5f9; border-color: #cbd5e1; }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sites-loading, .sites-empty {
  text-align: center;
  color: #94a3b8;
  font-size: 0.9rem;
  padding: 2rem;
}
.sites-empty a { color: #0ea5e9; text-decoration: none; }
.sites-empty a:hover { text-decoration: underline; }

.sites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.site-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-radius: 0.875rem;
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: default;
}
.site-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(14,165,233,0.1); }

.site-flag {
  font-size: 0.7rem;
  font-weight: 700;
  color: #0ea5e9;
  background: rgba(14, 165, 233, 0.08);
  border: 1px solid rgba(14, 165, 233, 0.15);
  border-radius: 6px;
  padding: 4px 6px;
  flex-shrink: 0;
  letter-spacing: 0.04em;
  min-width: 28px;
  text-align: center;
}

.site-info { flex: 1; min-width: 0; }
.site-domain {
  font-size: 0.83rem;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.site-location { font-size: 0.72rem; color: #94a3b8; margin-top: 0.1rem; }

.site-coords { display: flex; flex-direction: column; gap: 0.1rem; flex-shrink: 0; }
.coord { font-size: 0.65rem; color: #cbd5e1; font-variant-numeric: tabular-nums; }

.url-badge {
  font-size: 0.65rem;
  font-weight: 600;
  color: #0ea5e9;
  background: rgba(14, 165, 233, 0.1);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  white-space: nowrap;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .hero-section {
    grid-template-columns: 1fr;
    text-align: center;
    justify-items: center;
  }
  .globe-container { width: 300px; height: 300px; }
  .hero-title { font-size: 1.8rem; }
  .badge-live { margin: 0 auto; }
}
</style>
