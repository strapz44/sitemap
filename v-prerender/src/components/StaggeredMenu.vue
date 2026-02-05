<template>
  <div class="staggered-menu" ref="root">
    <div v-for="(text, i) in items" :key="i" class="line">
      <div class="line-bg"></div>
      <div class="line-text">{{ text }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, default: () => [
    'Se connecter',
    'Projets',
    'Sitemaps',
    'Rapports',
    'Paramètres',
    'Aide'
  ] }
})

const root = ref(null)
let tl

onMounted(async () => {
  await nextTick()
  const lines = root.value ? root.value.querySelectorAll('.line') : []
  tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
  tl.from(lines, { y: 14, opacity: 0, scaleX: 0.85, transformOrigin: 'left center', stagger: 0.06, duration: 0.5 }, 0)
  tl.fromTo(lines, { filter: 'blur(2px)' }, { filter: 'blur(0px)', stagger: 0.06, duration: 0.4 }, 0)
  if (props.open) tl.play(0)
})

watch(() => props.open, (v) => {
  if (!tl) return
  if (v) tl.play()
  else tl.reverse()
})
</script>

<style scoped>
.staggered-menu { display: grid; gap: 10px; padding: 8px 0 16px; }
.line { position: relative; height: 36px; border-radius: 12px; overflow: hidden; }
.line-bg { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(27,253,156,0.22), rgba(27,253,156,0.08) 40%, rgba(4,16,21,0.08) 70%, rgba(4,16,21,0.12)); border: 1px solid rgba(27,253,156,0.25); box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 16px rgba(4,16,21,0.12); }
.line-text { position: relative; z-index: 1; height: 100%; display: flex; align-items: center; padding: 0 14px; font-weight: 600; letter-spacing: .02em; color: #0b1220; mix-blend-mode: multiply; }
.line::after { content: ""; position: absolute; left: -30%; top: 0; bottom: 0; width: 30%; background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.65), rgba(255,255,255,0)); transform: skewX(-18deg); filter: blur(1px); opacity: 0.65; animation: sheen 2.6s ease-in-out infinite; }
@keyframes sheen { 0% { left: -30%; } 65% { left: 120%; } 100% { left: 120%; } }
@media (max-width: 480px) { .line { height: 32px } }
</style>
