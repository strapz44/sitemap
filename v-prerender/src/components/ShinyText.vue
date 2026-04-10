<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <span class="shiny-text"><slot /></span>
</template>

<script setup>
defineProps({
  speed: { type: Number, default: 3 },
})
</script>

<style scoped>
.shiny-text {
  position: relative;
  display: inline-block;
  overflow: hidden;
}

/* Shiny sweep overlay */
.shiny-text::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(255, 255, 255, 0.65) 50%,
    transparent 70%
  );
  background-size: 200% 100%;
  animation: shiny-sweep 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes shiny-sweep {
  0%   { background-position: -200% center; }
  60%  { background-position: 200% center; }
  100% { background-position: 200% center; }
}
</style>
