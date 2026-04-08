/**
 * MongoDB connection layer for authentication.
 * Uses the native mongodb driver (shared across Vercel serverless functions).
 */

const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || ''

let _client = null
let _db = null

async function getDb() {
  if (_db) return _db
  if (!MONGODB_URI) throw new Error('MONGODB_URI not configured')
  _client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 5,
    minPoolSize: 1,
    retryWrites: true,
    w: 'majority',
  })
  await _client.connect()
  _db = _client.db() // uses DB name from URI
  await ensureIndexes(_db)
  return _db
}

async function ensureIndexes(db) {
  const users = db.collection('users')
  await users.createIndex({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } })
  await users.createIndex({ 'twoFactor.enabled': 1 }, { sparse: true })
  await users.createIndex({ createdAt: 1 })

  const sessions = db.collection('sessions')
  await sessions.createIndex({ userId: 1 })
  await sessions.createIndex({ refreshToken: 1 }, { unique: true })
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL

  const resetTokens = db.collection('resetTokens')
  await resetTokens.createIndex({ token: 1 }, { unique: true })
  await resetTokens.createIndex({ userId: 1 })
  await resetTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL

  const loginAttempts = db.collection('loginAttempts')
  await loginAttempts.createIndex({ ip: 1, createdAt: 1 })
  await loginAttempts.createIndex({ email: 1, createdAt: 1 })
  await loginAttempts.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 }) // TTL 1h
}

module.exports = { getDb }
