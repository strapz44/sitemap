<template>
  <canvas ref="canvas" class="colorbends-canvas" aria-hidden="true"></canvas>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  performanceMode: { type: Boolean, default: false },
  animated: { type: Boolean, default: true },
  speed: { type: Number, default: 0.08 },
  intensity: { type: Number, default: 0.55 },
  colors: { type: Array, default: () => ['#8b5cf6', '#1BFD9C', '#4079ff'] },
})

const canvas = ref(null)
let ctx
let raf = 0
let lastNow = 0
let time = 0
let mql
let running = false
let bands = []
let onVisCb
let onMqlCb
let grainCanvas
let grainCtx
let palette = []

function dprCap() {
  return Math.min(window.devicePixelRatio || 1, 1.5)
}

function lerp(a, b, t) { return a + (b - a) * t }
function lerpColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ]
}
function colorAt(stops, t) {
  if (!stops || stops.length === 0) return [139,92,246]
  if (stops.length === 1) return stops[0]
  const seg = 1 / (stops.length - 1)
  const i = Math.max(0, Math.min(stops.length - 2, Math.floor(t / seg)))
  const lt = (t - i * seg) / seg
  return lerpColor(stops[i], stops[i + 1], lt)
}

function parseColor(c) {
  if (!c) return [139, 92, 246]
  if (c.startsWith('#')) {
    const hex = c.replace('#','')
    const v = hex.length === 3
      ? hex.split('').map(h=>h+h).join('')
      : hex
    const r = parseInt(v.slice(0,2),16)
    const g = parseInt(v.slice(2,4),16)
    const b = parseInt(v.slice(4,6),16)
    return [r,g,b]
  }
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])]
  return [139, 92, 246]
}

function resize() {
  const c = canvas.value
  if (!c) return
  const dpr = dprCap()
  const w = window.innerWidth
  const h = window.innerHeight
  c.style.width = w + 'px'
  c.style.height = h + 'px'
  c.width = Math.floor(w * dpr)
  c.height = Math.floor(h * dpr)
  ctx = c.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function init() {
  resize()
  const colors = (props.colors || []).map(parseColor)
  palette = colors
  const w = window.innerWidth
  const h = window.innerHeight
  const D = Math.max(w, h)
  const count = props.performanceMode ? 2 : 3
  // Smooth curved ribbons (circular arc-based)
  bands = Array.from({ length: count }).map((_, i) => {
    const col = colors[i % colors.length]
    const width = Math.floor(Math.max(240, Math.min(420, (Math.random() * 160) + 260)))
    return {
      id: i,
      color: col,
      width,
      radius: (1.2 + Math.random() * 1.6) * D, // arc radius
      arc: 1.8 + Math.random() * 1.4,          // arc length in radians
      a0: Math.random() * Math.PI * 2,         // starting angle
      speedA: (0.12 + Math.random() * 0.22) * props.speed, // angular drift speed
      cx0: w * (0.3 + Math.random() * 0.4),
      cy0: h * (0.3 + Math.random() * 0.4),
      driftX: (0.02 + Math.random() * 0.06),
      driftY: (0.02 + Math.random() * 0.06),
      phase: Math.random() * 6.2831,
      alpha: 0.12 + Math.random() * 0.18,
      elong: 2.8 + Math.random() * 1.8,        // ellipse elongation (major axis scale)
      blur: 24 + Math.random() * 16
    }
  })
  ensureGrain()
}

function draw() {
  const c = canvas.value
  if (!c || !ctx) return
  const w = window.innerWidth
  const h = window.innerHeight
  ctx.clearRect(0, 0, w, h)

  // Soft background gradient to add depth
  ctx.save()
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, 'rgba(26,28,40,0.85)')
  bg.addColorStop(1, 'rgba(12,14,22,0.85)')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  ctx.globalCompositeOperation = 'screen'
  const baseInt = Math.max(0, Math.min(1, props.intensity))
  time += (lastNow ? (performance.now() - lastNow) / 1000 : 1/60)
  lastNow = performance.now()

  const steps = props.performanceMode ? 64 : 112

  for (let i = 0; i < bands.length; i++) {
    const b = bands[i]
    // Drift center over time
    const cx = b.cx0 + Math.sin(time * b.driftX + b.phase) * (w * 0.12)
    const cy = b.cy0 + Math.cos(time * b.driftY + b.phase * 0.6) * (h * 0.12)
    const start = b.a0 + time * b.speedA
    const midA = Math.min(1, baseInt * b.alpha + 0.04)

    for (let t = 0; t <= 1; t += 1/steps) {
      const theta = start + (t - 0.5) * b.arc
      const px = cx + Math.cos(theta) * b.radius
      const py = cy + Math.sin(theta) * b.radius
      const ang = theta + Math.PI * 0.5 // tangent angle

      // Elliptical radial gradient capsule with per-step color
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(ang)
      ctx.scale(b.elong, 1)
      ctx.filter = `blur(${b.blur}px)`

      const rad = b.width * 0.5
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad)
      const [r,gc,bv] = colorAt(palette, t)
      g.addColorStop(0.0, `rgba(${r},${gc},${bv},${midA})`)
      g.addColorStop(0.85, `rgba(${r},${gc},${bv},${midA * 0.14})`)
      g.addColorStop(1.0, `rgba(${r},${gc},${bv},0)`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, rad, 0, Math.PI * 2)
      ctx.fill()
      // soft white highlight overlay for premium gloss
      const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, rad * 0.85)
      g2.addColorStop(0.0, `rgba(255,255,255,${midA * 0.22})`)
      g2.addColorStop(0.6, `rgba(255,255,255,${midA * 0.05})`)
      g2.addColorStop(1.0, 'rgba(255,255,255,0)')
      ctx.fillStyle = g2
      ctx.beginPath()
      ctx.arc(0, 0, rad * 0.95, 0, Math.PI * 2)
      ctx.fill()
      ctx.filter = 'none'
      ctx.restore()
    }
  }

  // Subtle grain overlay to avoid banding
  if (grainCanvas) {
    ctx.save()
    ctx.globalAlpha = 0.07
    ctx.globalCompositeOperation = 'soft-light'
    const pat = ctx.createPattern(grainCanvas, 'repeat')
    if (pat) {
      ctx.fillStyle = pat
      ctx.fillRect(0, 0, w, h)
    }
    ctx.restore()
  }

  ctx.globalCompositeOperation = 'source-over'
  raf = requestAnimationFrame(draw)
}

function start() {
  if (running) return
  running = true
  lastNow = performance.now()
  raf = requestAnimationFrame(draw)
}

function stop() {
  running = false
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

function shouldAnimate() {
  const reduced = !!(mql && mql.matches)
  return props.animated && !reduced
}

onMounted(() => {
  init()
  mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  onMqlCb = () => { if (shouldAnimate()) start(); else stop() }
  if (mql && mql.addEventListener) mql.addEventListener('change', onMqlCb)
  else if (mql && mql.addListener) mql.addListener(onMqlCb)
  window.addEventListener('resize', init)
  onVisCb = () => { if (document.hidden) stop(); else if (shouldAnimate()) start() }
  document.addEventListener('visibilitychange', onVisCb)
  if (shouldAnimate()) start()
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', init)
  if (onVisCb) document.removeEventListener('visibilitychange', onVisCb)
  if (mql && mql.removeEventListener) mql.removeEventListener('change', onMqlCb)
  else if (mql && mql.removeListener) mql.removeListener(onMqlCb)
})

watch(() => [props.performanceMode, props.speed, props.intensity, props.colors], () => {
  init()
})

// Create a small noise tile once for grain overlay
function ensureGrain() {
  try {
    if (grainCanvas) return
    const s = 64
    grainCanvas = document.createElement('canvas')
    grainCanvas.width = s
    grainCanvas.height = s
    grainCtx = grainCanvas.getContext('2d')
    const img = grainCtx.createImageData(s, s)
    const data = img.data
    for (let i = 0; i < data.length; i += 4) {
      const v = (Math.random() * 255) | 0
      data[i] = v
      data[i + 1] = v
      data[i + 2] = v
      data[i + 3] = 32 // low alpha in the tile, reduced again at draw time
    }
    grainCtx.putImageData(img, 0, 0)
  } catch (_) { /* ignore */ }
}
</script>

<style scoped>
.colorbends-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: transparent;
}
@media (prefers-reduced-motion: reduce) {
  .colorbends-canvas {
    animation: none;
  }
}
</style>
