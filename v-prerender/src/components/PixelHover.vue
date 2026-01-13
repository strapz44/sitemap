<template>
  <div ref="containerRef" class="pixel-card">
    <canvas class="pixel-canvas" ref="canvasRef"></canvas>
    <div class="pixel-content">
      <slot />
    </div>
  </div>
</template>

<script setup>
/* eslint-env vue/setup-compiler-macros */
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'

class Pixel {
  constructor(canvas, context, x, y, color, speed, delay) {
    this.width = canvas.width
    this.height = canvas.height
    this.ctx = context
    this.x = x
    this.y = y
    this.color = color
    this.speed = (Math.random() * 0.8 + 0.1) * speed
    this.size = 0
    this.sizeStep = Math.random() * 0.4
    this.minSize = 0.5
    this.maxSizeInteger = 2
    this.maxSize = Math.random() * (this.maxSizeInteger - this.minSize) + this.minSize
    this.delay = delay
    this.counter = 0
    this.counterStep = Math.random() * 4 + (this.width + this.height) * 0.01
    this.isIdle = false
    this.isReverse = false
    this.isShimmer = false
  }
  draw() {
    const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5
    this.ctx.fillStyle = this.color
    this.ctx.fillRect(this.x + centerOffset, this.y + centerOffset, this.size, this.size)
  }
  appear() {
    this.isIdle = false
    if (this.counter <= this.delay) {
      this.counter += this.counterStep
      return
    }
    if (this.size >= this.maxSize) this.isShimmer = true
    if (this.isShimmer) this.shimmer()
    else this.size += this.sizeStep
    this.draw()
  }
  disappear() {
    this.isShimmer = false
    this.counter = 0
    if (this.size <= 0) { this.isIdle = true; return }
    else this.size -= 0.1
    this.draw()
  }
  shimmer() {
    if (this.size >= this.maxSize) this.isReverse = true
    else if (this.size <= this.minSize) this.isReverse = false
    if (this.isReverse) this.size -= this.speed
    else this.size += this.speed
  }
}

const props = defineProps({
  variant: { type: String, default: 'default' },
  gap: { type: Number, default: 8 },
  speed: { type: Number, default: 35 },
  colors: { type: String, default: 'rgba(27,253,156,0.18),rgba(139,92,246,0.18),rgba(139,92,246,0.10)' },
  noFocus: { type: Boolean, default: true },
})

const containerRef = ref(null)
const canvasRef = ref(null)
const pixelsRef = ref([])
const animationRef = ref(0)
const timePreviousRef = ref(performance.now())
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function getEffectiveSpeed(value, reduced) {
  const min = 0, max = 100, throttle = 0.001
  const v = parseInt(value, 10)
  if (v <= min || reduced) return min
  if (v >= max) return max * throttle
  return v * throttle
}

function initPixels() {
  if (!containerRef.value || !canvasRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const width = Math.floor(rect.width)
  const height = Math.floor(rect.height)
  const ctx = canvasRef.value.getContext('2d')
  canvasRef.value.width = width
  canvasRef.value.height = height
  canvasRef.value.style.width = width + 'px'
  canvasRef.value.style.height = height + 'px'

  const colorsArray = props.colors.split(',')
  const pxs = []
  for (let x = 0; x < width; x += props.gap) {
    for (let y = 0; y < height; y += props.gap) {
      const color = colorsArray[Math.floor(Math.random() * colorsArray.length)]
      const dx = x - width / 2
      const dy = y - height / 2
      const distance = Math.sqrt(dx * dx + dy * dy)
      const delay = reducedMotion ? 0 : distance
      pxs.push(new Pixel(canvasRef.value, ctx, x, y, color, getEffectiveSpeed(props.speed, reducedMotion), delay))
    }
  }
  pixelsRef.value = pxs
}

function doAnimate(fnName) {
  animationRef.value = requestAnimationFrame(() => doAnimate(fnName))
  const timeNow = performance.now()
  const timePassed = timeNow - timePreviousRef.value
  const timeInterval = 1000 / 60
  if (timePassed < timeInterval) return
  timePreviousRef.value = timeNow - (timePassed % timeInterval)
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx || !canvasRef.value) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  let allIdle = true
  for (let i = 0; i < pixelsRef.value.length; i++) {
    const pixel = pixelsRef.value[i]
    pixel[fnName]()
    if (!pixel.isIdle) allIdle = false
  }
  if (allIdle) cancelAnimationFrame(animationRef.value)
}

function handleAnimation(name) {
  cancelAnimationFrame(animationRef.value)
  animationRef.value = requestAnimationFrame(() => doAnimate(name))
}

function onMouseEnter() { handleAnimation('appear') }
function onMouseLeave() { handleAnimation('disappear') }
function onFocus(e) { if (!props.noFocus && !e.currentTarget.contains(e.relatedTarget)) handleAnimation('appear') }
function onBlur(e) { if (!props.noFocus && !e.currentTarget.contains(e.relatedTarget)) handleAnimation('disappear') }

onMounted(() => {
  initPixels()
  const observer = new ResizeObserver(() => initPixels())
  if (containerRef.value) observer.observe(containerRef.value)
  containerRef.value?.addEventListener('mouseenter', onMouseEnter)
  containerRef.value?.addEventListener('mouseleave', onMouseLeave)
  if (!props.noFocus) {
    containerRef.value?.addEventListener('focusin', onFocus)
    containerRef.value?.addEventListener('focusout', onBlur)
    containerRef.value.tabIndex = 0
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationRef.value)
  if (containerRef.value) {
    containerRef.value.removeEventListener('mouseenter', onMouseEnter)
    containerRef.value.removeEventListener('mouseleave', onMouseLeave)
    containerRef.value.removeEventListener('focusin', onFocus)
    containerRef.value.removeEventListener('focusout', onBlur)
  }
})

watch(() => [props.gap, props.speed, props.colors], () => initPixels())
</script>

<style scoped>
.pixel-card {
  position: relative;
  overflow: hidden;
}
.pixel-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.pixel-content { position: relative; z-index: 1; }
</style>
