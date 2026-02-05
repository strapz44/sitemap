<template>
  <div
    ref="containerRef"
    :class="['glass-surface', svgSupported ? 'glass-surface--svg' : 'glass-surface--fallback', rootClass]"
    :style="containerStyle"
  >
    <svg class="glass-surface__filter" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter :id="filterId" colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
          <feImage ref="feImageRef" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
          <feDisplacementMap ref="redChannelRef" in="SourceGraphic" in2="map" id="redchannel" result="dispRed" />
          <feColorMatrix in="dispRed" type="matrix" :values="matrixRed" result="red" />
          <feDisplacementMap ref="greenChannelRef" in="SourceGraphic" in2="map" id="greenchannel" result="dispGreen" />
          <feColorMatrix in="dispGreen" type="matrix" :values="matrixGreen" result="green" />
          <feDisplacementMap ref="blueChannelRef" in="SourceGraphic" in2="map" id="bluechannel" result="dispBlue" />
          <feColorMatrix in="dispBlue" type="matrix" :values="matrixBlue" result="blue" />
          <feBlend in="red" in2="green" mode="screen" result="rg" />
          <feBlend in="rg" in2="blue" mode="screen" result="output" />
          <feGaussianBlur ref="gaussianBlurRef" in="output" :stdDeviation="displace.toString()" />
        </filter>
      </defs>
    </svg>
    <div class="glass-surface__content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import '@/components/GlassSurface.css'

const props = defineProps({
  width: { type: [Number, String], default: '100%' },
  height: { type: [Number, String], default: 'auto' },
  borderRadius: { type: Number, default: 20 },
  borderWidth: { type: Number, default: 0.07 },
  brightness: { type: Number, default: 50 },
  opacity: { type: Number, default: 0.93 },
  blur: { type: Number, default: 11 },
  displace: { type: Number, default: 0.5 },
  backgroundOpacity: { type: Number, default: 0.1 },
  saturation: { type: Number, default: 1 },
  distortionScale: { type: Number, default: -180 },
  redOffset: { type: Number, default: 0 },
  greenOffset: { type: Number, default: 10 },
  blueOffset: { type: Number, default: 20 },
  xChannel: { type: String, default: 'R' },
  yChannel: { type: String, default: 'G' },
  mixBlendMode: { type: String, default: 'difference' },
  rootClass: { type: String, default: '' },
  rootStyle: { type: [Object, String], default: () => ({}) },
})

const containerRef = ref(null)
const feImageRef = ref(null)
const redChannelRef = ref(null)
const greenChannelRef = ref(null)
const blueChannelRef = ref(null)
const gaussianBlurRef = ref(null)
const svgSupported = ref(false)

const uid = Math.random().toString(36).slice(2)
const filterId = computed(() => `glass-filter-${uid}`)

const matrixRed = '1 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 1 0'
const matrixGreen = '0 0 0 0 0\n0 1 0 0 0\n0 0 0 0 0\n0 0 0 1 0'
const matrixBlue = '0 0 0 0 0\n0 0 0 0 0\n0 0 1 0 0\n0 0 0 1 0'

const containerStyle = computed(() => ({
  ...(typeof props.rootStyle === 'string' ? {} : props.rootStyle),
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  borderRadius: `${props.borderRadius}px`,
  '--glass-frost': props.backgroundOpacity,
  '--glass-saturation': props.saturation,
  '--filter-id': `url(#${filterId.value})`,
}))

function supportsSVGFilters() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
  const isFirefox = /Firefox/.test(navigator.userAgent)
  if (isWebkit || isFirefox) return false
  const div = document.createElement('div')
  div.style.backdropFilter = `url(#${filterId.value})`
  return div.style.backdropFilter !== ''
}

function generateDisplacementMap() {
  const rect = containerRef.value?.getBoundingClientRect()
  const actualWidth = rect?.width || 400
  const actualHeight = rect?.height || 200
  const edgeSize = Math.min(actualWidth, actualHeight) * (props.borderWidth * 0.5)
  const svgContent = `
    <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="red-grad-${uid}" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#0000"/>
          <stop offset="100%" stop-color="red"/>
        </linearGradient>
        <linearGradient id="blue-grad-${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0000"/>
          <stop offset="100%" stop-color="blue"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
      <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${props.borderRadius}" fill="url(#red-grad-${uid})" />
      <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${props.borderRadius}" fill="url(#blue-grad-${uid})" style="mix-blend-mode: ${props.mixBlendMode}" />
      <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${props.borderRadius}" fill="hsl(0 0% ${props.brightness}% / ${props.opacity})" style="filter:blur(${props.blur}px)" />
    </svg>
  `
  return `data:image/svg+xml,${encodeURIComponent(svgContent)}`
}

function updateDisplacementMap() {
  if (feImageRef.value) feImageRef.value.setAttribute('href', generateDisplacementMap())
  ;[
    { ref: redChannelRef, offset: props.redOffset },
    { ref: greenChannelRef, offset: props.greenOffset },
    { ref: blueChannelRef, offset: props.blueOffset },
  ].forEach(({ ref, offset }) => {
    if (ref.value) {
      ref.value.setAttribute('scale', (props.distortionScale + offset).toString())
      ref.value.setAttribute('xChannelSelector', props.xChannel)
      ref.value.setAttribute('yChannelSelector', props.yChannel)
    }
  })
  if (gaussianBlurRef.value) gaussianBlurRef.value.setAttribute('stdDeviation', props.displace.toString())
}

onMounted(() => {
  svgSupported.value = supportsSVGFilters()
  updateDisplacementMap()
  const ro = new ResizeObserver(() => setTimeout(updateDisplacementMap, 0))
  if (containerRef.value) ro.observe(containerRef.value)
})

watch(
  () => [
    props.width, props.height, props.borderRadius, props.borderWidth,
    props.brightness, props.opacity, props.blur, props.displace,
    props.distortionScale, props.redOffset, props.greenOffset, props.blueOffset,
    props.xChannel, props.yChannel, props.mixBlendMode,
  ],
  () => setTimeout(updateDisplacementMap, 0)
)
</script>
