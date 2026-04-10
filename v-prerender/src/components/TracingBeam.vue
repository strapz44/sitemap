<template>
  <div class="tracing-beam" ref="wrapperRef">

    <!-- SVG sticky dans le viewport -->
    <div class="beam-rail">
      <svg
        width="20"
        :height="svgH"
        viewBox="0 0 20 100"
        preserveAspectRatio="none"
        style="overflow:visible"
      >
        <defs>
          <linearGradient :id="`grad-${uid}`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="#18CCFC" stop-opacity="0" />
            <stop offset="20%"  stop-color="#18CCFC" />
            <stop offset="55%"  stop-color="#6344F5" />
            <stop offset="100%" stop-color="#AE48FF" stop-opacity="0" />
          </linearGradient>

          <!-- Filtre glow néon -->
          <filter :id="`glow-${uid}`" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="2.5" result="blur1"/>
            <feGaussianBlur stdDeviation="1"   result="blur2"/>
            <feMerge>
              <feMergeNode in="blur1"/>
              <feMergeNode in="blur2"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Rail gris pointillé -->
        <line
          x1="10" y1="0" x2="10" y2="100"
          stroke="#d1d5db"
          stroke-width="1.5"
          stroke-dasharray="3 5"
          vector-effect="non-scaling-stroke"
        />

        <!-- Beam néon rempli selon scroll -->
        <line
          x1="10" y1="0"
          x2="10" :y2="beamPct"
          :stroke="`url(#grad-${uid})`"
          stroke-width="3"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
          :filter="`url(#glow-${uid})`"
        />

        <!-- Dot avec halo -->
        <circle
          cx="10" :cy="beamPct"
          r="5"
          fill="#6344F5"
          :filter="`url(#glow-${uid})`"
        />
        <circle
          cx="10" :cy="beamPct"
          r="9"
          fill="none"
          stroke="#6344F540"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
        />
      </svg>
    </div>

    <!-- Contenu -->
    <div class="beam-body" ref="bodyRef">
      <slot />
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const uid = Math.random().toString(36).slice(2, 7)

const wrapperRef = ref(null)
const bodyRef    = ref(null)

// Hauteur SVG sticky = 80% du viewport
const svgH = ref(window.innerHeight * 0.8)

// Progression 0–100 (en coordonnées viewBox)
const progress = ref(0)

const beamPct = computed(() => Math.max(2, Math.min(98, progress.value)))

function update() {
  if (!wrapperRef.value) return
  const rect    = wrapperRef.value.getBoundingClientRect()
  const total   = rect.height - window.innerHeight
  const scrolled = Math.max(0, -rect.top)
  // ratio 0→1 sur la hauteur défilée
  const ratio = total > 0 ? Math.min(1, scrolled / total) : 0
  progress.value = ratio * 100
}

function onScroll() { update() }
function onResize() {
  svgH.value = window.innerHeight * 0.8
  update()
}

onMounted(() => {
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.tracing-beam {
  display: flex;
  align-items: flex-start;
  width: 100%;
  gap: 0;
}

.beam-rail {
  flex-shrink: 0;
  width: 20px;
  margin-right: 20px;
  position: sticky;
  top: 100px;           /* sous la navbar */
  align-self: flex-start;
  height: v-bind(svgH + 'px');
}

.beam-body {
  flex: 1;
  min-width: 0;
}
</style>
