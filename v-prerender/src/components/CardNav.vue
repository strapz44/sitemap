<template>
  <div :class="['card-nav-container']">
    <nav
      ref="navRef"
      :class="['card-nav', className, { open: isExpanded }]"
      :style="navStyle"
    >
      <div class="card-nav-top">
        <div
          :class="['hamburger-menu', { open: isHamburgerOpen }]"
          @click="toggleMenu"
          role="button"
          :aria-label="isExpanded ? 'Fermer le menu' : 'Ouvrir le menu'"
          tabindex="0"
          :style="{ color: menuColor || '#000' }"
        >
          <div class="hamburger-line" />
          <div class="hamburger-line" />
          <div class="hamburger-line" />
        </div>

        <!-- logo only shown when prop provided -->
        <div v-if="logo" class="logo-container">
          <img :src="logo" :alt="logoAlt" class="logo" />
        </div>

        <button
          type="button"
          class="card-nav-cta-button"
          :style="{ backgroundColor: buttonBgColor, color: buttonTextColor }"
          @click="$emit('cta')"
        >
          <slot name="cta">Get&nbsp;Started</slot>
        </button>
      </div>

      <div class="card-nav-content" :aria-hidden="!isExpanded">
        <div
          v-for="(item, idx) in (items || []).slice(0, 3)"
          :key="`${item.label}-${idx}`"
          class="nav-card"
          :ref="setCardRef(idx)"
          :style="{ '--nav-card-bg': item.bgColor, color: item.textColor }"
        >
          <div class="nav-card-label">{{ item.label }}</div>
          <div class="nav-card-links">
            <a
              v-for="(lnk, i) in item.links || []"
              :key="`${lnk.label}-${i}`"
              class="nav-card-link"
              :href="lnk.href"
              :aria-label="lnk.ariaLabel"
              @click.prevent="lnk.onClick && lnk.onClick()"
            >
              <!-- React icon for arrow -->
              <GoArrowUpRight class="nav-card-link-icon" aria-hidden="true" />
              {{ lnk.label }}
            </a>
          </div>
        </div>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import './CardNav.css'
import { GoArrowUpRight } from 'react-icons/go'

const props = defineProps({
  logo: String,
  logoAlt: { type: String, default: 'Logo' },
  items: { type: Array, default: () => [] },
  className: { type: String, default: '' },
  ease: { type: String, default: 'power3.out' },
  baseColor: { type: String, default: 'transparent' },
  menuColor: String,
  buttonBgColor: String,
  buttonTextColor: String
})

import { computed } from 'vue'

const navStyle = computed(() => {
  return props.baseColor && props.baseColor !== 'transparent'
    ? { backgroundColor: props.baseColor }
    : {}
})


const isHamburgerOpen = ref(false)
const isExpanded = ref(false)
const navRef = ref(null)
const cardsRef = ref([])
const tlRef = ref(null)

const calculateHeight = () => {
  const navEl = navRef.value
  if (!navEl) return 260

  const isMobile = window.matchMedia('(max-width: 768px)').matches
  if (isMobile) {
    const contentEl = navEl.querySelector('.card-nav-content')
    if (contentEl) {
      const wasVisible = contentEl.style.visibility
      const wasPointerEvents = contentEl.style.pointerEvents
      const wasPosition = contentEl.style.position
      const wasHeight = contentEl.style.height

      contentEl.style.visibility = 'visible'
      contentEl.style.pointerEvents = 'auto'
      contentEl.style.position = 'static'
      contentEl.style.height = 'auto'

      contentEl.offsetHeight

      const topBar = 60
      const padding = 16
      const contentHeight = contentEl.scrollHeight

      contentEl.style.visibility = wasVisible
      contentEl.style.pointerEvents = wasPointerEvents
      contentEl.style.position = wasPosition
      contentEl.style.height = wasHeight

      return topBar + contentHeight + padding
    }
  }
  return 260
}

const createTimeline = () => {
  const navEl = navRef.value
  if (!navEl) return null

  gsap.set(navEl, { height: 60, overflow: 'hidden' })
  gsap.set(cardsRef.value, { y: 50, opacity: 0 })

  const tl = gsap.timeline({ paused: true })

  tl.to(navEl, {
    height: calculateHeight,
    duration: 0.4,
    ease: props.ease
  })

  tl.to(
    cardsRef.value,
    { y: 0, opacity: 1, duration: 0.4, ease: props.ease, stagger: 0.08 },
    '-=0.1'
  )

  return tl
}

onMounted(() => {
  nextTick(() => {
    tlRef.value = createTimeline()
  })
  const handleResize = () => {
    if (!tlRef.value) return
    if (isExpanded.value) {
      const newHeight = calculateHeight()
      gsap.set(navRef.value, { height: newHeight })

      tlRef.value.kill()
      const newTl = createTimeline()
      if (newTl) {
        newTl.progress(1)
        tlRef.value = newTl
      }
    } else {
      tlRef.value.kill()
      const newTl = createTimeline()
      if (newTl) {
        tlRef.value = newTl
      }
    }
  }
  window.addEventListener('resize', handleResize)

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
  })
})

watch(
  () => props.items,
  () => {
    tlRef.value?.kill()
    tlRef.value = createTimeline()
  }
)

const toggleMenu = () => {
  const tl = tlRef.value
  if (!tl) return
  if (!isExpanded.value) {
    isHamburgerOpen.value = true
    isExpanded.value = true
    tl.play(0)
  } else {
    isHamburgerOpen.value = false
    tl.eventCallback('onReverseComplete', () => (isExpanded.value = false))
    tl.reverse()
  }
}

const setCardRef = (i) => (el) => {
  if (el) cardsRef.value[i] = el
}
</script>

<style scoped src="./CardNav.css"></style>
