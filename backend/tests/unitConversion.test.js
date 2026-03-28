const { tonToKg, kgToTon, gjToKwh, kwhToGj, toTonKm, normalizeDecimal } = require('../src/utils/unitConversion');

describe('unit conversions', () => {
  describe('tonToKg', () => {
    test('1 ton = 1000 kg', () => expect(tonToKg(1)).toBe(1000));
    test('2.5 ton = 2500 kg', () => expect(tonToKg(2.5)).toBe(2500));
    test('0 ton = 0 kg', () => expect(tonToKg(0)).toBe(0));
  });

  describe('kgToTon', () => {
    test('1000 kg = 1 ton', () => expect(kgToTon(1000)).toBe(1));
    test('500 kg = 0.5 ton', () => expect(kgToTon(500)).toBe(0.5));
  });

  describe('gjToKwh', () => {
    test('1 GJ = 277.778 kWh', () => expect(gjToKwh(1)).toBeCloseTo(277.778, 2));
    test('3.6 GJ = 1000 kWh', () => expect(gjToKwh(3.6)).toBeCloseTo(1000, 0));
  });

  describe('kwhToGj', () => {
    test('1000 kWh = 3.6 GJ', () => expect(kwhToGj(1000)).toBeCloseTo(3.6, 1));
    test('roundtrip: GJ → kWh → GJ', () => expect(kwhToGj(gjToKwh(5))).toBeCloseTo(5, 4));
  });

  describe('toTonKm', () => {
    test('100 km, 20000 kg = 2000 tkm', () => expect(toTonKm(100, 20000)).toBe(2000));
    test('50 km, 1000 kg = 50 tkm', () => expect(toTonKm(50, 1000)).toBe(50));
  });

  describe('normalizeDecimal', () => {
    test('comma replaced with period', () => expect(normalizeDecimal('3,14')).toBeCloseTo(3.14));
    test('period unchanged', () => expect(normalizeDecimal('3.14')).toBeCloseTo(3.14));
    test('integer string', () => expect(normalizeDecimal('42')).toBe(42));
    test('number passthrough', () => expect(normalizeDecimal(7.5)).toBe(7.5));
    test('invalid returns NaN', () => expect(normalizeDecimal('abc')).toBeNaN());
    test('empty string returns NaN', () => expect(normalizeDecimal('')).toBeNaN());
  });
});
