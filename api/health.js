module.exports = (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 200
    res.end(JSON.stringify({ status: 'ok' }))
  } catch (e) {
    res.statusCode = 500
    res.end(JSON.stringify({ status: 'error' }))
  }
}
