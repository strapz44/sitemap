<template>
  <button class="noise-btn" :disabled="disabled" @click="$emit('click', $event)">
    <span class="noise-btn__bg" />
    <span class="noise-btn__noise" />
    <span class="noise-btn__inner">
      <slot />
    </span>
  </button>
</template>

<script setup>
defineProps({
  disabled: { type: Boolean, default: false },
})
defineEmits(['click'])
</script>

<style scoped>
.noise-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  padding: 2px;
  cursor: pointer;
  background: transparent;
  overflow: hidden;
  min-width: 120px;
  height: 48px;
}

.noise-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Animated gradient border */
.noise-btn__bg {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: conic-gradient(
    from var(--noise-angle, 0deg),
    #0ea5e9,
    #6366f1,
    #ec4899,
    #f97316,
    #22c55e,
    #0ea5e9
  );
  animation: noise-rotate 3s linear infinite;
}

/* Noise texture overlay */
.noise-btn__noise {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0.15;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 128px 128px;
  mix-blend-mode: overlay;
  pointer-events: none;
}

/* White inner pill */
.noise-btn__inner {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #ffffff;
  border-radius: 999px;
  padding: 0 22px;
  height: calc(100% - 4px);
  width: calc(100% - 4px);
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  transition: background 0.2s;
  z-index: 1;
}

.noise-btn:hover:not(:disabled) .noise-btn__inner {
  background: #f8fafc;
}

@property --noise-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@keyframes noise-rotate {
  to {
    --noise-angle: 360deg;
  }
}
</style>
