const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Middleware: verifies customer JWT and attaches user to req.customer.
 * Prototype: validates against single seeded mock customer.
 */
function requireCustomerAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.customer = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

module.exports = { requireCustomerAuth };
