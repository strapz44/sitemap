<template>
  <div class="pin3d" @mousemove="onMove" @mouseleave="onLeave">
    <div class="pin3d__card" :style="cardStyle">
      <slot />
    </div>
    <div class="pin3d__stem">
      <div class="pin3d__line" />
      <div class="pin3d__dot" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const rotX = ref(0)
const rotY = ref(0)

const cardStyle = computed(() => ({
  transform: `perspective(800px) rotateX(${rotX.value}deg) rotateY(${rotY.value}deg) translateZ(10px)`,
}))

function onMove(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width - 0.5
  const y = (e.clientY - rect.top) / rect.height - 0.5
  rotY.value = (x * 12).toFixed(1)
  rotX.value = (-y * 12).toFixed(1)
}

function onLeave() {
  rotX.value = 0
  rotY.value = 0
}
</script>

<style scoped>
.pin3d {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.pin3d__card {
  transition: transform 0.15s ease-out;
  transform-origin: 50% 100%;
  will-change: transform;
}

.pin3d__stem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.pin3d__line {
  width: 1.5px;
  height: 24px;
  background: linear-gradient(to bottom, #0ea5e9, transparent);
}

.pin3d__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #0ea5e9;
  box-shadow: 0 0 8px rgba(14, 165, 233, 0.5);
  animation: pin-pulse 2s ease-in-out infinite;
}

@keyframes pin-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(14, 165, 233, 0.5); }
  50% { box-shadow: 0 0 16px rgba(14, 165, 233, 0.8); }
}
</style>
