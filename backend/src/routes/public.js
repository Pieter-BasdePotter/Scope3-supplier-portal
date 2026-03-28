const express = require('express');
const prisma = require('../config/database');

const router = express.Router();

/**
 * GET /api/published
 * Returns all published emission calculations with request and item context.
 */
router.get('/', async (req, res) => {
  const calculations = await prisma.emissionCalculation.findMany({
    where:   { publishedAt: { not: null } },
    orderBy: { publishedAt: 'desc' },
    include: {
      response: {
        select: {
          orgName: true, referenceYear: true, dataSourceType: true,
          request: { select: { supplierName: true, categoryContext: true } },
        },
      },
      item: { select: { productName: true, outputQty: true, outputUnit: true } },
    },
  });
  res.json(calculations);
});

module.exports = router;
