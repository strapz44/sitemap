# Changelog

## [v0.1.0] - 2026-02-05

### Added
- Frontend SPA (Vue CLI) buildable dans `v-prerender/` avec sortie `dist/`.
- Fonctions serverless Vercel:
  - `GET /api/health` → `{ status: "ok" }`.
  - `GET /api/ping` → `{ pong: true, ts }`.
  - `POST /api/auth/login` (mock) → `{ token, user }`.
  - Endpoints sitemaps mock (`/api/sitemaps*`).
- Config Vercel en mode zéro-config (install/build/outputDirectory) + fallback SPA via `rewrites`.
- Headers `Cache-Control: no-store` pour l’HTML afin de limiter les 404 liées au cache CDN.
- `engines.node` fixé à `22.x` pour éviter `EBADENGINE`.

### Changed
- DevServer: mocks locaux pour `/api/*` et désactivation du `proxy` par défaut.
- Login dev: acceptation des credentials par query en fallback si pas de JSON body dispo en dev.

### Fixed / Improvements
- Avertissements / erreurs de version Node en build.
- Risques de 404 root liés à cache: ajout de headers `no-store` sur `index.html`.

### Security
- Aucun secret ou token n’est inclus dans le code ou l’artefact de livraison.
- Synchronisation Figma optionnelle: nécessite `FIGMA_TOKEN` et `FIGMA_FILE_KEY` via variables d’environnement (non fournies, non commit).

[v0.1.0]: https://example.com/releases/v0.1.0
