<template>
  <button class="glass-icon" :class="'tone-' + tone" :style="sizeStyle" :aria-label="label" @click="$emit('click')">
    <span class="glow"></span>
    <span class="inner">
      <slot>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 11l9-7 9 7"/><path d="M9 22V12h6v10"/>
        </svg>
      </slot>
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  tone: { type: String, default: 'violet' }, // blue | violet | green | orange | red
  size: { type: Number, default: 48 },
  label: { type: String, default: '' },
})

defineEmits(['click'])

const sizeStyle = computed(() => ({
  width: props.size + 'px',
  height: props.size + 'px',
}))
</script>

<style scoped>
.glass-icon {
  position: relative;
  display: grid; place-items: center;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(20,22,26,0.70), rgba(20,22,26,0.45));
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.92);
  backdrop-filter: saturate(200%) blur(12px);
  -webkit-backdrop-filter: saturate(200%) blur(12px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10);
  overflow: hidden;
  cursor: pointer;
  transition: transform .15s ease, box-shadow .2s ease, border-color .2s ease, color .2s ease;
}
.glass-icon:hover { transform: translateY(-2px); color: #fff; border-color: var(--accent-border); box-shadow: 0 14px 28px rgba(0,0,0,0.34); }
.glass-icon:focus-visible { outline: none; box-shadow: 0 0 0 4px var(--accent-ring), 0 14px 28px rgba(0,0,0,0.34); border-color: var(--accent); }

.inner { position: relative; z-index: 2; display: grid; place-items: center; }
.glow {
  position: absolute; inset: -12px; border-radius: 16px; filter: blur(16px); opacity: .0; transform: translateY(8px);
  transition: opacity .25s ease, transform .25s ease;
  animation: iconFlow 12s ease-in-out infinite;
}
.glass-icon:hover .glow { opacity: .95; transform: translateY(0); }

.glass-icon::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: 12px;
  background: linear-gradient(110deg, rgba(255,255,255,0.18), rgba(255,255,255,0.0) 40%, rgba(255,255,255,0.0) 60%, rgba(255,255,255,0.12));
  mix-blend-mode: screen;
  background-size: 300% 100%;
  animation: iconSheen 5s ease-in-out infinite;
  pointer-events: none;
}

/* Tone backgrounds */
.tone-blue .glow { background: radial-gradient(42% 50% at 22% 30%, rgba(56,189,248,0.75), transparent 60%), radial-gradient(42% 50% at 76% 72%, rgba(10,132,255,0.75), transparent 60%); }
.tone-violet .glow { background: radial-gradient(42% 50% at 22% 30%, rgba(139,92,246,0.75), transparent 60%), radial-gradient(42% 50% at 76% 72%, rgba(98,0,234,0.65), transparent 60%); }
.tone-green .glow { background: radial-gradient(42% 50% at 22% 30%, rgba(34,197,94,0.75), transparent 60%), radial-gradient(42% 50% at 76% 72%, rgba(16,185,129,0.65), transparent 60%); }
.tone-orange .glow { background: radial-gradient(42% 50% at 22% 30%, rgba(251,146,60,0.75), transparent 60%), radial-gradient(42% 50% at 76% 72%, rgba(245,158,11,0.65), transparent 60%); }
.tone-red .glow { background: radial-gradient(42% 50% at 22% 30%, rgba(244,63,94,0.75), transparent 60%), radial-gradient(42% 50% at 76% 72%, rgba(239,68,68,0.65), transparent 60%); }

@keyframes iconSheen {
  0% { background-position: -120% 0; }
  50% { background-position: 120% 0; }
  100% { background-position: -120% 0; }
}

@keyframes iconFlow {
  0% { transform: translateY(8px); }
  50% { transform: translateY(0); }
  100% { transform: translateY(8px); }
}
</style>
