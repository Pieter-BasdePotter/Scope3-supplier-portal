const { calculateItem, DEVIATION_THRESHOLD, DATA_SOURCE_QUALITY } = require('../src/services/calculationService');
const prisma = require('../src/config/database');

// Mock emission factor lookup
jest.mock('../src/config/database', () => ({
  emissionFactor: { findFirst: jest.fn() },
}));

const FACTORS = {
  electricity:     0.649,
  natural_gas:     1.884,
  solid_fuel_coal: 2.500,
  water:           0.344,
  heat_steam:      0.067,
  transport_road:  0.096,
};

beforeEach(() => {
  prisma.emissionFactor.findFirst.mockImplementation(({ where }) => {
    const factor = FACTORS[where.type];
    return Promise.resolve(factor !== undefined ? { factorKgco2e: factor } : null);
  });
});

afterEach(() => jest.clearAllMocks());

describe('calculateItem', () => {
  test('electricity: 1000 kWh → 649 kgCO2e', async () => {
    const result = await calculateItem({ electricityKwh: 1000, outputQty: 1, outputUnit: 'piece' });
    expect(result.totalKgco2e).toBeCloseTo(649, 1);
  });

  test('natural gas: 100 m3 → 188.4 kgCO2e', async () => {
    const result = await calculateItem({ gasM3: 100, outputQty: 1, outputUnit: 'piece' });
    expect(result.totalKgco2e).toBeCloseTo(188.4, 1);
  });

  test('combined: electricity + gas', async () => {
    const result = await calculateItem({ electricityKwh: 1000, gasM3: 100, outputQty: 1, outputUnit: 'piece' });
    expect(result.totalKgco2e).toBeCloseTo(649 + 188.4, 1);
  });

  test('intensity = totalKgco2e / outputQty', async () => {
    const result = await calculateItem({ electricityKwh: 1000, outputQty: 500, outputUnit: 'kg' });
    expect(result.intensityKgco2ePerUnit).toBeCloseTo(649 / 500, 3);
  });

  test('deviation flag set when manual CO2e differs >20%', async () => {
    const result = await calculateItem({ electricityKwh: 1000, outputQty: 1, outputUnit: 'piece', manualCo2e: 900 });
    // calc = 649, manual = 900, diff = 251/649 = 38.7% > 20%
    expect(result.deviationFlag).toBe(true);
  });

  test('no deviation flag when manual CO2e within 20%', async () => {
    const result = await calculateItem({ electricityKwh: 1000, outputQty: 1, outputUnit: 'piece', manualCo2e: 650 });
    // calc = 649, diff = 1/649 ≈ 0.15% < 20%
    expect(result.deviationFlag).toBe(false);
  });

  test('calcRuleVersion is pinned to v1.0', async () => {
    const result = await calculateItem({ electricityKwh: 1, outputQty: 1, outputUnit: 'piece' });
    expect(result.calcRuleVersion).toBe('v1.0');
  });

  test('returns zero total when no activity data provided', async () => {
    const result = await calculateItem({ outputQty: 100, outputUnit: 'kg' });
    expect(result.totalKgco2e).toBe(0);
  });

  test('intensity is 0 when outputQty is 0', async () => {
    const result = await calculateItem({ electricityKwh: 100, outputQty: 0, outputUnit: 'piece' });
    expect(result.intensityKgco2ePerUnit).toBe(0);
  });
});

describe('DATA_SOURCE_QUALITY mapping', () => {
  test('MEASURED → A', () => expect(DATA_SOURCE_QUALITY.MEASURED).toBe('A'));
  test('CALCULATED → B', () => expect(DATA_SOURCE_QUALITY.CALCULATED).toBe('B'));
  test('ESTIMATED → C', () => expect(DATA_SOURCE_QUALITY.ESTIMATED).toBe('C'));
  test('EXTERNAL_LCA → D', () => expect(DATA_SOURCE_QUALITY.EXTERNAL_LCA).toBe('D'));
});
