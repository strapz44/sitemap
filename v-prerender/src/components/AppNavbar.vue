<template>
  <!-- using the CardNav design from React Bits as the base for our navbar -->
  <CardNav
    :items="menuItems"
    className="premium-glass glass-surface glass-surface--fallback"
    baseColor="transparent"
    menuColor="#0f172a"
    buttonBgColor="#111111"
    buttonTextColor="#ffffff"
    ease="power3.out"
    @cta="go('dashboard')"
  >
    <!-- allow overriding CTA text if needed -->
    <template #cta>Connexion</template>
  </CardNav>
</template>

<script setup>
import { useRouter } from 'vue-router'
import CardNav from './CardNav.vue'

const router = useRouter()

function go(name) {
  router.push({ name })
}

// build the four primary cards used by the navigation
const menuItems = [
  {
    label: 'Dashboard',
    bgColor: 'rgba(255,255,255,0.15)',
    textColor: '#111',
    links: [
      {
        label: 'Voir',
        href: '#',
        ariaLabel: 'Aller au tableau de bord',
        onClick: () => go('dashboard')
      }
    ]
  },
  {
    label: 'Sitemaps',
    bgColor: 'rgba(255,255,255,0.15)',
    textColor: '#111',
    links: [
      {
        label: 'Explorer',
        href: '#',
        ariaLabel: 'Parcourir les sitemaps',
        onClick: () => go('home')
      }
    ]
  },
  {
    label: 'Analytics',
    bgColor: 'rgba(255,255,255,0.15)',
    textColor: '#111',
    links: [
      {
        label: 'Consulter',
        href: '#',
        ariaLabel: 'Voir les statistiques',
        onClick: () => go('analytics')
      }
    ]
  },
  {
    label: 'Globe',
    bgColor: 'rgba(14,165,233,0.12)',
    textColor: '#0ea5e9',
    links: [
      {
        label: 'Visualiser',
        href: '#',
        ariaLabel: 'Globe temps réel des sites',
        onClick: () => go('globe')
      }
    ]
  }
]
</script>
