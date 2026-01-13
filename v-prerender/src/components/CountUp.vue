<template>
  <span class="countup" @mouseenter="start" @mouseleave="stop" :class="{ hovered: isHover }">{{ display }}</span>
</template>

<script setup>
import { ref, watch, onUnmounted, onMounted } from 'vue'

const props = defineProps({
  value: { type: Number, required: true },
  duration: { type: Number, default: 800 }
})

const display = ref(props.value)
const isHover = ref(false)
let rafId = 0

function animate(from, to, duration) {
  cancelAnimationFrame(rafId)
  const startTime = performance.now()
  const step = (t) => {
    const p = Math.min((t - startTime) / duration, 1)
    const eased = 1 - Math.pow(1 - p, 3)
    display.value = Math.round(from + (to - from) * eased)
    if (p < 1) rafId = requestAnimationFrame(step)
  }
  display.value = from
  rafId = requestAnimationFrame(step)
}

function start() {
  cancelAnimationFrame(rafId)
  const startTime = performance.now()
  const startVal = 0
  const endVal = Number.isFinite(props.value) ? props.value : 0
  isHover.value = true
  const step = (t) => {
    const p = Math.min((t - startTime) / props.duration, 1)
    const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
    display.value = Math.round(startVal + (endVal - startVal) * eased)
    if (p < 1) rafId = requestAnimationFrame(step)
  }
  display.value = 0
  rafId = requestAnimationFrame(step)
}

function stop() {
  isHover.value = false
  cancelAnimationFrame(rafId)
  display.value = Number.isFinite(props.value) ? props.value : 0
}

onUnmounted(() => cancelAnimationFrame(rafId))

watch(() => props.value, (v) => {
  if (!isHover.value) display.value = Number.isFinite(v) ? v : 0
})

onMounted(() => {
  const endVal = Number.isFinite(props.value) ? props.value : 0
  animate(0, endVal, Math.max(400, props.duration))
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
.countup {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-size: 1.15em;
  letter-spacing: 0.01em;
  transition: transform .25s ease, text-shadow .25s ease;
  display: inline-block;
  color: currentColor;
  background: none;
  background-size: initial;
  -webkit-background-clip: initial;
          background-clip: initial;
}
.countup.hovered {
  transform: none;
  text-shadow: none;
  animation: none;
}

@keyframes gradientShift {
  0% { }
  100% { }
}
</style>
