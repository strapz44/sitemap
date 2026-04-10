<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <span class="gradient-text"><slot /></span>
</template>

<script setup>
defineProps({
  colors: {
    type: Array,
    default: () => ['#38bdf8', '#6366f1', '#a78bfa', '#06b6d4', '#38bdf8'],
  },
  duration: { type: Number, default: 5 },
})
</script>

<style scoped>
.gradient-text {
  background: linear-gradient(
    90deg,
    #38bdf8 0%,
    #6366f1 25%,
    #a78bfa 50%,
    #06b6d4 75%,
    #38bdf8 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-flow 5s linear infinite;
  display: inline-block;
}

@keyframes gradient-flow {
  0%   { background-position: 0% center; }
  100% { background-position: 200% center; }
}
</style>
