<template>
  <div class="globe-wrapper" ref="wrapperRef">
    <canvas ref="canvasRef" class="globe-canvas" />
    <div class="globe-overlay" v-if="!ready">
      <span class="globe-spinner" />
    </div>
    <!-- Tooltip site au survol -->
    <div
      v-if="hovered"
      class="globe-tooltip"
      :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
    >
      {{ hovered }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import createGlobe from 'cobe'
import axios from 'axios'

const props = defineProps({
  apiBase: { type: String, default: '' },
  dark: { type: Boolean, default: true },
  autoRotate: { type: Boolean, default: true },
  size: { type: Number, default: 500 },
})

const wrapperRef = ref(null)
const canvasRef = ref(null)
const ready = ref(false)
const hovered = ref(null)
const tooltipX = ref(0)
const tooltipY = ref(0)

let globe = null
let phi = 0
let animFrame = null
let sites = []

// Convertit lat/lng → markers cobe { location: [lat, lng], size: 0.05 }
function buildMarkers(siteList) {
  return siteList.map((s) => ({
    location: [s.lat, s.lng],
    size: 0.07,
    site: s.site,
    domain: s.domain,
  }))
}

async function fetchSites() {
  try {
    const base = props.apiBase || (import.meta?.env?.VITE_API_URL ?? '')
    const { data } = await axios.get(`${base}/api/globe`)
    sites = data.sites || []
  } catch (e) {
    console.error('[Globe3D] fetch error', e)
    sites = []
  }
}

function initGlobe() {
  if (!canvasRef.value) return

  const markers = buildMarkers(sites)
  const sz = props.size
  canvasRef.value.width = sz
  canvasRef.value.height = sz

  globe = createGlobe(canvasRef.value, {
    devicePixelRatio: window.devicePixelRatio || 1,
    width: sz,
    height: sz,
    phi: 0,
    theta: 0.3,
    dark: props.dark ? 1 : 0,
    diffuse: 1.2,
    mapSamples: 16000,
    mapBrightness: props.dark ? 6 : 1.8,
    baseColor: props.dark ? [0.05, 0.1, 0.2] : [0.85, 0.9, 1.0],
    markerColor: [0.22, 0.74, 0.98],   // bleu ciel #38bdf8
    glowColor: props.dark ? [0.1, 0.3, 0.6] : [0.6, 0.8, 1.0],
    markers,
    onRender(state) {
      if (props.autoRotate) {
        state.phi = phi
        phi += 0.003
      }
    },
  })

  ready.value = true
}

onMounted(async () => {
  await fetchSites()
  initGlobe()
})

onBeforeUnmount(() => {
  if (globe) globe.destroy()
  if (animFrame) cancelAnimationFrame(animFrame)
})
</script>

<style scoped>
.globe-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.globe-canvas {
  width: 100%;
  height: auto;
  max-width: v-bind('props.size + "px"');
  aspect-ratio: 1;
  cursor: grab;
}

.globe-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.globe-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(56, 189, 248, 0.2);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.globe-tooltip {
  position: absolute;
  background: rgba(15, 23, 42, 0.9);
  color: #e2e8f0;
  font-size: 0.75rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  pointer-events: none;
  white-space: nowrap;
  border: 1px solid rgba(56, 189, 248, 0.3);
  transform: translate(-50%, -120%);
}
</style>
