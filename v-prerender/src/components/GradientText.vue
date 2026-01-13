<template>
  <div class="animated-gradient-text" :class="className">
    <div v-if="showBorder" class="gradient-overlay" :style="overlayStyle"></div>
    <span class="text-content" :style="textStyle">
      <slot />
    </span>
  </div>
</template>

<script setup>
/* eslint-env vue/setup-compiler-macros */
import { computed } from 'vue'

const props = defineProps({
  className: { type: String, default: '' },
  colors: { type: Array, default: () => ['#22c55e', '#8b5cf6'] },
  animationSpeed: { type: Number, default: 8 },
  showBorder: { type: Boolean, default: false },
  animated: { type: Boolean, default: false },
  strokeWidth: { type: Number, default: 0 },
  strokeColor: { type: String, default: 'rgba(0,0,0,0.45)' },
  shadow: { type: Boolean, default: false },
  textShadow: { type: String, default: '' },
})

const gradient = computed(() => `linear-gradient(to right, ${props.colors.join(', ')})`)

const overlayStyle = computed(() => ({
  backgroundImage: gradient.value,
  animationDuration: `${props.animationSpeed}s`,
}))

const textStyle = computed(() => {
  const style = {
    color: 'inherit',
    WebkitTextStrokeWidth: props.strokeWidth ? `${props.strokeWidth}px` : undefined,
    WebkitTextStrokeColor: props.strokeWidth ? props.strokeColor : undefined,
  }
  if (props.textShadow) {
    style.textShadow = props.textShadow
  } else if (props.shadow) {
    style.textShadow = '0 1px 2px rgba(0,0,0,0.45)'
  }
  return style
})
</script>

<style scoped>
.animated-gradient-text {
  position: relative;
  margin: 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 1.25rem;
  font-weight: 800;
  overflow: hidden;
}

.gradient-overlay {
  position: absolute;
  inset: 0;
  background-size: 300% 100%;
  border-radius: inherit;
  z-index: 0;
  pointer-events: none;
  animation: none;
}

.gradient-overlay::before {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background-color: #060010;
  z-index: -1;
}

.text-content {
  position: relative;
  z-index: 1;
  color: currentColor;
  background: none;
  -webkit-background-clip: initial;
  background-clip: initial;
  -webkit-text-fill-color: initial;
  animation: none;
}

@keyframes gradientMove {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
