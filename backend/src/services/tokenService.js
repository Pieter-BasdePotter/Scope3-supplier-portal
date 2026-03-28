const crypto = require('crypto');
const prisma = require('../config/database');
const config = require('../config/env');

/**
 * Generate a cryptographically random supplier invitation token.
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate token expiry timestamp.
 */
function tokenExpiresAt() {
  return new Date(Date.now() + config.tokenExpiryHours * 60 * 60 * 1000);
}

/**
 * Validate a supplier token. Returns the SupplierRequest or throws.
 */
async function validateToken(token) {
  const request = await prisma.supplierRequest.findUnique({
    where: { token },
    include: {
      response: {
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          transport: true,
          attachments: true,
        },
      },
    },
  });

  if (!request) {
    const err = new Error('Invitation link not found.');
    err.status = 404;
    throw err;
  }

  if (new Date() > request.tokenExpiresAt) {
    const err = new Error('This invitation link has expired. Please contact the customer to request a new one.');
    err.status = 401;
    err.code = 'TOKEN_EXPIRED';
    throw err;
  }

  return request;
}

module.exports = { generateToken, tokenExpiresAt, validateToken };
