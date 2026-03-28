const { transitionStatus, TRANSITIONS } = require('../src/services/statusService');
const prisma = require('../src/config/database');

jest.mock('../src/config/database', () => ({
  supplierRequest: { findUniqueOrThrow: jest.fn(), updateMany: jest.fn() },
  statusHistory:   { create: jest.fn() },
  $transaction:    jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation(async (ops) => {
    const results = await Promise.all(ops.map(op => op));
    return results;
  });
  // updateMany returns { count: 1 } on success (CAS matched)
  prisma.supplierRequest.updateMany.mockResolvedValue({ count: 1 });
  prisma.statusHistory.create.mockResolvedValue({});
});

describe('TRANSITIONS map', () => {
  test('INVITED can only go to STARTED', () => {
    expect(TRANSITIONS.INVITED).toEqual(['STARTED']);
  });
  test('VALIDATED can go to ACCEPTED or REJECTED', () => {
    expect(TRANSITIONS.VALIDATED).toContain('ACCEPTED');
    expect(TRANSITIONS.VALIDATED).toContain('REJECTED');
  });
  test('PUBLISHED has no further transitions', () => {
    expect(TRANSITIONS.PUBLISHED).toHaveLength(0);
  });
  test('REJECTED can go back to STARTED', () => {
    expect(TRANSITIONS.REJECTED).toContain('STARTED');
  });
});

describe('transitionStatus', () => {
  test('valid transition INVITED → STARTED succeeds', async () => {
    prisma.supplierRequest.findUniqueOrThrow.mockResolvedValue({ id: 1, status: 'INVITED' });
    const result = await transitionStatus(1, 'STARTED', 'supplier');
    expect(result.status).toBe('STARTED');
    expect(prisma.statusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ oldStatus: 'INVITED', newStatus: 'STARTED' }) })
    );
  });

  test('valid transition VALIDATED → ACCEPTED succeeds', async () => {
    prisma.supplierRequest.findUniqueOrThrow.mockResolvedValue({ id: 1, status: 'VALIDATED' });
    const result = await transitionStatus(1, 'ACCEPTED', 'customer');
    expect(result.status).toBe('ACCEPTED');
  });

  test('invalid transition INVITED → PUBLISHED throws 409', async () => {
    prisma.supplierRequest.findUniqueOrThrow.mockResolvedValue({ id: 1, status: 'INVITED' });
    await expect(transitionStatus(1, 'PUBLISHED', 'customer')).rejects.toMatchObject({
      status: 409,
      code:   'INVALID_TRANSITION',
    });
  });

  test('invalid transition SUBMITTED → PUBLISHED throws 409', async () => {
    prisma.supplierRequest.findUniqueOrThrow.mockResolvedValue({ id: 1, status: 'SUBMITTED' });
    await expect(transitionStatus(1, 'PUBLISHED', 'customer')).rejects.toMatchObject({
      status: 409,
    });
  });

  test('REJECTED → STARTED is valid (resubmission flow)', async () => {
    prisma.supplierRequest.findUniqueOrThrow.mockResolvedValue({ id: 1, status: 'REJECTED' });
    const result = await transitionStatus(1, 'STARTED', 'supplier');
    expect(result.status).toBe('STARTED');
  });

  test('concurrent modification: throws CONCURRENT_MODIFICATION when count=0', async () => {
    prisma.supplierRequest.findUniqueOrThrow.mockResolvedValue({ id: 1, status: 'SUBMITTED' });
    prisma.supplierRequest.updateMany.mockResolvedValue({ count: 0 }); // CAS missed
    await expect(transitionStatus(1, 'VALIDATED', 'customer')).rejects.toMatchObject({
      status: 409,
      code:   'CONCURRENT_MODIFICATION',
    });
  });
});
