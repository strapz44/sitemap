module.exports = (req, res) => {
  const email = (req.query && req.query.email) || (req.body && req.body.email) || 'dev@example.com';
  res.status(200).json({ token: 'dev-mock-token', user: { email } });
};
