<template>
  <canvas ref="canvas" class="stars-canvas" aria-hidden="true"></canvas>
</template>

<script setup>
/* eslint-env vue/setup-compiler-macros */
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  density: { type: Number, default: 0.8 },        // 0.6..1.2
  twinkle: { type: Number, default: 0.25 },       // 0..1
  driftSpeed: { type: Number, default: 0.03 },    // utilisé pour moduler la vitesse du jitter (pas de dérive verticale)
  // Palette très douce, tirant légèrement vers violet/bleu
  colorA: { type: String, default: 'rgb(220,220,255)' },
  colorB: { type: String, default: 'rgb(210,210,245)' },
  colorC: { type: String, default: 'rgb(200,200,240)' },
})

const canvas = ref(null)
let ctx
let stars = []
let raf = 0
let time = 0
let debugUntil = 0 // horodatage (ms) jusqu'auquel on affiche le mode debug
let lastNow = 0    // pour calculer un delta-time stable

function rand(a, b) { return Math.random() * (b - a) + a }

function makeLayer(count, sizeMin, sizeMax, jitterSpeed, color, alphaBase, jitterPhaseBase) {
  const arr = []
  for (let i = 0; i < count; i++) {
    arr.push({
      x: Math.random(),    // 0..1 normalized
      y: Math.random(),
      r: rand(sizeMin, sizeMax),
      ph: Math.random() * Math.PI * 2,
      col: color,
      a: alphaBase * (0.8 + Math.random()*0.4),
      jp: jitterPhaseBase + Math.random() * 6.2831, // phase jitter
      jamp: rand(0.08, 0.28), // amplitude jitter relative
      js: jitterSpeed * (0.7 + Math.random()*0.6), // vitesse jitter par étoile
    })
  }
  return arr
}

function resize() {
  const c = canvas.value
  if (!c) return
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  // Utiliser les dimensions de la fenêtre pour garantir une surface pleine
  const w = window.innerWidth
  const h = window.innerHeight
  // Appliquer aussi les tailles CSS pour éviter clientWidth=0
  c.style.width = w + 'px'
  c.style.height = h + 'px'
  c.width = Math.floor(w * dpr)
  c.height = Math.floor(h * dpr)
  ctx = c.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function init() {
  const c = canvas.value
  if (!c) return
  resize()
  const w = c.clientWidth, h = c.clientHeight
  // Densité raisonnable et scalable avec la surface
  const base = Math.max(120, Math.floor((w * h) / 16000))
  const factor = props.density
  const jBase = Math.max(0.3, props.driftSpeed * 12) // 0.36 par défaut
  stars = [
    // couche profonde (parallax lent, très douce)
    ...makeLayer(Math.floor(base * 0.40 * factor), 0.9, 1.5, jBase * 0.5, props.colorC, 0.06, 0.0),
    // couche moyenne
    ...makeLayer(Math.floor(base * 0.26 * factor), 1.0, 1.8, jBase * 1.0, props.colorB, 0.09, 2.1),
    // couche proche (la plus visible)
    ...makeLayer(Math.floor(base * 0.16 * factor), 1.2, 2.2, jBase * 1.5, props.colorA, 0.12, 4.2),
  ]
}

function draw() {
  const canvasEl = canvas.value
  if (!canvasEl || !ctx) return
  const w = window.innerWidth
  const h = window.innerHeight
  ctx.clearRect(0, 0, w, h)

  // Avancer le temps (en secondes) pour twinkle/jitter
  const now = performance.now()
  const dt = lastNow ? (now - lastNow) / 1000 : 1 / 60
  lastNow = now
  time += dt

  // Vignettage radial très discret pour un rendu plus "velours"
  ctx.save()
  const rg = ctx.createRadialGradient(w*0.5, h*0.5, 0, w*0.5, h*0.5, Math.max(w,h)*0.7)
  rg.addColorStop(0, 'rgba(0,0,0,0)')
  rg.addColorStop(1, 'rgba(8,8,12,0.16)')
  ctx.fillStyle = rg
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i]
    const x = s.x * w
    const y = s.y * h
    // Twinkle via phase + global time (alpha global, donc visible)
    const osc = 0.5 + 0.5 * Math.sin(time * 2 + s.ph)
    const tw = (1 - props.twinkle) + props.twinkle * osc // 0.75..1 avec twinkle=0.5
    ctx.fillStyle = s.col
    // halo très doux
    ctx.shadowColor = s.col
    ctx.shadowBlur = 2
    ctx.globalAlpha = Math.max(0.02, Math.min(1, s.a * tw))
    ctx.beginPath()
    // léger jitter horizontal (pas de dérive verticale)
    const jx = s.jamp * Math.sin(time * s.js + s.jp)
    ctx.arc(x + jx, y, s.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    // pas de mouvement vertical pour un fond plus calme et premium
  }

  // Marqueurs DEBUG pendant 10s après le montage
  if (performance.now() < debugUntil) {
    ctx.save()
    // Bandeau translucide
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fillRect(0, 0, Math.min(220, w*0.25), 36)
    // Point bien visible en haut-gauche
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.arc(24, 24, 6, 0, Math.PI*2)
    ctx.fill()
    // Texte court
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    ctx.fillText('StarsBackground DEBUG', 44, 26)
    ctx.restore()
  }
  ctx.globalAlpha = 1
  raf = requestAnimationFrame(draw)
}

let onResize
let onVisibility
onMounted(() => {
  init()
  onResize = () => { init() }
  window.addEventListener('resize', onResize)
  // Activer le mode debug 10s
  debugUntil = 0
  lastNow = performance.now()
  const c = canvas.value
  console.log('[StarsBackground] mounted', {
    width: c?.width, height: c?.height, dpr: window.devicePixelRatio, 
    density: props.density, twinkle: props.twinkle, driftSpeed: props.driftSpeed
  })
  raf = requestAnimationFrame(draw)
  onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf)
    } else {
      lastNow = performance.now()
      raf = requestAnimationFrame(draw)
    }
  }
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  if (onResize) window.removeEventListener('resize', onResize)
  if (onVisibility) document.removeEventListener('visibilitychange', onVisibility)
})

watch(() => [props.density, props.twinkle, props.driftSpeed, props.colorA, props.colorB, props.colorC], () => {
  init()
})
</script>

<style scoped>
.stars-canvas {
  position: fixed;
  inset: 0;
  z-index: 1; /* above base background, below page content (which is z-index 2) */
  pointer-events: none;
  background: transparent;
}
</style>
