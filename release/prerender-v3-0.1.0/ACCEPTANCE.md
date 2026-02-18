# M1 — Critères d’acceptation

Livrable: Déploiement production stable du SPA et endpoints API de base.

## Portée
- SPA accessible et servi depuis la racine.
- Endpoints mock d’API opérationnels pour intégration front.
- Documentation courte de diagnostic et vérification.

## Check-list d’acceptation
- [ ] Frontend
  - [ ] `GET /` renvoie le SPA (200) et charge correctement l’UI.
  - [ ] `GET /index.html` renvoie le SPA (200).
  - [ ] Headers anti-cache: `Cache-Control: no-store` sur `/` et `/index.html`.
- [ ] API
  - [ ] `GET /api/health` → `{ "status": "ok" }` (200) + `Cache-Control: no-store`.
  - [ ] `GET /api/ping` → `{ "pong": true, "ts": <number> }` (200) + `Cache-Control: no-store`.
  - [ ] `GET /api/auth/login?email=test@example.com` → `{ token, user }` (200).
- [ ] Preuves fournies
  - [ ] Lien Alias Vercel Production.
  - [ ] Captures/réponses JSON des endpoints.
  - [ ] CHANGELOG et DELIVERY_NOTE.

## Hors périmètre
- Authentification réelle (le login est un mock).
- Backend persistant / base de données.
- SEO/SSR avancé.

## Informations d’environnement
- Alias prod: <à renseigner>
- Version/tag: v0.1.0
- Node.js: 22.x

## Validation
- Validé par (nom, date, signature): ______________________________
- Commentaires / réserves:
  - ______________________________________________________________
  - ______________________________________________________________
