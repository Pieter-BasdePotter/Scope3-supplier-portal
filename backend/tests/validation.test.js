const {
  validate,
  createRequestSchema,
  fullSubmissionSchema,
  stepASchema,
  normalizeNumber,
} = require('../src/services/validationService');

const CURRENT_YEAR = new Date().getFullYear();

describe('normalizeNumber', () => {
  test('handles integer', () => expect(normalizeNumber(5)).toBe(5));
  test('handles string float', () => expect(normalizeNumber('3.14')).toBeCloseTo(3.14));
  test('normalizes comma decimal', () => expect(normalizeNumber('1,234')).toBeCloseTo(1.234));
  test('returns NaN for invalid', () => expect(normalizeNumber('abc')).toBeNaN());
  test('returns undefined for empty string', () => expect(normalizeNumber('')).toBeUndefined());
});

describe('createRequestSchema', () => {
  const valid = {
    supplierName: 'Acme BV',
    supplierEmail: 'test@acme.nl',
    referenceYear: 2023,
    categoryContext: 'Packaging materials',
  };

  test('accepts valid data', () => {
    const { valid: ok } = validate(createRequestSchema, valid);
    expect(ok).toBe(true);
  });

  test('rejects missing supplierName', () => {
    const { valid: ok, errors } = validate(createRequestSchema, { ...valid, supplierName: '' });
    expect(ok).toBe(false);
    expect(errors).toHaveProperty('supplierName');
  });

  test('rejects invalid email', () => {
    const { valid: ok, errors } = validate(createRequestSchema, { ...valid, supplierEmail: 'not-an-email' });
    expect(ok).toBe(false);
    expect(errors).toHaveProperty('supplierEmail');
  });

  test('rejects future reference year', () => {
    const { valid: ok, errors } = validate(createRequestSchema, { ...valid, referenceYear: CURRENT_YEAR + 1 });
    expect(ok).toBe(false);
    expect(errors).toHaveProperty('referenceYear');
  });

  test('rejects year before 2010', () => {
    const { valid: ok, errors } = validate(createRequestSchema, { ...valid, referenceYear: 2009 });
    expect(ok).toBe(false);
    expect(errors).toHaveProperty('referenceYear');
  });
});

describe('fullSubmissionSchema', () => {
  const validItem = {
    productName: 'Widget A', outputQty: 1000, outputUnit: 'kg', electricityKwh: 500,
  };
  const validA = {
    orgName: 'Acme BV', identifier: '12345678', identifierType: 'KVK',
    referenceYear: 2023, dataSourceType: 'MEASURED',
    contactPerson: 'Jan', contactEmail: 'jan@acme.nl',
  };

  test('accepts valid full submission', () => {
    const { valid: ok } = validate(fullSubmissionSchema, { ...validA, items: [validItem] });
    expect(ok).toBe(true);
  });

  test('rejects negative outputQty', () => {
    const { valid: ok, errors } = validate(fullSubmissionSchema, {
      ...validA, items: [{ ...validItem, outputQty: -1 }],
    });
    expect(ok).toBe(false);
    expect(errors['items.0.outputQty']).toBeTruthy();
  });

  test('rejects invalid unit', () => {
    const { valid: ok, errors } = validate(fullSubmissionSchema, {
      ...validA, items: [{ ...validItem, outputUnit: 'INVALID_UNIT' }],
    });
    expect(ok).toBe(false);
    expect(errors['items.0.outputUnit']).toBeTruthy();
  });

  test('rejects zero items array', () => {
    const { valid: ok } = validate(fullSubmissionSchema, { ...validA, items: [] });
    expect(ok).toBe(false);
  });

  test('normalizes comma decimal in outputQty', () => {
    const { valid: ok, data } = validate(fullSubmissionSchema, {
      ...validA, items: [{ ...validItem, outputQty: '1,5' }],
    });
    expect(ok).toBe(true);
    expect(data.items[0].outputQty).toBeCloseTo(1.5);
  });

  test('rejects NaN value', () => {
    const { valid: ok } = validate(fullSubmissionSchema, {
      ...validA, items: [{ ...validItem, electricityKwh: 'not-a-number' }],
    });
    expect(ok).toBe(false);
  });
});
