<template>
  <nav class="navbar">
    <div class="nav-left">
      <router-link to="/" class="nav-link">Accueil</router-link>
      <router-link to="/sitemap" class="nav-link">Gestion des sitemaps</router-link>
    </div>
  </nav>
</template>
<router-link to="/">Accueil</router-link>
<router-link to="/sitemap">Sitemap</router-link>

<style scoped>
.navbar {
  background-color: #44D62C;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
}

.nav-left {
  display: flex;
  gap: 20px;
}

.nav-link {
  color: #121212;
  text-decoration: none;
  font-weight: 600;
  font-family: 'Orbitron', sans-serif;
  transition: color 0.3s;
}

.nav-link:hover {
  color: #ffffff;
}
</style>
