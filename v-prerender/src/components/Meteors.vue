<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="meteors-wrapper" aria-hidden="true">
    <span
      v-for="m in meteors"
      :key="m.id"
      class="meteor"
      :style="{
        top: m.top + 'px',
        left: m.left + '%',
        animationDelay: m.delay + 's',
        animationDuration: m.duration + 's',
        width: m.size + 'px',
        opacity: m.opacity,
      }"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  count:   { type: Number, default: 14 },
  color:   { type: String, default: '#3b82f6' },
})

const meteors = computed(() =>
  Array.from({ length: props.count }, (_, i) => ({
    id:       i,
    top:      Math.random() * -60,
    left:     Math.random() * 100,
    delay:    Math.random() * 5,
    duration: 3 + Math.random() * 4,
    size:     60 + Math.random() * 80,
    opacity:  0.55 + Math.random() * 0.45,
  }))
)
</script>

<style scoped>
.meteors-wrapper {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
}

.meteor {
  position: absolute;
  height: 2px;
  border-radius: 9999px;
  /* Dégradé bleu → transparent vers la droite */
  background: linear-gradient(90deg, v-bind('props.color') 0%, transparent 100%);
  transform: rotate(215deg) translateX(0);
  animation: meteor linear infinite;
}

/* Petite étoile à la tête du météore */
.meteor::before {
  content: '';
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  width: 5px; height: 5px;
  border-radius: 50%;
  background: v-bind('props.color');
  box-shadow: 0 0 6px 2px v-bind('props.color');
}

@keyframes meteor {
  0%   { transform: rotate(215deg) translateX(0);      opacity: 1; }
  70%  { opacity: 1; }
  100% { transform: rotate(215deg) translateX(-600px); opacity: 0; }
}
</style>
