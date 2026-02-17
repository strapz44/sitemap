<template>
    <div class="app-wrapper">
      <div class="page-container">
        
        <div class="input-group">
          <input
            placeholder="Entrez votre site"
            class="input"
            name="text"
            type="text"
            v-model="url"
            :disabled="isLoading"
          />
          <GlassGenerateButton class="btn-add-legacy" :disabled="isLoading" size="1.0rem" @click="addSitemap">Ajouter</GlassGenerateButton>
        </div>
        <div v-if="error" class="error-message">{{ error }}</div>
  
        <div class="sitemap-list">
          <div class="table" ref="tableEl">
            <div class="card-list">
              <GlassSurface v-for="(item, idx) in sitemaps" :key="idx" rootClass="sitemap-card premium-glass">
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
                  <button class="action-btn" @click="refreshSitemap(item.siteName)">Analyser</button>
                  <button class="delete-btn" @click="deleteSitemap(item.siteName)">
                    <svg viewBox="0 0 448 512" class="svgIcon">
                      <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                    </svg>
                  </button>
                </div>
              </GlassSurface>

              <div v-if="sitemaps.length === 0" class="empty-state">Aucun sitemap ajouté</div>
            </div>
          </div>
        </div>
      </div>
  
      
    </div>
  </template>

  <script setup>
  import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
  import gsap from 'gsap'
  import { useRouter } from 'vue-router'
  import axios from 'axios'
  import GlassSurface from '../components/vendor/GlassSurface.vue'
  import GlassGenerateButton from '../components/GlassGenerateButton.vue'
  
  
  const API_URL = (['localhost','127.0.0.1'].includes(window.location.hostname)
    ? '/api'
    : ((import.meta?.env?.VITE_API_URL) || (process?.env?.VUE_APP_API_URL) || '/api'))
  const API_BASE = ref(API_URL)
  
  const url = ref('')
  const sitemaps = ref([])
  const error = ref('')
  const isLoading = ref(false)
  const router = useRouter()
  const summaryBySite = ref({})

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
      await axios.post(`${API_BASE.value}/sitemaps/${encodeURIComponent(siteName)}/refresh`)
      await loadSitemaps()
      await loadSummaries()
    } catch (err) {
      error.value = 'Erreur lors du rafraîchissement du sitemap'
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
    background:
      radial-gradient(60% 80% at 18% 18%, rgba(139, 92, 246, 0.35) 0%, transparent 60%),
      radial-gradient(50% 70% at 82% 28%, rgba(56, 189, 248, 0.25) 0%, transparent 60%),
      linear-gradient(180deg, #0b1020 0%, #0a0f1a 100%);
    min-height: 100vh;
    font-family: Arial, sans-serif;
    position: relative;
    overflow: hidden;
  }

  /* Ancien fond supprimé pour éviter tout conflit visuel */
  
  .page-container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
    z-index: 2; /* above animated backgrounds (Stars z=1, ColorBends z=0) */
  }

  /* Subtabs removed: Navbar handles section navigation */
  
  .main-title {
    font-size: 2rem;
    margin-bottom: 2rem;
    font-weight: 700;
    letter-spacing: 0.2px;
    color: #0f172a;
  }

  /* Reusable green→violet gradient text */
  .gradient-text {
    color: #0f172a;
  }

  .badge {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 6px;
    font-size: 12px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.2);
  }
  .badge-stale {
    color: #ffb3b3;
    border-color: #ff6b6b;
  }
  
  .section-title {
    font-size: 1.2rem;
    color: #334155;
    margin-bottom: 1rem;
  }
  
  .input-group {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    align-items: center;
  }
  
  .input {
    color: #e5e7eb;
    border: 1px solid rgba(148,163,184,0.26);
    border-radius: 14px;
    padding: 10px 14px;
    background: rgba(255,255,255,0.08);
    backdrop-filter: saturate(160%) blur(14px);
    -webkit-backdrop-filter: saturate(160%) blur(14px);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
    max-width: 260px;
    height: 44px;
  }
  .input::placeholder { color: #94a3b8; }
  
  .input:active {
    box-shadow: none;
  }
  
  .input:focus {
    outline: none;
    border-color: rgba(139,92,246,0.5);
    box-shadow: 0 0 0 3px rgba(139,92,246,0.25);
  }
  
  .input:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .btn-add {
    font-size: 15px;
    padding: 12px 16px;
    letter-spacing: 0.02em;
    position: relative;
    font-family: inherit;
    border-radius: 12px;
    transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    line-height: 20px;
    border: 1px solid rgba(148,163,184,0.26);
    background: rgba(255,255,255,0.08);
    color: #e5e7eb;
    backdrop-filter: saturate(160%) blur(14px);
    -webkit-backdrop-filter: saturate(160%) blur(14px);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
    height: 44px;
  }
  
  .btn-add:not(:disabled):hover { background: rgba(255,255,255,0.14); color: #fff; border-color: var(--accent-border); }
  
  .btn-add:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .btn-add:before {
    content: none;
  }
  
  .btn-add:not(:disabled):hover:before {
    transform: none;
  }
  
  .table { border: none; background: transparent; box-shadow: none; padding: 0; }
  .table::before, .table::after { content: none; }

  /* Card list */

  .sitemap-list { display: flex; justify-content: center; }
  .card-list { display: grid; gap: 12px; width: min(860px, 100%); }
  .sitemap-card { padding: 0; border-radius: 16px; }
  :deep(.sitemap-card:not(.premium-glass).glass-surface--svg),
  :deep(.sitemap-card:not(.premium-glass).glass-surface--fallback) {
    background: rgba(255,255,255,0.72);
    border: 1px solid rgba(148,163,184,0.35);
    box-shadow: 0 14px 30px rgba(2,6,23,0.12), inset 0 1px 0 rgba(255,255,255,0.35);
  }
  :deep(.sitemap-card .glass-surface__content) {
    display: grid;
    grid-template-columns: 1.7fr 1.1fr auto;
    align-items: center;
    gap: 16px;
    padding: 16px 18px;
  }
  .sitemap-card .metric-label { color: #94a3b8; }
  .sitemap-card .metric-value { color: #e5e7eb; }
  .sitemap-card .site-meta { color: #cbd5e1; }
  .sitemap-card .site-name { color: #f8fafc; }
  .sitemap-card:hover {
    transform: translateY(-3px);
    box-shadow: none;
  }

  .card-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .site-info { min-width: 0; }
  .site-topline { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .site-meta { display: flex; flex-wrap: wrap; gap: 8px; color: #475569; font-size: 0.9rem; margin-top: 4px; }
  .site-meta .dot { color: #cbd5e1; }

  .card-center { display: flex; gap: 24px; align-items: center; justify-content: flex-start; }
  .metric-label { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 2px; }
  .metric-value { color: #334155; font-size: 0.95rem; }

  .card-actions { display: flex; gap: 8px; justify-content: flex-end; }

  @keyframes pixelDrift { }
  @keyframes sweepBar { }
  
  /* Base style for action buttons (Voir, Recharger) matching delete icon */
  .action-btn {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(148,163,184,0.26);
    color: #e5e7eb;
    padding: 0.5rem 0.9rem;
    border-radius: 10px;
    cursor: pointer;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }

  .action-btn:hover { background: rgba(255,255,255,0.14); border-color: var(--accent-border); color: #fff; }
  
  .delete-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(255,255,255,0.08);
    border: 1px solid #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    transition: background-color 0.2s ease, border-color 0.2s ease;
    padding: 0;
  }
  
  .delete-btn:hover { background: rgba(255,255,255,0.14); border-color: #ef4444; }
  
  .svgIcon {
    width: 16px;
    height: 16px;
    transition: all 0.3s;
  }
  
  .svgIcon path {
    fill: #ef4444;
  }
  
  .delete-btn:hover .svgIcon path {
    fill: #b91c1c;
  }
  
  .error-message {
    color: #dc2626;
    margin-top: 0.5rem;
  }
  
  .modal h3 {
    color: #0f172a;
    margin-bottom: 1.5rem;
  }
  
  .urls-list {
    margin-bottom: 1.5rem;
  }
  
  .url-item {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .url-loc {
    color: #0369a1;
    margin-bottom: 0.5rem;
  }
  
  .url-details {
    display: flex;
    gap: 1rem;
    color: #475569;
    font-size: 0.9rem;
  }
  
  /* Emphasis colors for key values */
  .site-name {
    font-weight: 600;
  }
  .site-proto { color: #9ca3af; } /* gray-400 */
  .site-domain { color: #8b5cf6; } /* violet */
  .pages-count {
    color: #8b5cf6; /* brand violet */
    font-weight: 700;
    font-variant-numeric: tabular-nums; /* aligned digits */
  }
  .date-text {
    color: #8b5cf6; /* brand violet */
    font-weight: 600;
  }

  /* Adapter le bouton GlassGenerateButton à 44px ici */
  :deep(.btn-add-legacy.btn-wrapper) { font-size: 1rem; }
  :deep(.btn-add-legacy .button) { height: 44px; display: inline-flex; align-items: center; }
  :deep(.btn-add-legacy .span) { padding-inline: 18px; }
</style>