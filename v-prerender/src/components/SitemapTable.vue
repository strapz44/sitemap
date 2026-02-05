<template>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Nom du site</th>
          <th>Sitemap</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sitemaps" :key="item.siteName">
          <td>{{ item.siteName }}</td>
          <td>
            <pre>
{{ showDetails[item.siteName] 
  ? JSON.stringify(item.sitemap, null, 2) 
  : JSON.stringify(item.sitemap).slice(0, 100) + '...' }}
            </pre>
            <button @click="toggleDetails(item.siteName)">
              {{ showDetails[item.siteName] ? 'Réduire' : 'Voir plus' }}
            </button>
          </td>
          <td>
            <button @click="deleteSitemap(item.siteName)">Supprimer</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { SitemapController } from '@/controllers/SitemapController';
import { ref, onMounted } from 'vue';

const sitemaps = ref([]);
const showDetails = ref({}); // ⬅️ Gère l'état d'affichage par site

onMounted(async () => {
  sitemaps.value = await SitemapController.get();
});

function toggleDetails(siteName) {
  showDetails.value[siteName] = !showDetails.value[siteName];
}

async function deleteSitemap(siteName) {
  if (!confirm(`Supprimer le sitemap pour ${siteName} ?`)) return;

  try {
    const response = await SitemapController.delete(siteName);
    if (response.ok || response.status === 200) {
      sitemaps.value = sitemaps.value.filter(item => item.siteName !== siteName);
      alert("Sitemap supprimé avec succès.");
    } else {
      alert("Erreur lors de la suppression.");
    }
  } catch (error) {
    console.error(error);
    alert("Erreur serveur.");
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.table-container {
  background: rgba(28, 28, 28, 0.65);
  backdrop-filter: blur(12px);
  padding: 2rem;
  margin-top: 2rem;
  border-radius: 16px;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.04);
  font-family: 'Inter', sans-serif;
  color: #eaeaea;
}

.title {
  font-size: 1.6rem;
  margin-bottom: 1.5rem;
  color: #f5f5f5;
  font-weight: 600;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 14px;
}

th, td {
  background: rgba(45, 45, 45, 0.85);
  border-radius: 10px;
  padding: 14px 18px;
  color: #f0f0f0;
  font-size: 0.95rem;
  font-weight: 500;
}

th {
  text-align: left;
  background: rgba(60, 60, 60, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.05rem;
  font-weight: 600;
}

tr:hover td {
  background: rgba(255, 255, 255, 0.06);
}

pre {
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 8px;
}

button {
  background-color: #32cd32;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  font-weight: 600;
  color: #121212;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
  font-family: 'Inter', sans-serif;
}

button:hover {
  background-color: #a7ff9d;
  color: #000;
}
</style>
