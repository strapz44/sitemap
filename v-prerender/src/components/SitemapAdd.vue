<template>
  <div class="form-container">
    <h2 class="sitemap-title">SITEMAP</h2>
    <button @click="addSitemap">Ajouter</button>
  </div>
</template>

<script setup>
import { SitemapController } from '@/controllers/SitemapController';
import { ref } from 'vue';

const url = ref('');

const addSitemap = async () => {
  const response = await SitemapController.post(url.value);
  console.log('Valeur de l’input :', response);
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&display=swap');

.form-container {
  background: rgba(28, 28, 28, 0.65);
  padding: 2rem;
  margin-top: 2rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
  font-family: 'Inter', sans-serif;
}

/* Titre avec Bebas Neue + dégradé métallique */
.section-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2.2rem;
  font-weight: 400;
  background: linear-gradient(90deg, #c0c0c0, #a0a0a0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 6px rgba(192, 192, 192, 0.3);
  margin-bottom: 1.2rem;
}

/* Champ input stylé */
input[type="text"] {
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(45, 45, 45, 0.7);
  color: #fff;
  margin-bottom: 1rem;
  font-size: 1rem;
  font-family: 'Inter', sans-serif;
}

/* Bouton style lime modernisé */
button {
  background-color: #32cd32;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  color: #121212;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
}

button:hover {
  background-color: #a7ff9d;
  color: #000;
}
.sitemap-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 3rem;
  color: #32cd32; /* vert lime */
  letter-spacing: 2px;
  text-shadow: 0 0 8px rgba(50, 205, 50, 0.4), 
               0 0 16px rgba(50, 205, 50, 0.2);
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
}

</style>
