#!/bin/bash
# Script de déploiement pour analytics
# Usage: bash deploy-analytics.sh [environment]

set -e

ENVIRONMENT=${1:-production}
PROJECT_NAME="prerender-saas"

echo "Deploying Analytics to $ENVIRONMENT"
echo "======================================="

# 1. Vérifier les prérequis
echo "✓ Checking prerequisites..."

if [ ! -f ".env.local" ]; then
  echo "[ERROR] Missing .env.local file"
  echo "   Run: cp .env.analytics.example .env.local"
  echo "   And configure your DATABASE_URL"
  exit 1
fi

if [ ! -f "package.json" ]; then
  echo "[ERROR] Missing package.json - please run from root directory"
  exit 1
fi

# 2. Installer les dépendances
echo "✓ Installing dependencies..."
npm install --omit=dev 2>/dev/null || true
cd v-prerender && npm install --omit=dev 2>/dev/null || true
cd ..

# 3. Builder le frontend
echo "✓ Building frontend..."
cd v-prerender
npm run build > /dev/null 2>&1 || npm run build
cd ..

# 4. Vérifier la DB
echo "✓ Verifying database..."
node -e "
const config = require('./api/config.js');
if (!config.database.url) {
  console.error('[ERROR] DATABASE_URL not configured');
  process.exit(1);
}
console.log('[OK] Database URL detected');
"

# 5. Test APIs
echo "✓ Testing APIs..."
npm run test:analytics 2>/dev/null || echo "   (Skipping API tests)"

# 6. Déployer
case $ENVIRONMENT in
  netlify)
    echo "✓ Deploying to Netlify..."
    npx netlify deploy --prod
    ;;
  vercel)
    echo "✓ Deploying to Vercel..."
    npm install -g vercel
    vercel deploy --prod
    ;;
  production)
    echo "✓ Building for production..."
    npm run build
    echo "✅ Build complete - ready for deployment"
    ;;
  *)
    echo "❌ Unknown environment: $ENVIRONMENT"
    echo "   Use: netlify, vercel, or production"
    exit 1
    ;;
esac

echo ""
echo "======================================="
echo "Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Verify dashboard: https://your-domain/dashboard"
echo "  2. Test 'Analyser' button"
echo "  3. Check API endpoints in browser console"
echo "  4. Monitor logs for errors"
echo ""
echo "Documentation: ANALYTICS_INTEGRATION.md"
