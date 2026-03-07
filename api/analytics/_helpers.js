/**
 * Analytics Helpers
 * Utilitaires pour calculs temps réel et trends
 */

const config = require('./config')

/**
 * Calcule la tendance entre deux périodes
 */
function calculateTrend(current, previous) {
  if (!previous || previous === 0) return { value: 0, direction: 'neutral' }
  const change = current - previous
  const percent = ((change / previous) * 100).toFixed(1)
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  return { value: parseFloat(percent), direction }
}

/**
 * Formate les nombres pour affichage
 */
function formatNumber(num) {
  if (!num) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

/**
 * Calcule des statistiques de base
 */
function calculateStats(items, key) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      sum: 0,
      average: 0,
      min: 0,
      max: 0,
      count: 0
    }
  }

  const values = items
    .map(i => parseFloat(i[key]) || 0)
    .filter(v => v >= 0)

  if (values.length === 0) {
    return { sum: 0, average: 0, min: 0, max: 0, count: 0 }
  }

  const sum = values.reduce((a, b) => a + b, 0)
  const average = sum / values.length
  const min = Math.min(...values)
  const max = Math.max(...values)

  return { sum, average, min, max, count: values.length }
}

/**
 * Agrège les données par période (jour, semaine, mois)
 */
function aggregateByPeriod(items, period = 'day') {
  if (!Array.isArray(items) || items.length === 0) return []

  const grouped = {}
  const multipliers = {
    'hour': 3600000,
    'day': 86400000,
    'week': 604800000,
    'month': 2592000000
  }
  const multiplier = multipliers[period] || multipliers.day

  items.forEach(item => {
    const date = new Date(item.ts)
    const key = new Date(Math.floor(date.getTime() / multiplier) * multiplier)
      .toISOString()

    if (!grouped[key]) {
      grouped[key] = {
        ts: key,
        pageviews: 0,
        sessions: 0,
        visitors: 0,
        bounces: 0,
        count: 0
      }
    }

    grouped[key].pageviews += item.pageviews || 0
    grouped[key].sessions += item.sessions || 0
    grouped[key].visitors += item.visitors || 0
    grouped[key].bounces += item.bounces || 0
    grouped[key].count += 1
  })

  return Object.values(grouped)
    .sort((a, b) => new Date(a.ts) - new Date(b.ts))
}

/**
 * Calcule les métriques de taux (bounce rate, conversion, etc.)
 */
function calculateRates(summary) {
  const rates = {
    bounce_rate: 0,
    conversion_rate: 0,
    avg_session_duration: 0
  }

  if (summary.sessions && summary.bounces !== undefined) {
    rates.bounce_rate = (summary.bounces / summary.sessions)
  }

  if (summary.visitors && summary.conversions) {
    rates.conversion_rate = (summary.conversions / summary.visitors)
  }

  return rates
}

/**
 * Extrait les top items et filtre
 */
function getTopItems(items, limit = 10, sortBy = 'hits') {
  return items
    .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))
    .slice(0, Math.max(1, Math.min(limit, 100)))
}

/**
 * Formatte une réponse API standard
 */
function formatResponse(items, metadata = {}) {
  return {
    ok: true,
    items: Array.isArray(items) ? items : [],
    count: Array.isArray(items) ? items.length : 0,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Formatte une réponse d'erreur
 */
function formatError(code, message, statusCode = 500) {
  return {
    ok: false,
    error: code,
    message: message || code,
    timestamp: new Date().toISOString()
  }
}

/**
 * Valide les paramètres de date
 */
function validateDateRange(from, to) {
  try {
    const fromDate = new Date(from)
    const toDate = new Date(to)

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new Error('Invalid date format')
    }

    if (fromDate >= toDate) {
      throw new Error('From date must be before to date')
    }

    // Limite à 1 an
    const daysDiff = (toDate - fromDate) / (1000 * 60 * 60 * 24)
    if (daysDiff > 365) {
      throw new Error('Date range cannot exceed 1 year')
    }

    return { fromDate, toDate, isValid: true }
  } catch (e) {
    return { isValid: false, error: e.message }
  }
}

/**
 * Vérifie la disponibilité du cache
 */
function getCacheKey(prefix, params) {
  const key = [
    prefix,
    params.from || '',
    params.to || '',
    params.site || '',
    params.limit || '',
    params.by || ''
  ]
    .filter(Boolean)
    .join(':')

  return key
}

/**
 * Détermine si les données peuvent être cachées
 */
function isCacheable(params) {
  // Ne pas cacher les requêtes personalisées
  if (params.custom) return false
  // Ne pas cacher si cache désactivé
  if (config.analytics.cacheExpiry === 0) return false
  return true
}

/**
 * Génère un résumé visuel pour dashboard
 */
function generateDashboardSummary(analytics) {
  const trend = calculateTrend(
    analytics.current?.pageviews || 0,
    analytics.previous?.pageviews || 0
  )

  return {
    status: 'healthy',
    lastUpdate: new Date().toISOString(),
    metrics: {
      pageviews: {
        value: analytics.current?.pageviews || 0,
        trend: trend.value,
        direction: trend.direction,
        format: formatNumber(analytics.current?.pageviews || 0)
      },
      sessions: {
        value: analytics.current?.sessions || 0,
        format: formatNumber(analytics.current?.sessions || 0)
      },
      visitors: {
        value: analytics.current?.visitors || 0,
        format: formatNumber(analytics.current?.visitors || 0)
      },
      bounceRate: {
        value: ((analytics.current?.bounce_rate || 0) * 100).toFixed(1) + '%'
      }
    }
  }
}

module.exports = {
  calculateTrend,
  formatNumber,
  calculateStats,
  aggregateByPeriod,
  calculateRates,
  getTopItems,
  formatResponse,
  formatError,
  validateDateRange,
  getCacheKey,
  isCacheable,
  generateDashboardSummary
}
