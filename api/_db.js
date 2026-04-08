/**
 * Module base de données PostgreSQL partagé (Vercel serverless).
 */

const { Pool } = require('pg')

let pool = null

function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL
    if (!connectionString) throw new Error('No POSTGRES_URL or DATABASE_URL configured')
    pool = new Pool({
      connectionString,
      max: parseInt(process.env.DB_POOL_SIZE || '5', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10),
      ssl: process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
    })
  }
  return pool
}

let schemaReady = false

async function ensureSchema() {
  if (schemaReady) return
  const p = getPool()
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS analytics_events (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL DEFAULT 'pageview',
      site VARCHAR(255),
      url TEXT,
      pathname TEXT,
      title TEXT,
      referrer TEXT,
      ip VARCHAR(45),
      user_agent TEXT,
      visitor_id VARCHAR(64),
      session_id VARCHAR(64),
      lang VARCHAR(10),
      screen VARCHAR(20),
      device VARCHAR(50),
      browser VARCHAR(100),
      os VARCHAR(100),
      utm_source VARCHAR(255),
      utm_medium VARCHAR(255),
      utm_campaign VARCHAR(255),
      event_name VARCHAR(255),
      event_params JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  schemaReady = true
}

module.exports = { getPool, ensureSchema }
