const express = require('express');
const prisma = require('../config/database');
const { requireCustomerAuth } = require('../middleware/customerAuth');
const { generateToken, tokenExpiresAt } = require('../services/tokenService');
const { transitionStatus } = require('../services/statusService');
const { calculateResponse } = require('../services/calculationService');
const { validate, createRequestSchema, rejectSchema } = require('../services/validationService');
const logger = require('../utils/logger');
const config = require('../config/env');

const router = express.Router();
router.use(requireCustomerAuth);

// ─── List all requests ────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const requests = await prisma.supplierRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { response: { select: { id: true, status: true, submittedAt: true } } },
  });
  res.json(requests);
});

// ─── Get single request with full response data ───────────────────────────────

router.get('/:id', async (req, res) => {
  const request = await prisma.supplierRequest.findUniqueOrThrow({
    where: { id: parseInt(req.params.id) },
    include: {
      response: {
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          transport: true,
          attachments: true,
          calculations: true,
        },
      },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  });
  res.json(request);
});

// ─── Create supplier request ──────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { valid, data, errors } = validate(createRequestSchema, req.body);
  if (!valid) return res.status(422).json({ error: 'Validation failed', errors });

  const token      = generateToken();
  const expiresAt  = tokenExpiresAt();

  const request = await prisma.supplierRequest.create({
    data: { ...data, token, tokenExpiresAt: expiresAt },
  });

  const inviteLink = `${config.frontendUrl}/supplier/${token}`;
  logger.info('Supplier invitation created', {
    requestId: request.id,
    supplier:  request.supplierName,
    link:      inviteLink,
    expiresAt: expiresAt.toISOString(),
  });
  console.log(`\n🔗  Supplier Invitation Link:\n    ${inviteLink}\n`);

  res.status(201).json({ ...request, inviteLink });
});

// ─── Status transitions ───────────────────────────────────────────────────────

async function handleTransition(req, res, newStatus, extra = {}) {
  const id      = parseInt(req.params.id);
  const updated = await transitionStatus(id, newStatus, req.customer.email, extra.note ?? null);
  if (extra.runCalc) {
    const response = await prisma.supplierResponse.findUnique({ where: { requestId: id } });
    if (response) await calculateResponse(response.id);
  }
  res.json(updated);
}

router.post('/:id/validate', (req, res) => handleTransition(req, res, 'VALIDATED'));
router.post('/:id/accept',   (req, res) => handleTransition(req, res, 'ACCEPTED'));

router.post('/:id/reject', async (req, res) => {
  const { valid, data, errors } = validate(rejectSchema, req.body);
  if (!valid) return res.status(422).json({ error: 'Validation failed', errors });

  const id = parseInt(req.params.id);
  await transitionStatus(id, 'REJECTED', req.customer.email, data.note);

  // Store the review note on the response
  const response = await prisma.supplierResponse.findUnique({ where: { requestId: id } });
  if (response) {
    await prisma.supplierResponse.update({ where: { id: response.id }, data: { reviewNote: data.note } });
  }
  res.json({ success: true });
});

router.post('/:id/publish', async (req, res) => {
  const id       = parseInt(req.params.id);
  const response = await prisma.supplierResponse.findUnique({ where: { requestId: id } });
  if (!response) return res.status(404).json({ error: 'No submission found for this request.' });

  // Persist calculations and mark published
  await calculateResponse(response.id);
  await prisma.emissionCalculation.updateMany({
    where: { responseId: response.id, publishedAt: null },
    data:  { publishedAt: new Date() },
  });

  await transitionStatus(id, 'PUBLISHED', req.customer.email);
  res.json({ success: true });
});

module.exports = router;
