<template>
  <div class="grid-highlights" aria-hidden="true">
    <div
      v-for="(h, i) in highlights"
      :key="h.id + '-' + i"
      class="highlight"
      :style="{
        left: h.x + 'px',
        top: h.y + 'px',
        width: (squareSize - (h.inset||0)*2) + 'px',
        height: (squareSize - (h.inset||0)*2) + 'px',
        animationDuration: duration + 'ms',
        boxShadow: glowShadow,
        background: fillGradient,
      }"
    />
  </div>
</template>

<script setup>
/* eslint-env vue/setup-compiler-macros */
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'

const props = defineProps({
  squareSize: { type: Number, default: 48 },
  count: { type: Number, default: 2 },
  duration: { type: Number, default: 1400 }, // ms, fade in/out total (faster)
  interval: { type: Number, default: 700 },  // ms between spawns (overlap for continuity)
  color: { type: String, default: '#8b5cf6' }, // violet
  intensity: { type: Number, default: 0.35 },  // 0..1 for shadow strength
})

const highlights = ref([])
const viewW = ref(window.innerWidth)
const viewH = ref(window.innerHeight)

const glowShadow = computed(() => [
  // core violet glow layers
  `0 0 12px rgba(139,92,246,${props.intensity})`,
  `0 0 24px rgba(139,92,246,${props.intensity * 0.85})`,
  `0 0 48px rgba(139,92,246,${props.intensity * 0.6})`,
  // subtle neon-green rim echoing button hovers
  `0 0 36px rgba(27,253,156,0.10)`,
  `0 0 72px rgba(27,253,156,0.08)`
].join(', '))
const fillGradient = computed(() => `radial-gradient(55% 55% at 50% 50%, rgba(139,92,246,0.18), rgba(139,92,246,0.0))`)

let timerId = 0

function resize() {
  viewW.value = window.innerWidth
  viewH.value = window.innerHeight
}

function randomPositions(n) {
  const cols = Math.ceil(viewW.value / props.squareSize)
  const rows = Math.ceil(viewH.value / props.squareSize)
  const set = new Set()
  const res = []
  while (res.length < n) {
    const c = Math.floor(Math.random() * cols)
    const r = Math.floor(Math.random() * rows)
    const key = `${c}:${r}`
    if (set.has(key)) continue
    set.add(key)
    // Align highlight inside the cell (avoid bleeding over grid lines)
    const inset = 1 // grid lines ~2px, inset by 1px each side
    res.push({
      id: key + '-' + Date.now(),
      x: c * props.squareSize + inset,
      y: r * props.squareSize + inset,
      inset,
    })
  }
  return res
}

function spawn() {
  const batch = randomPositions(props.count)
  highlights.value = batch
}

onMounted(() => {
  window.addEventListener('resize', resize)
  // initial
  spawn()
  timerId = window.setInterval(spawn, props.interval)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  if (timerId) clearInterval(timerId)
})

watch(() => [props.squareSize, props.count, props.duration, props.interval], () => {
  // restart cycle on prop change
  if (timerId) clearInterval(timerId)
  spawn()
  timerId = window.setInterval(spawn, props.interval)
})
</script>

<style scoped>
.grid-highlights {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0; /* keep behind content, above background */
}

.highlight {
  position: absolute;
  border-radius: 6px;
  /* stay fully inside the cell: size is adjusted via inline style */
  mix-blend-mode: screen;
  will-change: opacity, transform, box-shadow;
  backface-visibility: hidden;
  animation-name: pulseFade;
  animation-timing-function: cubic-bezier(.22,.61,.36,1); /* smoother */
  animation-fill-mode: both;
}

@keyframes pulseFade {
  0%   { opacity: 0;   transform: scale(0.96); }
  20%  { opacity: 1;   transform: scale(1); }
  80%  { opacity: 1;   transform: scale(1); }
  100% { opacity: 0;   transform: scale(1.02); }
}
</style>
