<template>
  <div class="globe-wrapper" ref="wrapperRef" :style="wrapperStyle">
    <div class="globe-backdrop" />
    <div ref="containerRef" class="globe-container" />
    <div class="globe-overlay" v-if="!ready">
      <span class="globe-spinner" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import ThreeGlobe from 'three-globe'
import axios from 'axios'

const props = defineProps({
  apiBase: { type: String, default: '' },
  dark: { type: Boolean, default: true },
  autoRotate: { type: Boolean, default: true },
  size: { type: Number, default: 500 },
})

const containerRef = ref(null)
const wrapperRef = ref(null)
const ready = ref(false)

const wrapperStyle = computed(() => ({
  width: props.size + 'px',
  height: props.size + 'px',
}))

let renderer = null
let scene = null
let camera = null
let controls = null
let globe = null
let animFrame = null

const GLOBE_CONFIG = {
  globeColor: '#072654',
  atmosphereColor: '#38bdf8',
  atmosphereAltitude: 0.18,
  emissive: '#0c2d6b',
  emissiveIntensity: 0.2,
  shininess: 0.9,
  polygonColor: 'rgba(255,255,255,0.7)',
  ambientLight: '#f8fafc',
  directionalLeftLight: '#ffffff',
  directionalTopLight: '#ffffff',
  pointLight: '#ffffff',
  pointSize: 4,
  arcTime: 1000,
  arcLength: 0.9,
  rings: 1,
  maxRings: 3,
}

const ARC_COLORS = ['#06b6d4', '#3b82f6', '#6366f1']

function pickColor() {
  return ARC_COLORS[Math.floor(Math.random() * ARC_COLORS.length)]
}

// Build arcs from geolocated sites (connect each site to the next one in a chain)
function buildArcs(sites) {
  const valid = sites.filter(s => s.lat != null && s.lng != null)
  if (valid.length < 2) return []

  const arcs = []
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      arcs.push({
        order: i + 1,
        startLat: valid[i].lat,
        startLng: valid[i].lng,
        endLat: valid[j].lat,
        endLng: valid[j].lng,
        arcAlt: 0.15 + Math.random() * 0.3,
        color: pickColor(),
      })
    }
  }
  return arcs
}

async function fetchSites() {
  try {
    const base = props.apiBase || (import.meta?.env?.VITE_API_URL ?? '')
    const { data } = await axios.get(`${base}/api/globe`)
    return data.sites || []
  } catch (e) {
    console.error('[Globe3D] fetch error', e)
    return []
  }
}

function initScene() {
  const el = containerRef.value
  if (!el) return

  const w = props.size
  const h = props.size

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  renderer.setClearColor(0x000000, 0)
  el.appendChild(renderer.domElement)

  // Scene
  scene = new THREE.Scene()

  // Camera
  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
  camera.position.set(0, 0, 300)

  // Controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enableZoom = false
  controls.autoRotate = props.autoRotate
  controls.autoRotateSpeed = 0.5
  controls.minPolarAngle = Math.PI / 3.5
  controls.maxPolarAngle = Math.PI - Math.PI / 3.5

  // Lights
  const ambientLight = new THREE.AmbientLight(new THREE.Color(GLOBE_CONFIG.ambientLight), 0.9)
  scene.add(ambientLight)

  const dirLight1 = new THREE.DirectionalLight(new THREE.Color(GLOBE_CONFIG.directionalLeftLight), 1.4)
  dirLight1.position.set(-400, 100, 400)
  scene.add(dirLight1)

  const dirLight2 = new THREE.DirectionalLight(new THREE.Color(GLOBE_CONFIG.directionalTopLight), 0.8)
  dirLight2.position.set(-200, 500, 200)
  scene.add(dirLight2)

  const ptLight = new THREE.PointLight(new THREE.Color(GLOBE_CONFIG.pointLight), 1.0)
  ptLight.position.set(-200, 500, 200)
  scene.add(ptLight)

  // Rim light from behind for subtle edge glow
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.4)
  rimLight.position.set(200, -100, -400)
  scene.add(rimLight)
}

function initGlobe(arcs) {
  if (!scene) return
  globe = new ThreeGlobe({ waitForGlobeReady: true, animateIn: true })
    .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe@2/example/img/earth-night.jpg')
    .bumpImageUrl('https://cdn.jsdelivr.net/npm/three-globe@2/example/img/earth-topology.png')
    .showAtmosphere(true)
    .atmosphereColor(GLOBE_CONFIG.atmosphereColor)
    .atmosphereAltitude(GLOBE_CONFIG.atmosphereAltitude)

  // Arc data
  globe
    .arcsData(arcs)
    .arcColor('color')
    .arcAltitude('arcAlt')
    .arcStroke(() => [0.32, 0.28, 0.3][Math.round(Math.random() * 2)])
    .arcDashLength(GLOBE_CONFIG.arcLength)
    .arcDashInitialGap((d) => d.order)
    .arcDashGap(15)
    .arcDashAnimateTime(GLOBE_CONFIG.arcTime)

  // Ring data at arc endpoints
  const ringData = arcs.flatMap(d => [
    { lat: d.startLat, lng: d.startLng },
    { lat: d.endLat, lng: d.endLng },
  ])
  // Deduplicate roughly
  const seen = new Set()
  const uniqueRings = ringData.filter(r => {
    const key = `${r.lat.toFixed(1)}_${r.lng.toFixed(1)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  globe
    .ringsData(uniqueRings)
    .ringColor(() => (t) => `rgba(14,165,233,${1 - t})`)
    .ringMaxRadius(GLOBE_CONFIG.maxRings)
    .ringPropagationSpeed(GLOBE_CONFIG.rings)
    .ringRepeatPeriod((GLOBE_CONFIG.arcTime * GLOBE_CONFIG.arcLength) / GLOBE_CONFIG.rings)

  // Globe material
  const globeMat = globe.globeMaterial()
  globeMat.color = new THREE.Color(GLOBE_CONFIG.globeColor)
  globeMat.emissive = new THREE.Color(GLOBE_CONFIG.emissive)
  globeMat.emissiveIntensity = GLOBE_CONFIG.emissiveIntensity
  globeMat.shininess = GLOBE_CONFIG.shininess

  scene.add(globe)

  // Point light in the scene tied to globe
  scene.add(new THREE.AmbientLight(0xbbbbbb, 0.3))
}

function animate() {
  animFrame = requestAnimationFrame(animate)
  if (controls) controls.update()
  if (renderer && scene && camera) renderer.render(scene, camera)
}

onMounted(async () => {
  initScene()
  if (!scene) return

  const sites = await fetchSites()
  const arcs = buildArcs(sites)

  initGlobe(arcs)
  ready.value = true

  animate()
})

onBeforeUnmount(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
  if (renderer) {
    renderer.dispose()
    if (containerRef.value && renderer.domElement.parentNode === containerRef.value) {
      containerRef.value.removeChild(renderer.domElement)
    }
  }
  if (controls) controls.dispose()
  if (globe) {
    scene.remove(globe)
    globe = null
  }
  renderer = null
  scene = null
  camera = null
  controls = null
})
</script>

<style scoped>
.globe-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.globe-backdrop {
  position: absolute;
  width: 88%;
  height: 88%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 40% 35%,
    rgba(255,255,255,0.18) 0%,
    rgba(148,163,184,0.10) 40%,
    rgba(30,58,138,0.06) 70%,
    transparent 100%
  );
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow:
    0 0 40px 8px rgba(56,189,248,0.08),
    inset 0 1px 0 rgba(255,255,255,0.15),
    inset 0 -1px 0 rgba(255,255,255,0.05);
  z-index: 0;
  pointer-events: none;
}

.globe-container {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
}

.globe-container :deep(canvas) {
  display: block;
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
</style>
