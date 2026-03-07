# Dashboard Analytics - Guide d'Intégration

## Architecture Complète

Ce guide explique comment les stats en temps réel et le bouton "Analyser" fonctionnent ensemble.

### Structure Backend

#### Endpoints API Analytics

```
GET  /api/analytics/summary         - Résumé global (pageviews, sessions, visiteurs)
GET  /api/analytics/timeseries      - Données par jour (pour graphique)
GET  /api/analytics/top-pages       - Pages les plus consultées
GET  /api/analytics/top             - Top par catégorie (referrer, utm_source, device, browser, os)
POST /api/analytics/analyze         - Lance une analyse asynchrone
GET  /api/analytics/analysis-history - Historique des analyses
GET  /api/analytics/analysis-status - Statut d'une analyse en cours
```

#### Fichiers Créés

**Backend (API Routes):**
- `api/analytics/analyze.js` - Endpoint pour déclencher l'analyse
- `api/analytics/analysis-history.js` - Historique des analyses
- `api/analytics/analysis-status.js` - Statut d'un job d'analyse
- `api/_db.js` (modifié) - Table `analysis_jobs` ajoutée

**Frontend (Vue 3):**
- `v-prerender/src/services/AnalyticsService.js` - Service client pour les APIs
- `v-prerender/src/views/DashboardView.vue` - Vue dashboard complète avec:
  - KPIs en temps réel
  - Graphiques (trafic, pages)
  - Performances par site
  - Sources de trafic
  - Historique des analyses
  - Bouton "Analyser" fonctionnel

### Flux de Fonctionnement

#### 1 Chargement du Dashboard

```
User → DashboardView
  ↓
  onMounted() → loadDashboard()
  ↓
  Récupère la liste des sitemaps (SitemapService.list())
  ↓
  Pour chaque site:
    - GET analytics/summary (stats globales)
    - GET analytics/top-pages (top pages)
    - GET analytics/timeseries (données graphique)
    - GET analytics/top?by=utm_source (sources)
  ↓
  Affiche KPIs + Graphiques + Historique
```

#### 2️⃣ Action "Analyser"

```
User click → triggerAnalysis()
  ↓
  POST /api/analytics/analyze { siteName }
  ↓
  Backend crée un job asynchrone (id, status='pending')
  ↓
  Backend lance performAnalysis() en async
    - Attend 3 secondes (simulé)
    - Met à jour status → 'completed'
    - Insère pages_added
  ↓
  Frontend affiche toast/spinner
  ↓
  Après 2s, recharge le dashboard
  ↓
  Nouveau data + historique mis à jour
```

#### 3️⃣ Temps Réel

- Les données sont actualisées à chaque chargement du dashboard
- Les graphiques utilisent Chart.js pour un rendu smooth
- Les KPIs se mettent à jour en temps réel au clic du bouton "Analyser"

## Configuration Requise

### Variables d'Environnement

```bash
# .env ou .env.local
POSTGRES_URL=postgresql://user:password@host:port/dbname
# ou
DATABASE_URL=postgresql://user:password@host:port/dbname

# CORS (optionnel)
CORS_ORIGINS=https://example.com,https://another.com
```

### Base de Données

La table `analysis_jobs` est créée automatiquement via `ensureSchema()`:

```sql
CREATE TABLE analysis_jobs (
  id text PRIMARY KEY,
  site text NOT NULL,
  status text DEFAULT 'pending',
  progress integer DEFAULT 0,
  pages_added integer DEFAULT 0,
  error text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_analysis_jobs_site ON analysis_jobs(site);
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_analysis_jobs_updated ON analysis_jobs(updated_at DESC);
```

## Déploiement

### Sur Netlify (Configuration Actuelle)

Les fichiers `/api/*.js` sont automatiquement convertis en serverless functions.

```bash
# Build
npm run build

# Deploy
netlify deploy --prod
```

### Sur Vercel

Même système, les `/api` files deviennent des serverless functions.

```bash
npm install -g vercel
vercel deploy
```

## Utilisation

### Frontend

#### Charger les stats en temps réel

```javascript
import AnalyticsService from '@/services/AnalyticsService'

// Résumé
const summary = await AnalyticsService.summary(from, to, 'siteName')

// Top pages
const pages = await AnalyticsService.topPages(from, to, 10, 'siteName')

// Timeseries pour graphique
const ts = await AnalyticsService.timeseries(from, to, 'siteName')

// Sources
const sources = await AnalyticsService.top('utm_source', from, to, 10, 'siteName')
```

#### Lancer une analyse

```javascript
const result = await AnalyticsService.analyze('siteName')
// result = { ok: true, jobId: '...', status: 'pending' }

// Vérifier le statut
const status = await AnalyticsService.getAnalysisStatus(jobId)

// Historique
const history = await AnalyticsService.getAnalysisHistory('siteName', 10)
```

### Backend

#### Ajouter des traitements d'analyse personnalisés

Modifier `api/analytics/analyze.js` - fonction `performAnalysis()`:

```javascript
async function performAnalysis(pool, jobId, siteName) {
  // Votre logique d'analyse
  // - Refresh des données
  // - Calcul des métriques
  // - Scrape si nécessaire
  
  await pool.query(`
    UPDATE analysis_jobs SET status = $1, pages_added = $2 WHERE id = $3
  `, ['completed', 42, jobId])
}
```

## Personnalisation

### Modifier les KPIs

Dans `v-prerender/src/views/DashboardView.vue`, section `globalKpis`:

```javascript
const globalKpis = computed(() => [
  {
    id: 'pageviews',
    label: 'Total Pageviews',
    value: totalStats.value.pageviews.toLocaleString('fr-FR'),
    icon: 'chart',
    color: 'linear-gradient(...)',
    trend: '↑ 12% vs semaine',
    trendClass: 'trend-up'
  },
  // Ajouter d'autres KPIs...
])
```

### Changer les couleurs

Modifiez les gradients dans les styles CSS de DashboardView.vue:

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

## Dépannage

### L'analyse ne démarre pas

1. Vérifier que `POSTGRES_URL` est configuré
2. Vérifier les logs Netlify/Vercel
3. Vérifier que la table `analysis_jobs` existe

### Les données n'apparaissent pas

1. Vérifier que les sitemaps sont créés (`api/sitemaps/index.js`)
2. Vérifier que la table `events` contient des données
3. Vérifier les logs du navigateur (console Vue)

### CORS errors

Ajouter le domaine à `CORS_ORIGINS`:

```bash
CORS_ORIGINS=https://example.com,https://app.example.com
```

## Exemple de Réponse API

### GET /api/analytics/summary

```json
{
  "pageviews": 1234,
  "sessions": 567,
  "visitors": 420,
  "bounce_rate": 0.35,
  "avg_session_duration": 145
}
```

### GET /api/analytics/timeseries

```json
{
  "items": [
    { "ts": "2026-03-01T00:00:00Z", "pageviews": 100, "sessions": 45 },
    { "ts": "2026-03-02T00:00:00Z", "pageviews": 120, "sessions": 52 }
  ]
}
```

### POST /api/analytics/analyze

```json
{
  "ok": true,
  "jobId": "abc123xyz",
  "message": "Analyse lancée",
  "status": "pending"
}
```

## Améliorations Futures

1. **WebSockets** - Real-time updates du statut d'analyse
2. **Job Queue** - Bull/RabbitMQ pour les analyses longues
3. **Caching** - Redis pour les données fréquent accédées
4. **Export** - PDF/CSV des stats
5. **Comparaison** - Stats avant/après analyse
6. **Alertes** - Notifications si baisse de trafic

## Sécurité

- Authentification admin requise sur tous les endpoints
- Validation CORS stricte
- Paramètres validés et sanitizés
- SQL injection prevention via prepared statements
- Rate limiting optionnel via `_rateLimit.js`

---

**Version:** 1.0.0  
**Dernière mise à jour:** Mars 2026  
**Auteur:** Jonathan (via GitHub Copilot)
