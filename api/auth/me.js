const { ObjectId } = require('mongodb')
const { createHandler } = require('../_handler')
const { getDb } = require('../_mongo')
const { sanitizeUser } = require('../_authHelpers')

module.exports = createHandler({
  methods: ['GET'],
  auth: true,
}, async ({ auth, json }) => {

  const db = await getDb()
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(auth.sub) },
    { projection: { password_hash: 0, 'twoFactor.secret': 0, 'twoFactor.backupCodes': 0 } },
  )

  if (!user) {
    return json(404, { ok: false, error: 'user_not_found' })
  }

  return json(200, { ok: true, user: sanitizeUser(user) })
})
