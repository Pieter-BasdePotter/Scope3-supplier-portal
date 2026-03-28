const { generateToken, tokenExpiresAt, validateToken } = require('../src/services/tokenService');
const prisma = require('../src/config/database');

jest.mock('../src/config/database', () => ({
  supplierRequest: {
    findUnique: jest.fn(),
  },
}));

describe('tokenService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('generateToken returns 64-char hex string', () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  test('generateToken produces unique values', () => {
    const tokens = new Set(Array.from({ length: 100 }, generateToken));
    expect(tokens.size).toBe(100);
  });

  test('tokenExpiresAt returns a future date', () => {
    const expiry = tokenExpiresAt();
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });

  test('validateToken resolves on valid non-expired token', async () => {
    const mockRequest = {
      id: 1, token: 'abc',
      tokenExpiresAt: new Date(Date.now() + 3600000),
      status: 'INVITED',
      response: null,
    };
    prisma.supplierRequest.findUnique.mockResolvedValue(mockRequest);

    const result = await validateToken('abc');
    expect(result.id).toBe(1);
  });

  test('validateToken throws 404 for unknown token', async () => {
    prisma.supplierRequest.findUnique.mockResolvedValue(null);

    await expect(validateToken('unknown-token')).rejects.toMatchObject({
      status: 404,
    });
  });

  test('validateToken throws 401 with TOKEN_EXPIRED for expired token', async () => {
    prisma.supplierRequest.findUnique.mockResolvedValue({
      id: 1, token: 'expired',
      tokenExpiresAt: new Date(Date.now() - 1000), // past
      response: null,
    });

    await expect(validateToken('expired')).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_EXPIRED',
    });
  });
});
