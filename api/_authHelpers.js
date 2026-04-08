/**
 * Shared helpers for auth endpoints (body parsing, password hashing).
 */

const crypto = require('crypto')

function readBody(req) {
  return new Promise(resolve => {
    let data = ''
    req.on('data', c => { data += c; if (data.length > 1e6) { data = ''; req.destroy() } })
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '').toLowerCase()
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) }
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(data)
        const obj = {}; for (const [k, v] of params.entries()) obj[k] = v
        resolve(obj)
      } else { resolve({}) }
    })
  })
}

function scryptAsync(password, salt, len = 32) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, len, (err, dk) => err ? reject(err) : resolve(dk))
  })
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = await scryptAsync(password, salt, 32)
  return `s2$${salt.toString('hex')}$${hash.toString('hex')}`
}

async function verifyPassword(password, stored) {
  const parts = (stored || '').split('$')
  if (parts.length !== 3 || parts[0] !== 's2') return false
  const salt = Buffer.from(parts[1], 'hex')
  const expected = Buffer.from(parts[2], 'hex')
  const derived = await scryptAsync(password, salt, expected.length)
  return crypto.timingSafeEqual(derived, expected)
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').toString())
}

function sanitizeUser(user) {
  if (!user) return null
  return {
    id: (user._id || user.id).toString(),
    email: user.email,
    name: user.name || null,
    twoFactorEnabled: !!(user.twoFactor && user.twoFactor.enabled),
    createdAt: user.createdAt,
  }
}

module.exports = { readBody, hashPassword, verifyPassword, isValidEmail, sanitizeUser }
