<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <span ref="el" class="gradient-countup">{{ displayValue }}</span>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  value:    { type: [Number, String], default: 0 },
  duration: { type: Number, default: 1600 },
  suffix:   { type: String,  default: '' },
  prefix:   { type: String,  default: '' },
  decimals: { type: Number,  default: 0 },
})

const el = ref(null)
const displayValue = ref(props.prefix + '0' + props.suffix)
let observer = null
let animFrame = null
let triggered = false

function parseVal(v) {
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function format(n) {
  if (props.decimals > 0) {
    return props.prefix + n.toFixed(props.decimals) + props.suffix
  }
  return props.prefix + Math.round(n).toLocaleString('fr-FR') + props.suffix
}

function animate(target) {
  const start = Date.now()
  const from = 0

  function tick() {
    const elapsed = Date.now() - start
    const progress = Math.min(elapsed / props.duration, 1)
    // easeOutCubic
    const ease = 1 - Math.pow(1 - progress, 3)
    displayValue.value = format(from + (target - from) * ease)
    if (progress < 1) {
      animFrame = requestAnimationFrame(tick)
    }
  }
  if (animFrame) cancelAnimationFrame(animFrame)
  tick()
}

function trigger() {
  if (triggered) return
  triggered = true
  animate(parseVal(props.value))
}

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) trigger() },
    { threshold: 0.2 }
  )
  if (el.value) observer.observe(el.value)
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  if (animFrame) cancelAnimationFrame(animFrame)
})

// Re-animate if value changes while visible
watch(() => props.value, () => {
  triggered = false
  trigger()
})
</script>

<style scoped>
.gradient-countup {
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 40%, #8b5cf6 70%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  background-size: 200% 200%;
  animation: gradient-shift 4s ease infinite;
  font-variant-numeric: tabular-nums;
  display: inline-block;
}

@keyframes gradient-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
