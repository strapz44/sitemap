<template>
  <div class="world-map-wrapper">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="world-map-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Grille de points de fond (style world-map) -->
      <defs>
        <pattern id="dot-grid" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.9" fill="#94a3b8" opacity="0.35" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dot-grid)" />

      <!-- Contours des continents -->
      <path
        v-for="(d, i) in landPaths"
        :key="`land-${i}`"
        :d="d"
        fill="rgba(148,163,184,0.08)"
        stroke="rgba(148,163,184,0.3)"
        stroke-width="0.5"
        stroke-linejoin="round"
      />

      <!-- Arcs de connexion entre sites -->
      <g v-for="(arc, i) in arcs" :key="i">
        <path
          :d="arc.d"
          fill="none"
          :stroke="arcColor"
          stroke-width="1.5"
          stroke-linecap="round"
          :stroke-dasharray="arc.length"
          :stroke-dashoffset="arc.offset"
          opacity="0.85"
        >
          <animate
            attributeName="stroke-dashoffset"
            :from="arc.length"
            to="0"
            :dur="`${arc.dur}s`"
            :begin="`${arc.delay}s`"
            fill="freeze"
            repeatCount="1"
          />
        </path>
      </g>

      <!-- Points de site -->
      <g v-for="(pt, i) in points" :key="`pt-${i}`">
        <!-- Halo pulsant -->
        <circle
          :cx="pt.x"
          :cy="pt.y"
          :r="7"
          :fill="dotColor"
          opacity="0.15"
        >
          <animate attributeName="r" values="5;10;5" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.15;0.05;0.15" dur="3s" repeatCount="indefinite" />
        </circle>
        <!-- Dot principal -->
        <circle
          :cx="pt.x"
          :cy="pt.y"
          r="4"
          :fill="dotColor"
          class="site-dot"
        />
        <!-- Label -->
        <text
          :x="pt.x"
          :y="pt.y - 10 - (pt.labelOffsetY || 0)"
          text-anchor="middle"
          font-size="9"
          :fill="labelColor"
          font-family="system-ui, sans-serif"
          opacity="0.8"
        >{{ pt.label }}</text>
      </g>
    </svg>

    <!-- État de chargement -->
    <div v-if="loading" class="map-loading">
      <span class="loading-dot" />
      <span class="loading-text">Localisation des sites…</span>
    </div>
    <div v-if="!loading && points.length === 0" class="map-empty">
      Aucun site localisé
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const props = defineProps({
  apiBase: { type: String, default: '' },
  arcColor: { type: String, default: '#38bdf8' },
  dotColor: { type: String, default: '#38bdf8' },
  labelColor: { type: String, default: '#94a3b8' },
  showArcs: { type: Boolean, default: true },
})

const W = 800
const H = 400

const loading = ref(true)
const sites = ref([])
const landPaths = ref([])

// Projection Mercator simplifiée → coordonnées SVG
function latLngToXY(lat, lng) {
  const x = ((lng + 180) / 360) * W
  const latRad = (lat * Math.PI) / 180
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2))
  const y = H / 2 - (W * mercN) / (2 * Math.PI)
  return { x: Math.max(0, Math.min(W, x)), y: Math.max(0, Math.min(H, y)) }
}

const points = computed(() => {
  const raw = sites.value.map((s) => {
    const { x, y } = latLngToXY(s.lat, s.lng)
    return { x, y, label: s.domain || s.site, site: s.site }
  })
  // Offset overlapping labels so they don't stack
  for (let i = 0; i < raw.length; i++) {
    for (let j = i + 1; j < raw.length; j++) {
      const dx = Math.abs(raw[i].x - raw[j].x)
      const dy = Math.abs(raw[i].y - raw[j].y)
      if (dx < 40 && dy < 14) {
        raw[j].labelOffsetY = 14 * (j - i)
      }
    }
    if (!raw[i].labelOffsetY) raw[i].labelOffsetY = 0
  }
  return raw
})

// Calcule la longueur approchée d'un chemin SVG cubique
function approxPathLength(x1, y1, cx, cy, x2, y2) {
  let len = 0
  let px = x1; let py = y1
  const steps = 30
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    const nx = mt * mt * x1 + 2 * mt * t * cx + t * t * x2
    const ny = mt * mt * y1 + 2 * mt * t * cy + t * t * y2
    len += Math.hypot(nx - px, ny - py)
    px = nx; py = ny
  }
  return len
}

const arcs = computed(() => {
  if (!props.showArcs || points.value.length < 2) return []
  const result = []
  // Connecter chaque point au suivant (chaîne circulaire)
  for (let i = 0; i < points.value.length; i++) {
    const a = points.value[i]
    const b = points.value[(i + 1) % points.value.length]
    if (a.x === b.x && a.y === b.y) continue

    // Point de contrôle de la courbe (arc parabolique vers le haut)
    const mx = (a.x + b.x) / 2
    const my = Math.min(a.y, b.y) - Math.abs(b.x - a.x) * 0.35 - 30
    const d = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`
    const length = approxPathLength(a.x, a.y, mx, my, b.x, b.y)
    result.push({
      d,
      length: Math.ceil(length),
      offset: Math.ceil(length),
      dur: 1.5 + Math.random() * 0.5,
      delay: i * 0.4,
    })
  }
  return result
})

async function fetchSites() {
  loading.value = true
  try {
    const base = props.apiBase || (import.meta?.env?.VITE_API_URL ?? '')
    const { data } = await axios.get(`${base}/api/globe`)
    sites.value = data.sites || []
  } catch (e) {
    console.error('[WorldMap] fetch error', e)
    sites.value = []
  } finally {
    loading.value = false
  }
}

// Minimal TopoJSON decoder for land-110m
function decodeTopo(topo) {
  const { scale, translate } = topo.transform
  const arcs = topo.arcs.map(arc => {
    let x = 0, y = 0
    return arc.map(([dx, dy]) => {
      x += dx; y += dy
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]]
    })
  })
  function getArc(i) { return i >= 0 ? arcs[i] : [...arcs[~i]].reverse() }
  function ring(indices) {
    let c = []
    indices.forEach(i => { const a = getArc(i); c.push(...(c.length ? a.slice(1) : a)) })
    return c
  }
  const paths = []
  topo.objects.land.geometries.forEach(g => {
    const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs
    polys.forEach(p => p.forEach(r => paths.push(ring(r))))
  })
  return paths
}

function coordsToSvgPath(coords) {
  return coords.map((c, i) => {
    const { x, y } = latLngToXY(c[1], c[0])
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join('') + 'Z'
}

async function fetchLandOutlines() {
  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')
    const topo = await res.json()
    landPaths.value = decodeTopo(topo).map(coordsToSvgPath)
  } catch (e) {
    console.warn('[WorldMap] Could not load land outlines', e)
  }
}

onMounted(() => {
  fetchSites()
  fetchLandOutlines()
})
</script>

<style scoped>
.world-map-wrapper {
  position: relative;
  width: 100%;
  background: transparent;
}

.world-map-svg {
  width: 100%;
  height: auto;
  display: block;
}

.site-dot {
  cursor: pointer;
  transition: r 0.2s;
}
.site-dot:hover {
  r: 6;
}

.map-loading,
.map-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #64748b;
}

.loading-dot {
  width: 8px;
  height: 8px;
  background: #38bdf8;
  border-radius: 50%;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}
</style>
