/**
 * Netlify Function: api.js
 *
 * Self-contained mock backend for the Scope 3 Supplier Portal demo.
 * Replaces the Express + MySQL stack with in-memory data so the full
 * app works on Netlify without a database.
 *
 * All routes mirror the original backend API surface:
 *   POST   /api/auth/login
 *   GET    /api/requests
 *   GET    /api/requests/:id
 *   POST   /api/requests
 *   POST   /api/requests/:id/validate
 *   POST   /api/requests/:id/accept
 *   POST   /api/requests/:id/reject
 *   POST   /api/requests/:id/publish
 *   GET    /api/supplier/:token
 *   PUT    /api/supplier/:token/draft
 *   POST   /api/supplier/:token/submit
 *   GET    /api/published
 */

const express    = require('express');
const jwt        = require('jsonwebtoken');
const multer     = require('multer');
const serverless = require('serverless-http');

const app    = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 20 },
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Config ──────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'netlify-demo-secret-scope3';
const MOCK_CUSTOMER = {
  email:    'admin@massure.test',
  password: 'admin123',
  name:     'Massure Admin',
};

// ─── In-memory data store (pre-seeded with demo data) ────────────────────────

let _nextId          = 3;
let _nextHistoryId   = 10;
let _nextResponseId  = 3;

const requests = [
  {
    id:              1,
    supplierName:    'Acme Packaging B.V.',
    supplierEmail:   'data@acme-packaging.nl',
    referenceYear:   2024,
    categoryContext: 'Corrugated cardboard packaging',
    status:          'SUBMITTED',
    token:           'demo-token-abc-001',
    tokenExpiresAt:  '2099-12-31T00:00:00.000Z',
    createdAt:       '2025-01-15T09:00:00.000Z',
    updatedAt:       '2025-02-10T14:30:00.000Z',
  },
  {
    id:              2,
    supplierName:    'Greentex Industries',
    supplierEmail:   'sustainability@greentex.de',
    referenceYear:   2024,
    categoryContext: 'Recycled polyester fibre',
    status:          'INVITED',
    token:           'demo-token-xyz-002',
    tokenExpiresAt:  '2099-12-31T00:00:00.000Z',
    createdAt:       '2025-02-01T11:30:00.000Z',
    updatedAt:       '2025-02-01T11:30:00.000Z',
  },
];

const responses = {
  1: {
    id:            1,
    requestId:     1,
    status:        'SUBMITTED',
    orgName:       'Acme Packaging B.V.',
    identifier:    '12345678',
    identifierType:'KVK',
    referenceYear: 2024,
    dataSourceType:'MEASURED',
    contactPerson: 'Jan de Vries',
    contactEmail:  'jan.devries@acme-packaging.nl',
    submittedAt:   '2025-02-10T14:30:00.000Z',
    updatedAt:     '2025-02-10T14:30:00.000Z',
    reviewNote:    null,
    items: [
      {
        id:             1,
        responseId:     1,
        sortOrder:      0,
        productName:    'Standard Box 30×20×10 cm',
        productCode:    'SB-3020',
        outputQty:      50000,
        outputUnit:     'kg',
        electricityKwh: 42000,
        gasM3:          800,
        solidFuelKg:    null,
        transportTkm:   null,
        waterM3:        120,
        heatKwh:        null,
        otherInputs:    null,
        manualCo2e:     18500,
      },
    ],
    transport: [
      {
        id:          1,
        responseId:  1,
        mode:        'TRUCK',
        distanceKm:  250,
        massKg:      50000,
        loadFactor:  0.75,
        refrigerated:false,
      },
    ],
    attachments:  [],
    calculations: [
      {
        id:                      1,
        responseId:              1,
        itemId:                  1,
        totalKgco2e:             19250.5,
        intensityKgco2ePerUnit:  0.3850,
        calcRuleVersion:         '1.0',
        qualityLabel:            'MEASURED',
        deviationFlag:           true,
        deviationPercent:        4.1,
        publishedAt:             null,
      },
    ],
  },
};

const statusHistory = {
  1: [
    { id: 1, requestId: 1, oldStatus: 'INVITED',  newStatus: 'STARTED',   changedBy: 'supplier', note: null, createdAt: '2025-01-20T10:00:00.000Z' },
    { id: 2, requestId: 1, oldStatus: 'STARTED',  newStatus: 'SUBMITTED', changedBy: 'supplier', note: null, createdAt: '2025-02-10T14:30:00.000Z' },
  ],
  2: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    req.customer = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

function findRequest(id) {
  return requests.find(r => r.id === id) ?? null;
}

function findByToken(token) {
  return requests.find(r => r.token === token) ?? null;
}

function recordTransition(requestId, newStatus, changedBy, note = null) {
  const req = findRequest(requestId);
  if (!req) return null;
  const oldStatus = req.status;
  req.status    = newStatus;
  req.updatedAt = new Date().toISOString();
  if (!statusHistory[requestId]) statusHistory[requestId] = [];
  statusHistory[requestId].push({
    id:        _nextHistoryId++,
    requestId,
    oldStatus,
    newStatus,
    changedBy,
    note,
    createdAt: new Date().toISOString(),
  });
  return req;
}

function simpleCalc(items, dataSourceType) {
  return items.map((item, idx) => {
    const electricity = (parseFloat(item.electricityKwh) || 0) * 0.4;
    const gas         = (parseFloat(item.gasM3)          || 0) * 1.9;
    const total       = electricity + gas;
    const qty         = parseFloat(item.outputQty) || 1;
    return {
      id:                     _nextResponseId + idx,
      responseId:             null,
      itemId:                 idx + 1,
      totalKgco2e:            parseFloat(total.toFixed(4)),
      intensityKgco2ePerUnit: parseFloat((total / qty).toFixed(6)),
      calcRuleVersion:        '1.0',
      qualityLabel:           dataSourceType === 'MEASURED' ? 'MEASURED' : 'ESTIMATED',
      deviationFlag:          false,
      deviationPercent:       null,
      publishedAt:            null,
    };
  });
}

// ─── Router ───────────────────────────────────────────────────────────────────

const api = express.Router();

// ── Auth ─────────────────────────────────────────────────────────────────────

api.post('/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (email !== MOCK_CUSTOMER.email || password !== MOCK_CUSTOMER.password) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const token = jwt.sign(
    { email: MOCK_CUSTOMER.email, name: MOCK_CUSTOMER.name, role: 'customer' },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, user: { email: MOCK_CUSTOMER.email, name: MOCK_CUSTOMER.name } });
});

// ── Customer: Requests ────────────────────────────────────────────────────────

api.get('/requests', requireAuth, (req, res) => {
  const list = [...requests].reverse().map(r => ({
    ...r,
    response: responses[r.id]
      ? { id: responses[r.id].id, status: responses[r.id].status, submittedAt: responses[r.id].submittedAt }
      : null,
  }));
  res.json(list);
});

api.get('/requests/:id', requireAuth, (req, res) => {
  const id  = parseInt(req.params.id, 10);
  const req_ = findRequest(id);
  if (!req_) return res.status(404).json({ error: 'Not found.' });
  res.json({
    ...req_,
    response:      responses[id] ?? null,
    statusHistory: statusHistory[id] ?? [],
  });
});

api.post('/requests', requireAuth, (req, res) => {
  const { supplierName, supplierEmail, referenceYear, categoryContext } = req.body ?? {};
  const token = `token-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now   = new Date().toISOString();
  const newReq = {
    id:              _nextId++,
    supplierName:    supplierName  ?? 'Unknown Supplier',
    supplierEmail:   supplierEmail ?? '',
    referenceYear:   referenceYear ?? new Date().getFullYear(),
    categoryContext: categoryContext ?? '',
    status:          'INVITED',
    token,
    tokenExpiresAt:  new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    createdAt:       now,
    updatedAt:       now,
  };
  requests.push(newReq);
  statusHistory[newReq.id] = [];

  const origin     = req.headers.origin || `https://${req.headers.host}`;
  const inviteLink = `${origin}/supplier/${token}`;
  res.status(201).json({ ...newReq, inviteLink });
});

// ── Status transitions ────────────────────────────────────────────────────────

api.post('/requests/:id/validate', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const updated = recordTransition(id, 'VALIDATED', req.customer.email);
  if (!updated) return res.status(404).json({ error: 'Not found.' });
  res.json(updated);
});

api.post('/requests/:id/accept', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const updated = recordTransition(id, 'ACCEPTED', req.customer.email);
  if (!updated) return res.status(404).json({ error: 'Not found.' });
  res.json(updated);
});

api.post('/requests/:id/reject', requireAuth, (req, res) => {
  const id   = parseInt(req.params.id, 10);
  const note = req.body?.note ?? '';
  if (!note || note.length < 10) {
    return res.status(422).json({ error: 'Validation failed', errors: ['note: Must be at least 10 characters.'] });
  }
  const updated = recordTransition(id, 'REJECTED', req.customer.email, note);
  if (!updated) return res.status(404).json({ error: 'Not found.' });
  if (responses[id]) responses[id].reviewNote = note;
  res.json({ success: true });
});

api.post('/requests/:id/publish', requireAuth, (req, res) => {
  const id   = parseInt(req.params.id, 10);
  const resp = responses[id];
  if (!resp) return res.status(404).json({ error: 'No submission found for this request.' });

  const publishedAt = new Date().toISOString();
  (resp.calculations ?? []).forEach(c => { c.publishedAt = publishedAt; });
  recordTransition(id, 'PUBLISHED', req.customer.email);
  res.json({ success: true });
});

// ── Supplier portal ───────────────────────────────────────────────────────────

api.get('/supplier/:token', (req, res) => {
  const request = findByToken(req.params.token);
  if (!request) return res.status(404).json({ error: 'Invalid or expired invitation link.' });

  if (request.status === 'INVITED') {
    recordTransition(request.id, 'STARTED', 'supplier');
  }

  res.json({
    request: {
      id:              request.id,
      supplierName:    request.supplierName,
      supplierEmail:   request.supplierEmail,
      referenceYear:   request.referenceYear,
      categoryContext: request.categoryContext,
      token:           request.token,
      status:          request.status,
    },
    response: responses[request.id] ?? null,
  });
});

api.put('/supplier/:token/draft', (req, res) => {
  const request = findByToken(req.params.token);
  if (!request) return res.status(404).json({ error: 'Invalid or expired invitation link.' });
  if (!['STARTED', 'REJECTED'].includes(request.status)) {
    return res.status(409).json({ error: `Cannot update a submission in status ${request.status}.` });
  }

  const body   = req.body ?? {};
  const stepA  = body.stepA ?? {};
  const stepB  = body.stepB ?? {};
  const stepC  = body.stepC ?? {};
  const flat   = { ...body, ...stepA };

  const { orgName, identifier, identifierType, dataSourceType, contactPerson, contactEmail } = flat;
  const items     = stepB.items     ?? body.items     ?? [];
  const transport = stepC.transport ?? body.transport ?? [];
  const now       = new Date().toISOString();

  let resp = responses[request.id];
  if (!resp) {
    resp = {
      id:            _nextResponseId++,
      requestId:     request.id,
      status:        'DRAFT',
      orgName:       orgName       ?? '',
      identifier:    identifier    ?? '',
      identifierType:identifierType ?? 'OTHER',
      referenceYear: request.referenceYear,
      dataSourceType:dataSourceType ?? 'ESTIMATED',
      contactPerson: contactPerson ?? '',
      contactEmail:  contactEmail  ?? '',
      submittedAt:   null,
      updatedAt:     now,
      reviewNote:    null,
      items:         [],
      transport:     [],
      attachments:   [],
      calculations:  [],
    };
    responses[request.id] = resp;
  } else {
    Object.assign(resp, { orgName, identifier, identifierType, dataSourceType, contactPerson, contactEmail, updatedAt: now });
  }

  resp.items     = items.map((item, idx)  => ({ id: idx + 1, responseId: resp.id, sortOrder: idx, ...item }));
  resp.transport = transport.map((t, idx) => ({ id: idx + 1, responseId: resp.id, ...t }));

  res.json({ success: true, responseId: resp.id });
});

api.post('/supplier/:token/submit', upload.any(), (req, res) => {
  const request = findByToken(req.params.token);
  if (!request) return res.status(404).json({ error: 'Invalid or expired invitation link.' });
  if (!['STARTED', 'REJECTED'].includes(request.status)) {
    return res.status(409).json({ error: `Cannot submit in status ${request.status}.` });
  }

  // The frontend sends JSON in a 'data' field within multipart/form-data
  let body = req.body ?? {};
  if (typeof body.data === 'string') {
    try { body = JSON.parse(body.data); } catch { /* keep raw */ }
  }

  const flat = body.stepA
    ? { ...body.stepA, items: body.stepB?.items ?? [], transport: body.stepC?.transport ?? [] }
    : { ...body, items: body.items ?? [], transport: body.transport ?? [] };

  const { orgName, identifier, identifierType, dataSourceType, contactPerson, contactEmail } = flat;
  const items     = flat.items     ?? [];
  const transport = flat.transport ?? [];
  const now       = new Date().toISOString();

  const respId = responses[request.id]?.id ?? _nextResponseId++;
  const calcs  = simpleCalc(items, dataSourceType);
  calcs.forEach(c => { c.responseId = respId; });

  responses[request.id] = {
    id:            respId,
    requestId:     request.id,
    status:        'SUBMITTED',
    orgName:       orgName       ?? '',
    identifier:    identifier    ?? '',
    identifierType:identifierType ?? 'OTHER',
    referenceYear: request.referenceYear,
    dataSourceType:dataSourceType ?? 'ESTIMATED',
    contactPerson: contactPerson ?? '',
    contactEmail:  contactEmail  ?? '',
    submittedAt:   now,
    updatedAt:     now,
    reviewNote:    null,
    items:     items.map((item, idx)  => ({ id: idx + 1, responseId: respId, sortOrder: idx, ...item })),
    transport: transport.map((t, idx) => ({ id: idx + 1, responseId: respId, ...t })),
    attachments: (req.files ?? []).map((f, idx) => ({
      id: idx + 1, responseId: respId, filename: f.originalname, originalName: f.originalname,
      mimeType: f.mimetype, size: f.size,
    })),
    calculations: calcs,
  };

  recordTransition(request.id, 'SUBMITTED', 'supplier');
  res.json({ success: true, responseId: respId, calculations: calcs });
});

// ── Published results ──────────────────────────────────────────────────────────

api.get('/published', (req, res) => {
  const results = [];
  for (const resp of Object.values(responses)) {
    for (const calc of (resp.calculations ?? [])) {
      if (!calc.publishedAt) continue;
      const req_ = findRequest(resp.requestId);
      const item = (resp.items ?? []).find(i => i.id === calc.itemId);
      results.push({
        ...calc,
        response: {
          orgName:       resp.orgName,
          referenceYear: resp.referenceYear,
          dataSourceType:resp.dataSourceType,
          request: {
            supplierName:    req_?.supplierName,
            categoryContext: req_?.categoryContext,
          },
        },
        item: item
          ? { productName: item.productName, outputQty: item.outputQty, outputUnit: item.outputUnit }
          : null,
      });
    }
  }
  res.json(results);
});

// ─── Mount and export ─────────────────────────────────────────────────────────

app.use('/api', api);

module.exports.handler = serverless(app);
