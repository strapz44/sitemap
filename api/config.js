#!/usr/bin/env node

/**
 * Configuration de synchronisation des analytics
 * Gère les paramètres de temps réel, cache, et connexions
 */

const config = {
  // Mode de déploiement
  environment: process.env.NODE_ENV || 'development',
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',

  // Database
  database: {
    url: process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '5', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10),
    ssl: process.env.DB_SSL !== 'false',
  },

  // CORS
  cors: {
    origins: (process.env.CORS_ORIGINS || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean),
    credentials: process.env.CORS_CREDENTIALS === 'true',
    allowAll: process.env.CORS_ALLOW_ALL === 'true',
  },

  // Analytics Real-time
  analytics: {
    // Intervalle de refresh en millisecondes (par défaut: 5 minutes)
    refreshInterval: parseInt(process.env.ANALYTICS_REFRESH_INTERVAL || '300000', 10),
    
    // Cache des résultats (en millisecondes, 0 = pas de cache)
    cacheExpiry: parseInt(process.env.ANALYTICS_CACHE_EXPIRY || '60000', 10), // 1 minute
    
    // Limite de résultats par défaut
    defaultLimit: parseInt(process.env.ANALYTICS_DEFAULT_LIMIT || '10', 10),
    
    // Fenêtres de temps
    windows: {
      '7d': 7 * 24 * 3600 * 1000,
      '30d': 30 * 24 * 3600 * 1000,
      '90d': 90 * 24 * 3600 * 1000,
    },
  },

  // Analysis Jobs
  analysis: {
    // Timeout d'un job (en millisecondes)
    timeout: parseInt(process.env.ANALYSIS_TIMEOUT || '600000', 10), // 10 minutes
    
    // Simulation delay (développement)
    simulationDelay: parseInt(process.env.ANALYSIS_SIMULATION_DELAY || '3000', 10),
    
    // Nombre max de jobs concurrents
    maxConcurrent: parseInt(process.env.ANALYSIS_MAX_CONCURRENT || '3', 10),
    
    // Job history limit
    historyLimit: parseInt(process.env.ANALYSIS_HISTORY_LIMIT || '100', 10),
    
    // Rétention des jobs complétés (en jours)
    retentionDays: parseInt(process.env.ANALYSIS_RETENTION_DAYS || '30', 10),
  },

  // Rate limiting
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || (config.isProduction ? 'info' : 'debug'),
    format: process.env.LOG_FORMAT || 'json',
  },

  // API Base URL (pour frontend)
  api: {
    baseUrl: process.env.VUE_APP_API_URL || (
      config.isDevelopment ? 'http://localhost:3000' : process.env.API_BASE_URL || ''
    ),
    timeout: parseInt(process.env.API_TIMEOUT || '30000', 10), // 30s
  },

  // Feature flags
  features: {
    realTimeUpdates: process.env.FEATURE_REAL_TIME !== 'false',
    analysisJobs: process.env.FEATURE_ANALYSIS_JOBS !== 'false',
    historicalData: process.env.FEATURE_HISTORICAL_DATA !== 'false',
    exportData: process.env.FEATURE_EXPORT_DATA === 'true',
    comparisons: process.env.FEATURE_COMPARISONS === 'true',
  },
}

// Validation
function validateConfig() {
  const errors = []

  if (!config.database.url && config.isProduction) {
    errors.push('DATABASE_URL is required in production')
  }

  if (errors.length > 0) {
    console.error('Configuration errors:')
    errors.forEach(e => console.error(`  - ${e}`))
    if (config.isProduction) {
      process.exit(1)
    }
  } else {
    console.log('Configuration validated')
  }
}

// Debug output
function logConfig() {
  if (config.isDevelopment) {
    console.log('\nAnalytics Configuration:')
    console.log('  Environment:', config.environment)
    console.log('  Database:', config.database.url ? 'Connected' : 'Not configured')
    console.log('  Analytics Refresh:', config.analytics.refreshInterval + 'ms')
    console.log('  Cache Expiry:', config.analytics.cacheExpiry + 'ms')
    console.log('  Real-time Updates:', config.features.realTimeUpdates)
    console.log('  Analysis Jobs:', config.features.analysisJobs)
    console.log('\n')
  }
}

module.exports = config

// Validate on load
if (require.main === module) {
  validateConfig()
  logConfig()
}
