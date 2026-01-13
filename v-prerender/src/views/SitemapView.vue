<template>
    <div class="app-wrapper">
      <StarsBackground v-if="false" :density="0.75" :twinkle="0.22" :driftSpeed="0.03" />
      <ColorBendsBackground
        v-if="false"
        :animated="false"
        :performanceMode="perfMode"
        :speed="0.06"
        :intensity="0.42"
        :colors="['#8b5cf6', '#1BFD9C', '#4079ff']"
      />
      <div class="page-container">
        <GradientText
          :colors="['#40ffaa', '#4079ff', '#40ffaa', '#4079ff', '#40ffaa']"
          :animationSpeed="3"
          :showBorder="false"
          :animated="false"
          :strokeWidth="0"
          :shadow="false"
          textShadow=""
          class="main-title">
          SITEMAPS
        </GradientText>
        
        <div class="sitemap-section">
          <GradientText
            :colors="['#ffffff', '#8b5cf6']"
            :animationSpeed="3"
            :showBorder="false"
            :animated="false"
            :strokeWidth="0"
            :shadow="false"
            textShadow=""
            class="section-title">
            AJOUTER UN SITEMAP
          </GradientText>
          <div class="input-group">
            <input
              placeholder="Entrez votre site"
              class="input"
              name="text"
              type="text"
              v-model="url"
              :disabled="isLoading"
            />
            <button class="btn-add" @click="addSitemap" :disabled="isLoading">
              {{ isLoading ? 'Chargement...' : 'Ajouter' }}
            </button>
          </div>
          <div v-if="error" class="error-message">{{ error }}</div>
        </div>
  
        <div class="sitemap-list">
          <GradientText
            :colors="['#ffffff', '#8b5cf6']"
            :animationSpeed="3"
            :showBorder="false"
            :animated="false"
            :strokeWidth="0"
            :shadow="false"
            textShadow=""
            class="section-title">
            LISTE DES SITEMAPS
          </GradientText>
          <div class="table" ref="tableEl">
            <div class="card-list">
              <div v-for="(item, idx) in sitemaps" :key="idx" class="sitemap-card">
                <div class="card-left">
                  <div class="avatar"></div>
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
              </div>

              <div v-if="sitemaps.length === 0" class="empty-state">Aucun sitemap ajouté</div>
            </div>
          </div>
        </div>
      </div>
  
      
    </div>
  </template>

  <script setup>
  import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
  import { useRouter } from 'vue-router'
  import axios from 'axios'
  import GradientText from '../components/GradientText.vue'
  import StarsBackground from '../components/StarsBackground.vue'
  import ColorBendsBackground from '../components/ColorBendsBackground.vue'
  
  
  const API_URL = (import.meta?.env?.VITE_API_URL) || (process?.env?.VUE_APP_API_URL) || '/api'
  
  const url = ref('')
  const sitemaps = ref([])
  const error = ref('')
  const isLoading = ref(false)
  const router = useRouter()
  const summaryBySite = ref({})
  const perfMode = ref(false)

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
    if (!raw) return ''
    // If protocol missing, default to https
    if (!/^https?:\/\//i.test(raw)) {
      return `https://${raw}`
    }
    return raw
  }
  
  // Charger les sitemaps au démarrage
  onMounted(async () => {
    await loadSitemaps()
    await loadSummaries()
  })
  
  // Charger tous les sitemaps
  async function loadSitemaps() {
    try {
      const response = await axios.get(`${API_URL}/sitemaps`)
      sitemaps.value = response.data
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
            const { data } = await axios.get(`${API_URL}/sitemaps/${encodeURIComponent(site)}/summary`)
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
      await axios.post(`${API_URL}/sitemaps`, { url: normalized })
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
      await axios.post(`${API_URL}/sitemaps/${encodeURIComponent(siteName)}/refresh`)
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
      await axios.delete(`${API_URL}/sitemaps/${encodeURIComponent(siteName)}`)
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
    background-color: #f8fafc; /* light neutral */
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
    color: #8b5cf6;
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
    color: #8b5cf6;
    margin-bottom: 1rem;
  }
  
  .input-group {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .input {
    color: #0f172a;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px 14px;
    background: #ffffff;
    max-width: 260px;
  }
  
  .input:active {
    box-shadow: none;
  }
  
  .input:focus {
    outline: none;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139,92,246,0.25);
  }
  
  .input:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .btn-add {
    font-size: 15px;
    padding: 0.6em 1.2em;
    letter-spacing: 0.02em;
    position: relative;
    font-family: inherit;
    border-radius: 8px;
    transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
    line-height: 1.4em;
    border: 1px solid #1BFD9C;
    background: #ffffff;
    color: #1BFD9C;
    box-shadow: none;
  }
  
  .btn-add:not(:disabled):hover {
    background: #ecfdf5;
    color: #1BFD9C;
    box-shadow: none;
  }
  
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
  .card-list { display: grid; gap: 12px; }
  .sitemap-card {
    display: grid;
    grid-template-columns: 1.7fr 1.1fr auto;
    align-items: center;
    gap: 16px;
    padding: 16px 18px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  }
  .sitemap-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 24px rgba(2,6,23,0.08);
    border-color: rgba(139,92,246,0.25);
  }

  .card-left { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
  .avatar { width: 40px; height: 40px; border-radius: 10px; background: #8b5cf6; flex-shrink: 0; }
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
    background-color: #ffffff;
    border: 1px solid #8b5cf6;
    color: #8b5cf6;
    padding: 0.5rem 0.9rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }

  .action-btn:hover {
    background-color: rgba(139,92,246,0.08);
  }
  
  .delete-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background-color: #ffffff;
    border: 1px solid #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease;
    padding: 0;
  }
  
  .delete-btn:hover {
    background-color: #fee2e2;
    border-color: #ef4444;
  }
  
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
</style>