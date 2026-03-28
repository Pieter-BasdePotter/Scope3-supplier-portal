const express = require('express');
const fs      = require('fs');
const prisma  = require('../config/database');
const { validateToken }                       = require('../services/tokenService');
const { transitionStatus }                    = require('../services/statusService');
const { calculateResponse }                   = require('../services/calculationService');
const { validate, fullSubmissionSchema }       = require('../services/validationService');
const { upload }                              = require('../middleware/upload');

const router = express.Router();

// ─── Middleware: validate token BEFORE multer writes files to disk ─────────────

async function preloadRequest(req, res, next) {
  try {
    req.supplierRequest = await validateToken(req.params.token);
    next();
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/supplier/:token ─────────────────────────────────────────────────

router.get('/:token', async (req, res) => {
  const request = await validateToken(req.params.token);

  // Mark STARTED if still INVITED; use fresh status from the update
  let currentStatus = request.status;
  if (request.status === 'INVITED') {
    const updated = await transitionStatus(request.id, 'STARTED', 'supplier');
    currentStatus = updated.status;
  }

  // Return { request, response } shape consumed by SupplierPortalPage
  res.json({
    request: {
      id:              request.id,
      supplierName:    request.supplierName,
      supplierEmail:   request.supplierEmail,
      referenceYear:   request.referenceYear,
      categoryContext: request.categoryContext,
      token:           request.token,
      status:          currentStatus,
    },
    response: request.response ?? null,
  });
});

// ─── PUT /api/supplier/:token/draft ──────────────────────────────────────────

router.put('/:token/draft', async (req, res) => {
  const request = await validateToken(req.params.token);

  if (!['STARTED', 'REJECTED'].includes(request.status)) {
    return res.status(409).json({ error: `Cannot update a submission in status ${request.status}.` });
  }

  // Flatten nested stepA/stepB/stepC structure sent by frontend
  const body  = req.body;
  const stepA = body.stepA ?? {};
  const stepB = body.stepB ?? {};
  const stepC = body.stepC ?? {};
  const flat  = { ...body, ...stepA };               // prefer stepA keys; fall back to flat

  const {
    orgName, identifier, identifierType, dataSourceType, contactPerson, contactEmail,
  } = flat;
  const items     = stepB.items     ?? body.items     ?? [];
  const transport = stepC.transport ?? body.transport ?? [];

  const response = await prisma.supplierResponse.upsert({
    where:  { requestId: request.id },
    update: { orgName, identifier, identifierType, referenceYear: request.referenceYear,
              dataSourceType, contactPerson, contactEmail, updatedAt: new Date() },
    create: { requestId: request.id, orgName: orgName ?? '', identifier: identifier ?? '',
              identifierType: identifierType ?? 'OTHER', referenceYear: request.referenceYear,
              dataSourceType: dataSourceType ?? 'ESTIMATED', contactPerson: contactPerson ?? '',
              contactEmail: contactEmail ?? '' },
  });

  // Always replace items + transport (empty array clears previous rows)
  await prisma.responseItem.deleteMany({ where: { responseId: response.id } });
  if (items.length > 0) {
    await prisma.responseItem.createMany({
      data: items.map((item, idx) => ({
        responseId: response.id, sortOrder: idx,
        productName: item.productName ?? '', productCode: item.productCode ?? null,
        outputQty: parseFloat(item.outputQty) || 0, outputUnit: item.outputUnit ?? 'kg',
        electricityKwh: item.electricityKwh != null ? parseFloat(item.electricityKwh) : null,
        gasM3:          item.gasM3 != null          ? parseFloat(item.gasM3)           : null,
        solidFuelKg:    item.solidFuelKg != null    ? parseFloat(item.solidFuelKg)     : null,
        transportTkm:   item.transportTkm != null   ? parseFloat(item.transportTkm)    : null,
        waterM3:        item.waterM3 != null         ? parseFloat(item.waterM3)         : null,
        heatKwh:        item.heatKwh != null         ? parseFloat(item.heatKwh)         : null,
        otherInputs:    item.otherInputs ?? null,
        manualCo2e:     item.manualCo2e != null      ? parseFloat(item.manualCo2e)      : null,
      })),
    });
  }

  await prisma.responseTransport.deleteMany({ where: { responseId: response.id } });
  if (transport.length > 0) {
    await prisma.responseTransport.createMany({
      data: transport.map(t => ({
        responseId: response.id, mode: t.mode,
        distanceKm: parseFloat(t.distanceKm) || 0,
        massKg:     t.massKg     != null ? parseFloat(t.massKg)     : null,
        loadFactor: t.loadFactor != null ? parseFloat(t.loadFactor) : null,
        refrigerated: t.refrigerated ?? false,
      })),
    });
  }

  res.json({ success: true, responseId: response.id });
});

// ─── POST /api/supplier/:token/submit ─────────────────────────────────────────
// preloadRequest validates the token BEFORE multer writes files to disk.

router.post(
  '/:token/submit',
  preloadRequest,
  (req, res, next) => {
    if (!['STARTED', 'REJECTED'].includes(req.supplierRequest.status)) {
      return res.status(409).json({ error: `Cannot submit in status ${req.supplierRequest.status}.` });
    }
    upload.array('files', 10)(req, res, next);
  },
  async (req, res) => {
    const request = req.supplierRequest;

    // Parse multipart body (stringified JSON when sending with files)
    let body = req.body;
    if (typeof body.data === 'string') {
      try { body = JSON.parse(body.data); } catch { /* keep raw body */ }
    }

    // Flatten nested stepA/stepB/stepC → flat schema expected by fullSubmissionSchema
    const flatBody = body.stepA
      ? { ...body.stepA, items: body.stepB?.items ?? [], transport: body.stepC?.transport ?? [] }
      : { ...body, items: body.items ?? [], transport: body.transport ?? [] };

    const { valid, data, errors } = validate(fullSubmissionSchema, flatBody);
    if (!valid) {
      // Clean up any files already written to disk
      req.files?.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
      return res.status(422).json({ error: 'Validation failed', errors });
    }

    // All DB writes inside one transaction for atomicity
    let responseId;
    await prisma.$transaction(async (tx) => {
      const response = await tx.supplierResponse.upsert({
        where:  { requestId: request.id },
        update: {
          orgName: data.orgName, identifier: data.identifier, identifierType: data.identifierType,
          referenceYear: data.referenceYear ?? request.referenceYear,
          dataSourceType: data.dataSourceType, contactPerson: data.contactPerson,
          contactEmail: data.contactEmail, submittedAt: new Date(), updatedAt: new Date(),
          status: 'SUBMITTED',
        },
        create: {
          requestId: request.id, orgName: data.orgName, identifier: data.identifier,
          identifierType: data.identifierType, referenceYear: data.referenceYear ?? request.referenceYear,
          dataSourceType: data.dataSourceType, contactPerson: data.contactPerson,
          contactEmail: data.contactEmail, submittedAt: new Date(), status: 'SUBMITTED',
        },
      });
      responseId = response.id;

      await tx.responseItem.deleteMany({ where: { responseId: response.id } });
      for (const [idx, item] of data.items.entries()) {
        await tx.responseItem.create({
          data: {
            responseId: response.id, sortOrder: idx,
            productName: item.productName, productCode: item.productCode ?? null,
            outputQty: item.outputQty, outputUnit: item.outputUnit,
            electricityKwh: item.electricityKwh ?? null, gasM3: item.gasM3 ?? null,
            solidFuelKg: item.solidFuelKg ?? null, transportTkm: item.transportTkm ?? null,
            waterM3: item.waterM3 ?? null, heatKwh: item.heatKwh ?? null,
            otherInputs: item.otherInputs ?? null, manualCo2e: item.manualCo2e ?? null,
          },
        });
      }

      await tx.responseTransport.deleteMany({ where: { responseId: response.id } });
      for (const t of (data.transport ?? [])) {
        await tx.responseTransport.create({
          data: {
            responseId: response.id, mode: t.mode, distanceKm: t.distanceKm,
            massKg: t.massKg ?? null, loadFactor: t.loadFactor ?? null,
            refrigerated: t.refrigerated ?? false,
          },
        });
      }

      if (req.files?.length > 0) {
        await tx.attachment.createMany({
          data: req.files.map(f => ({
            responseId: response.id, filename: f.filename, originalName: f.originalname,
            mimeType: f.mimetype, size: f.size,
          })),
        });
      }

      // Atomic status transition with compare-and-swap
      const updated = await tx.supplierRequest.updateMany({
        where: { id: request.id, status: request.status },
        data:  { status: 'SUBMITTED', updatedAt: new Date() },
      });
      if (updated.count === 0) throw Object.assign(
        new Error('Request status changed concurrently. Please try again.'),
        { status: 409, code: 'CONCURRENT_MODIFICATION' }
      );
      await tx.statusHistory.create({
        data: { requestId: request.id, oldStatus: request.status, newStatus: 'SUBMITTED', changedBy: 'supplier' },
      });
    });

    // Calculations run outside the transaction (read-heavy, safe to retry)
    const calculations = await calculateResponse(responseId);

    res.json({ success: true, responseId, calculations });
  }
);

module.exports = router;
