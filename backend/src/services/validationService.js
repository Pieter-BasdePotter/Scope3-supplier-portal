const { z } = require('zod');

// ─── Whitelists ─────────────────────────────────────────────────────────────

const OUTPUT_UNITS = ['kg', 'ton', 'm3', 'L', 'kWh', 'GJ', 'piece', 'km', 'hour', 'm2'];
const IDENTIFIER_TYPES = ['KVK', 'VAT', 'DUNS', 'OTHER'];
const DATA_SOURCE_TYPES = ['MEASURED', 'CALCULATED', 'ESTIMATED', 'EXTERNAL_LCA'];
const TRANSPORT_MODES = ['ROAD', 'RAIL', 'SEA', 'AIR'];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 2010;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normalize decimal separators (comma → period) and parse.
 * Returns NaN if unparseable.
 */
function normalizeNumber(val) {
  if (val === null || val === undefined || val === '') return undefined;
  if (typeof val === 'number') return val;
  const normalized = String(val).replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : NaN;
}

const safePositiveFloat = z
  .preprocess(normalizeNumber, z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Must be ≥ 0').finite('Must be a finite number'))
  .optional();

const safePositiveFloatRequired = z.preprocess(
  normalizeNumber,
  z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Must be ≥ 0').finite('Must be a finite number')
);

// ─── Step A Schema ──────────────────────────────────────────────────────────

const stepASchema = z.object({
  orgName:        z.string().min(1, 'Organisation name is required'),
  identifier:     z.string().min(1, 'Identifier is required'),
  identifierType: z.enum(IDENTIFIER_TYPES, { errorMap: () => ({ message: 'Invalid identifier type' }) }),
  referenceYear:  z.preprocess(Number, z.number().int().min(MIN_YEAR, `Year must be ${MIN_YEAR} or later`).max(CURRENT_YEAR, 'Reference year cannot be in the future')),
  dataSourceType: z.enum(DATA_SOURCE_TYPES, { errorMap: () => ({ message: 'Invalid data source type' }) }),
  contactPerson:  z.string().min(1, 'Contact person is required'),
  contactEmail:   z.string().email('Invalid email address'),
});

// ─── Step B Schema (single row) ─────────────────────────────────────────────

const responseItemSchema = z.object({
  productName:    z.string().min(1, 'Product/service name is required'),
  productCode:    z.string().optional(),
  outputQty:      safePositiveFloatRequired,
  outputUnit:     z.enum(OUTPUT_UNITS, { errorMap: () => ({ message: `Unit must be one of: ${OUTPUT_UNITS.join(', ')}` }) }),
  electricityKwh: safePositiveFloat,
  gasM3:          safePositiveFloat,
  solidFuelKg:    safePositiveFloat,
  transportTkm:   safePositiveFloat,
  waterM3:        safePositiveFloat,
  heatKwh:        safePositiveFloat,
  otherInputs:    z.array(z.object({
    key:    z.string().min(1),
    value:  safePositiveFloat,
    unit:   z.string().optional(),
  })).optional(),
  manualCo2e:     safePositiveFloat,
  sortOrder:      z.number().int().optional().default(0),
});

const stepBSchema = z.object({
  items: z.array(responseItemSchema).min(1, 'At least one product/service row is required'),
});

// ─── Step C Schema ──────────────────────────────────────────────────────────

const transportRowSchema = z.object({
  mode:        z.enum(TRANSPORT_MODES, { errorMap: () => ({ message: 'Invalid transport mode' }) }),
  distanceKm:  safePositiveFloatRequired,
  massKg:      safePositiveFloat,
  loadFactor:  z.preprocess(normalizeNumber, z.number().min(0).max(1).optional()),
  refrigerated: z.boolean().optional().default(false),
});

const stepCSchema = z.object({
  transport: z.array(transportRowSchema).optional().default([]),
});

// ─── Full submission schema ──────────────────────────────────────────────────

const fullSubmissionSchema = stepASchema.merge(stepBSchema).merge(stepCSchema);

// ─── Supplier request creation ───────────────────────────────────────────────

const createRequestSchema = z.object({
  supplierName:    z.string().min(1, 'Supplier name is required'),
  supplierEmail:   z.string().email('Invalid supplier email'),
  referenceYear:   z.preprocess(Number, z.number().int().min(MIN_YEAR, `Year must be ${MIN_YEAR} or later`).max(CURRENT_YEAR, 'Reference year cannot be in the future')),
  categoryContext: z.string().min(1, 'Category/context is required'),
});

// ─── Review action schema ────────────────────────────────────────────────────

const rejectSchema = z.object({
  note: z.string().min(10, 'Please provide a rejection reason (min 10 characters)'),
});

// ─── Validate and format errors ─────────────────────────────────────────────

function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return { valid: true, data: result.data, errors: null };

  const errors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  }
  return { valid: false, data: null, errors };
}

module.exports = {
  OUTPUT_UNITS,
  IDENTIFIER_TYPES,
  DATA_SOURCE_TYPES,
  TRANSPORT_MODES,
  normalizeNumber,
  stepASchema,
  stepBSchema,
  stepCSchema,
  fullSubmissionSchema,
  createRequestSchema,
  rejectSchema,
  validate,
};
