<template>
    <div class="app-wrapper">
      <div class="page-container">

        <!-- ── Hero section: titre + Globe ──────────────────── -->
        <section class="hero-section">
          <div class="hero-text">
            <span class="badge-live"><span class="live-dot"></span> Temps réel</span>
            <h1 class="hero-title">Vos sites<br /><span class="accent">dans le monde</span></h1>
            <p class="hero-sub">{{ statsText }}</p>
          </div>
          <div class="hero-globe">
            <Globe3D :api-base="apiBase" :size="560" :dark="true" :auto-rotate="true" />
          </div>
        </section>

        <!-- ── Ajouter un site ──────────────────────────────── -->
        <section class="add-section glow-card glow-card--subtle">
          <div class="add-inner">
            <input
              placeholder="Entrez l'URL de votre site"
              class="input"
              name="text"
              type="text"
              v-model="url"
              :disabled="isLoading"
              @keyup.enter="addSitemap"
            />
            <button class="neon-btn" :disabled="isLoading" @click="addSitemap">
              {{ isLoading ? 'Ajout…' : 'Ajouter' }}
            </button>
          </div>
          <div v-if="error" class="error-message">{{ error }}</div>
        </section>
  
        <!-- ── Liste des sitemaps ────────────────────────────── -->
        <section class="sitemap-list">
          <div class="section-header">
            <h2 class="section-title">Sites surveillés</h2>
            <span class="site-count" v-if="sitemaps.length">{{ sitemaps.length }} site{{ sitemaps.length > 1 ? 's' : '' }}</span>
          </div>
          <div class="table" ref="tableEl">
            <div class="card-list">
              <div v-for="(item, idx) in sitemaps" :key="idx" class="sitemap-card glow-card glow-card--subtle">
                <div class="card-inner">
                  <div class="card-left">
                    <div class="site-info">
                      <div class="site-topline">
                        <span class="site-name">
                          <span class="site-proto">{{ splitSite(item.siteName).proto }}</span><span class="site-domain">{{ splitSite(item.siteName).host }}</span>
                        </span>
                        <span v-if="isStale(summaryBySite[item.siteName]?.lastmodLatest)" class="badge badge-stale">Obsolète</span>
                        <span v-else class="badge badge-healthy">Sain</span>
                      </div>
                      <div class="site-meta">
                        <span class="meta-item">{{ pageCount(item) }} URLs</span>
                        <span class="dot">•</span>
                        <span class="meta-item">{{ translateChangefreq(topChangefreq(summaryBySite[item.siteName]?.changefreqCounts)) }}</span>
                        <span class="dot">•</span>
                        <span class="meta-item">MAJ: {{ formatDate(summaryBySite[item.siteName]?.lastmodLatest) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="card-center">
                    <div class="metric">
                      <div class="metric-label">Dernier scan</div>
                      <div class="metric-value">{{ formatDate(summaryBySite[item.siteName]?.lastCrawl) }}</div>
                    </div>
                  </div>
                  <div class="card-actions">
                    <button class="action-btn" @click="openSiteSummary(item)">Détails</button>
                    <button class="action-btn" :disabled="!!refreshing[item.siteName]" @click="refreshSitemap(item.siteName)">{{ refreshing[item.siteName] ? 'Analyse…' : 'Analyser' }}</button>
                    <button class="delete-btn" @click="deleteSitemap(item.siteName)">
                      <svg viewBox="0 0 448 512" class="svgIcon">
                        <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="sitemaps.length === 0" class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                <p>Aucun sitemap ajouté</p>
                <span>Entrez une URL ci-dessus pour commencer</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </template>

  <script setup>
  import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
  import gsap from 'gsap'
  import { useRouter } from 'vue-router'
  import axios from 'axios'
  import Globe3D from '../components/Globe3D.vue'
  
  
  const API_URL = (['localhost','127.0.0.1'].includes(window.location.hostname)
    ? '/api'
    : ((import.meta?.env?.VITE_API_URL) || (process?.env?.VUE_APP_API_URL) || '/api'))
  const API_BASE = ref(API_URL)
  const apiBase = ''
  
  const url = ref('')
  const sitemaps = ref([])
  const error = ref('')
  const isLoading = ref(false)
  const router = useRouter()
  const summaryBySite = ref({})
  const refreshing = ref({})

  const statsText = computed(() => {
    if (sitemaps.value.length === 0) return 'Ajoutez un site pour le voir apparaître sur le globe.'
    return `${sitemaps.value.length} site${sitemaps.value.length > 1 ? 's' : ''} surveillé${sitemaps.value.length > 1 ? 's' : ''}`
  })

  // Star-border responsive sizing
  const tableEl = ref(null)
  const tableSize = reactive({ w: 1000, h: 300 })
  let ro

  function measureTable() {
    const el = tableEl.value
    if (!el) return
    const r = el.getBoundingClientRect()
    tableSize.w = Math.max(300, Math.round(r.width))
    tableSize.h = Math.max(150, Math.round(r.height))
  }

  onMounted(() => {
    nextTick(() => {
      measureTable()
      try { ro = new ResizeObserver(measureTable); ro.observe(tableEl.value) } catch (e) { ro = null }
      window.addEventListener('resize', measureTable)
    })
  })

  onUnmounted(() => {
    try { if (ro && tableEl.value) ro.unobserve(tableEl.value); if (ro) ro.disconnect() } catch (e) { ro = null }
    window.removeEventListener('resize', measureTable)
  })

  function splitSite(site) {
    try {
      const raw = (site || '').trim()
      const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
      const u = new URL(withProto)
      return { proto: `${u.protocol}//`, host: u.host }
    } catch (e) {
      return { proto: '', host: site || '' }
    }
  }

  function pageCount(it) {
    return (it?.urls?.length) || (it?.sitemap?.urlset?.url?.length) || 0
  }

  function normalizeUrl(u) {
    const raw = (u || '').trim()
    const clean = raw.replace(/\s+/g, '')
    if (!clean) return ''
    // If protocol missing, default to https
    return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`
  }
  
  // Charger les sitemaps au démarrage
  onMounted(async () => {
    await loadSitemaps()
    await loadSummaries()
  })
  
  // Charger tous les sitemaps
  async function loadSitemaps() {
    try {
      const response = await axios.get(`${API_BASE.value}/sitemaps`)
      sitemaps.value = response.data
      await nextTick()
      try {
        const nodes = Array.from(document.querySelectorAll('.sitemap-card .glass-surface__content'))
        if (nodes.length) {
          gsap.from(nodes, { opacity: 0, y: 8, duration: 0.35, stagger: 0.05, ease: 'power2.out' })
        }
      } catch (e) { /* no-op */ }
    } catch (err) {
      const status = err?.response?.status
      const detail = err?.response?.data?.error || err?.message
      error.value = `Erreur lors du chargement des sitemaps${status ? ` (HTTP ${status})` : ''}: ${detail || 'inconnue'}`
      console.error(err)
    }
  }

  async function loadSummaries() {
    try {
      const entries = await Promise.all(
        (sitemaps.value || []).map(async (it) => {
          const site = it.siteName
          try {
            const { data } = await axios.get(`${API_BASE.value}/sitemaps/${encodeURIComponent(site)}/summary`)
            return [site, data]
          } catch (e) {
            return [site, null]
          }
        })
      )
      summaryBySite.value = Object.fromEntries(entries)
    } catch (e) {
      console.warn('Failed to load summaries', e)
    }
  }
  
  // Ajouter un nouveau sitemap
  async function addSitemap() {
    if (!url.value.trim()) return
    
    isLoading.value = true
    error.value = ''
    
    try {
      const normalized = normalizeUrl(url.value)
      await axios.post(`${API_BASE.value}/sitemaps?url=${encodeURIComponent(normalized)}`)
      await loadSitemaps()
      await loadSummaries()
      url.value = ''
    } catch (err) {
      const status = err?.response?.status
      const detail = err?.response?.data?.error || err?.message
      error.value = `Erreur lors de l'ajout du sitemap${status ? ` (HTTP ${status})` : ''}: ${detail || 'inconnue'}`
    } finally {
      isLoading.value = false
    }
  }
  
  // Rafraîchir un sitemap
  async function refreshSitemap(siteName) {
    try {
      refreshing.value = { ...refreshing.value, [siteName]: true }
      await axios.post(`${API_BASE.value}/sitemaps/${encodeURIComponent(siteName)}/refresh`)
      await loadSitemaps()
      await loadSummaries()
    } catch (err) {
      error.value = 'Erreur lors du rafraîchissement du sitemap'
    } finally {
      const next = { ...refreshing.value }
      delete next[siteName]
      refreshing.value = next
    }
  }
  
  // Supprimer un sitemap
  async function deleteSitemap(siteName) {
    if (!confirm(`Voulez-vous vraiment supprimer le sitemap pour ${siteName} ?`)) return
    
    try {
      await axios.delete(`${API_BASE.value}/sitemaps/${encodeURIComponent(siteName)}`)
      await loadSitemaps()
      await loadSummaries()
    } catch (err) {
      error.value = 'Erreur lors de la suppression du sitemap'
    }
  }
  
  // Voir les détails d'un sitemap
  function openSiteSummary(sitemap) {
    router.push({ name: 'sitemap-details', params: { siteName: sitemap.siteName } })
  }

  function formatDate(iso) {
    if (!iso) return '-'
    const d = new Date(iso)
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString()
  }

  function topChangefreq(counts) {
    if (!counts) return '-'
    let top = '-'
    let max = -1
    for (const k in counts) {
      if (counts[k] > max) { max = counts[k]; top = k }
    }
    return top
  }

  const CHANGEFREQ_LABELS = {
    always: 'toujours',
    hourly: 'horaire',
    daily: 'quotidienne',
    weekly: 'hebdomadaire',
    monthly: 'mensuelle',
    yearly: 'annuelle',
    never: 'jamais',
  }

  function translateChangefreq(val) {
    if (!val || val === '-') return '-'
    const lower = String(val).toLowerCase()
    return CHANGEFREQ_LABELS[lower] || val
  }

  function isStale(iso) {
    if (!iso) return false
    const d = new Date(iso).getTime()
    if (!d) return false
    const days = (Date.now() - d) / (1000*60*60*24)
    return days > 30
  }
  </script>
  
  <style scoped>

  .app-wrapper {
    background: #ffffff;
    min-height: 100vh;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }

  .page-container {
    padding: 88px 24px 120px;
    max-width: 1100px;
    margin: 0 auto;
  }

  /* ── Hero section ────────────────────────────────────────── */
  .hero-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 40px;
    margin-bottom: 48px;
  }

  .hero-text {
    flex: 1;
    min-width: 0;
  }

  .badge-live {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(16,185,129,0.08);
    color: #059669;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid rgba(16,185,129,0.2);
    margin-bottom: 16px;
  }

  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
    animation: pulse-dot 2s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.4); }
  }

  .hero-title {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1.15;
    color: #0f172a;
    margin: 0 0 12px;
    letter-spacing: -0.03em;
  }

  .hero-title .accent {
    background: linear-gradient(135deg, #0ea5e9, #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-sub {
    color: #64748b;
    font-size: 1rem;
    line-height: 1.5;
    margin: 0;
  }

  .hero-globe {
    flex-shrink: 0;
    width: 560px;
    height: 560px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    position: relative;
    z-index: 1;
  }

  /* ── Add section ─────────────────────────────────────────── */
  .add-section {
    margin-bottom: 32px;
    padding: 20px 24px;
    border-radius: 16px;
    background: rgba(248,250,252,0.9);
  }

  .add-inner {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .input {
    flex: 1;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 0 16px;
    background: #ffffff;
    height: 44px;
    font-size: 0.925rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .input::placeholder { color: #94a3b8; }
  .input:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
  }
  .input:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ── Neon Button ─────────────────────────────────────────── */
  .neon-btn {
    --green: #1BFD9C;
    font-size: 15px;
    padding: 0.7em 2.7em;
    letter-spacing: 0.06em;
    position: relative;
    font-family: inherit;
    border-radius: 0.6em;
    overflow: hidden;
    transition: all 0.3s;
    line-height: 1.4em;
    border: 2px solid var(--green);
    background: linear-gradient(to right, rgba(27, 253, 156, 0.1) 1%, transparent 40%, transparent 60%, rgba(27, 253, 156, 0.1) 100%);
    color: var(--green);
    box-shadow: inset 0 0 10px rgba(27, 253, 156, 0.4), 0 0 9px 3px rgba(27, 253, 156, 0.1);
    cursor: pointer;
    flex-shrink: 0;
    font-weight: 600;
    text-transform: uppercase;
  }
  .neon-btn:hover {
    color: #82ffc9;
    box-shadow: inset 0 0 10px rgba(27, 253, 156, 0.6), 0 0 9px 3px rgba(27, 253, 156, 0.2);
  }
  .neon-btn::before {
    content: "";
    position: absolute;
    left: -4em;
    width: 4em;
    height: 100%;
    top: 0;
    transition: transform .4s ease-in-out;
    background: linear-gradient(to right, transparent 1%, rgba(27, 253, 156, 0.1) 40%, rgba(27, 253, 156, 0.1) 60%, transparent 100%);
  }
  .neon-btn:hover::before {
    transform: translateX(15em);
  }
  .neon-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .error-message {
    color: #dc2626;
    margin-top: 8px;
    font-size: 0.875rem;
  }

  /* ── Section header ──────────────────────────────────────── */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .site-count {
    font-size: 0.8rem;
    color: #64748b;
    background: #f1f5f9;
    padding: 3px 10px;
    border-radius: 999px;
    font-weight: 500;
  }

  /* ── Sitemap list ────────────────────────────────────────── */
  .sitemap-list { margin-bottom: 24px; }
  .table { border: none; background: transparent; box-shadow: none; padding: 0; }
  .table::before, .table::after { content: none; }
  .card-list { display: grid; gap: 12px; }

  .sitemap-card {
    border-radius: 16px;
    background: rgba(248,250,252,0.92);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .sitemap-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  }

  .card-inner {
    display: grid;
    grid-template-columns: 1.7fr 1fr auto;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
  }

  .card-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .site-info { min-width: 0; }
  .site-topline { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .site-name { font-weight: 600; }
  .site-proto { color: #94a3b8; font-size: 0.9rem; }
  .site-domain { color: #0f172a; font-size: 0.95rem; }

  .site-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    color: #64748b;
    font-size: 0.825rem;
    margin-top: 4px;
  }
  .site-meta .dot { color: #cbd5e1; }

  .badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 0.7rem;
    font-weight: 600;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .badge-stale {
    color: #dc2626;
    background: rgba(220,38,38,0.08);
    border: 1px solid rgba(220,38,38,0.2);
  }
  .badge-healthy {
    color: #059669;
    background: rgba(16,185,129,0.08);
    border: 1px solid rgba(16,185,129,0.2);
  }

  .card-center { display: flex; gap: 24px; align-items: center; }
  .metric-label { color: #94a3b8; font-size: 0.7rem; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
  .metric-value { color: #334155; font-size: 0.9rem; font-weight: 500; }

  .card-actions { display: flex; gap: 8px; justify-content: flex-end; }

  .action-btn {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    color: #334155;
    padding: 8px 14px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.825rem;
    font-weight: 500;
    transition: all 0.15s ease;
  }
  .action-btn:hover { background: #f8fafc; border-color: #0ea5e9; color: #0ea5e9; }
  .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .delete-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background-color: rgb(20, 20, 20);
    border: none;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0px 0px 16px rgba(0, 0, 0, 0.164);
    cursor: pointer;
    transition-duration: .3s;
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
  }
  .svgIcon {
    width: 10px;
    transition-duration: .3s;
  }
  .svgIcon path { fill: white; }
  .delete-btn:hover {
    width: 110px;
    border-radius: 50px;
    transition-duration: .3s;
    background-color: rgb(255, 69, 69);
    align-items: center;
  }
  .delete-btn:hover .svgIcon {
    width: 38px;
    transition-duration: .3s;
    transform: translateY(60%);
  }
  .delete-btn::before {
    position: absolute;
    top: -20px;
    content: "Delete";
    color: white;
    transition-duration: .3s;
    font-size: 2px;
  }
  .delete-btn:hover::before {
    font-size: 12px;
    opacity: 1;
    transform: translateY(28px);
    transition-duration: .3s;
  }

  /* ── Empty state ─────────────────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 48px 24px;
    color: #94a3b8;
    text-align: center;
  }
  .empty-state p { margin: 0; font-size: 1rem; font-weight: 500; color: #64748b; }
  .empty-state span { font-size: 0.85rem; }

  /* ── Glowing card override for after-bg ──────────────────── */
  .glow-card::after {
    background: rgba(248,250,252,0.95);
  }

  /* ── Responsive tablette ─────────────────────────────────── */
  @media (max-width: 960px) {
    .hero-section {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 32px;
    }
    .hero-globe {
      width: 380px;
      height: 380px;
    }
    .hero-title { font-size: 2rem; }
    .badge-live { margin: 0 auto 16px; }
    .add-inner { flex-direction: column; gap: 12px; }
    .neon-btn { width: 100%; }
    .input { width: 100%; }
  }

  /* ── Responsive mobile ───────────────────────────────────── */
  @media (max-width: 600px) {
    .page-container { padding: 72px 12px 80px; }
    .hero-section { gap: 20px; }
    .hero-globe {
      width: 260px;
      height: 260px;
    }
    .hero-title { font-size: 1.6rem; }
    .hero-sub { font-size: 0.88rem; }
    .section-title { font-size: 1rem; }
    .card-inner {
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .card-left { min-width: 0; }
    .card-center { display: none; }
    .card-actions {
      justify-content: flex-start;
      flex-wrap: wrap;
      gap: 8px;
    }
    .action-btn { font-size: 0.78rem; padding: 6px 12px; }
    .delete-btn { width: 34px !important; height: 34px !important; }
    .sitemap-card { padding: 12px; }
    .site-domain { font-size: 0.85rem; }
    .site-meta { flex-wrap: wrap; gap: 4px; }
    .add-section { padding: 14px; }
    .neon-btn { width: 100%; }
    .section-header { flex-wrap: wrap; gap: 6px; }
  }
</style>