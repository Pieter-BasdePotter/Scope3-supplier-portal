const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

const router = express.Router();

/**
 * POST /api/auth/login
 * Prototype: validates against single seeded mock customer.
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    email !== config.mockCustomer.email ||
    password !== config.mockCustomer.password
  ) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = jwt.sign(
    { email: config.mockCustomer.email, name: config.mockCustomer.name, role: 'customer' },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  res.json({ token, user: { email: config.mockCustomer.email, name: config.mockCustomer.name } });
});

module.exports = router;
