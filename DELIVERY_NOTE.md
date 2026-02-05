# Bon de livraison — v0.1.0

Projet: v-prerender (SPA + API serverless Vercel)
Date: 2026-02-05
Version/Tag: v0.1.0

## Contenu livré
- Frontend compilé: `v-prerender/dist/`
- Fonctions API: `api/`
- Fichiers de configuration: `vercel.json`, `package.json` (root et `v-prerender/`)
- Documentation: `ACCEPTANCE.md`, `CHANGELOG.md`, `DELIVERY_NOTE.md`

## Environnements / prérequis
- Node.js 22.x
- (Optionnel) Variables Figma non incluses: `FIGMA_TOKEN`, `FIGMA_FILE_KEY`

## Points de contrôle qualité
- SPA servi depuis `/` et `/index.html`.
- Endpoints de base:
  - `GET /api/health` → `{ status: "ok" }` (200)
  - `GET /api/ping` → `{ pong: true, ts }` (200)
  - `POST /api/auth/login` (mock) → `{ token, user }` (200)
- Headers `Cache-Control: no-store` pour l’HTML (anti-cache CDN).
- Aucun secret/clé/API token commité dans le repo ou l’artefact.

## Liens utiles
- Alias production: <à renseigner>
- Inspect Vercel (dernier déploiement): <à renseigner>

## Remarques
- L’authentification est mockée (pas de backend persistant).
- La synchronisation Figma est non-bloquante si les variables d’environnement ne sont pas définies.

Signatures:
- Livré par: ______________________  Date: __________
- Reçu par:  ______________________  Date: __________
