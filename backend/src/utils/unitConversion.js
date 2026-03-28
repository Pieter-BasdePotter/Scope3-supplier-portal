/**
 * Unit conversion utilities.
 * Conversions are explicit — no guessing.
 */

/** Convert tons to kilograms */
function tonToKg(ton) { return ton * 1000; }

/** Convert kg to tons */
function kgToTon(kg) { return kg / 1000; }

/** Convert GJ to kWh (1 GJ = 277.778 kWh) */
function gjToKwh(gj) { return gj * 277.778; }

/** Convert kWh to GJ */
function kwhToGj(kwh) { return kwh / 277.778; }

/** Convert km + mass (kg) to ton-km */
function toTonKm(distanceKm, massKg) { return distanceKm * (massKg / 1000); }

/**
 * Normalize a decimal number string: replaces comma separator with period.
 * Returns the float value or NaN if invalid.
 */
function normalizeDecimal(str) {
  if (typeof str === 'number') return str;
  const s = String(str ?? '').trim().replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

module.exports = { tonToKg, kgToTon, gjToKwh, kwhToGj, toTonKm, normalizeDecimal };
