const prisma = require('../config/database');
const logger = require('../utils/logger');

// ─── Emission factor type → activity field mapping ───────────────────────────

const TRANSPORT_MODE_MAP = {
  ROAD: 'transport_road',
  RAIL: 'transport_rail',
  SEA:  'transport_sea',
  AIR:  'transport_air',
};

const DATA_SOURCE_QUALITY = {
  MEASURED:     'A',
  CALCULATED:   'B',
  ESTIMATED:    'C',
  EXTERNAL_LCA: 'D',
};

const CALC_RULE_VERSION = 'v1.0';
const DEVIATION_THRESHOLD = 0.20;

// ─── Factor lookup ───────────────────────────────────────────────────────────

/**
 * Look up an emission factor by type.
 * Returns { factorKgco2e, missing } — missing=true when no factor found.
 */
async function getFactor(type) {
  const factor = await prisma.emissionFactor.findFirst({
    where:   { type, version: CALC_RULE_VERSION },
    orderBy: { year: 'desc' },
  });
  if (!factor) {
    logger.warn('Emission factor not found', { type, version: CALC_RULE_VERSION });
    return { factorKgco2e: 0, missing: true };
  }
  return { factorKgco2e: factor.factorKgco2e, missing: false };
}

// ─── Calculation ─────────────────────────────────────────────────────────────

async function calculateItem(item) {
  const [fElec, fGas, fFuel, fWater, fHeat, fTransport] = await Promise.all([
    getFactor('electricity'),
    getFactor('natural_gas'),
    getFactor('solid_fuel_coal'),
    getFactor('water'),
    getFactor('heat_steam'),
    getFactor('transport_road'),
  ]);

  let total = 0;
  let anyFactorMissing = false;

  const add = (qty, f) => {
    if (qty && f.factorKgco2e > 0) total += qty * f.factorKgco2e;
    if (qty && f.missing) anyFactorMissing = true;
  };

  add(item.electricityKwh, fElec);
  add(item.gasM3,          fGas);
  add(item.solidFuelKg,    fFuel);
  add(item.waterM3,        fWater);
  add(item.heatKwh,        fHeat);
  add(item.transportTkm,   fTransport);   // item-level transport uses road factor as default

  if (Array.isArray(item.otherInputs)) {
    for (const entry of item.otherInputs) {
      const f = await getFactor(entry.key);
      total += (entry.value ?? 0) * (f.factorKgco2e > 0 ? f.factorKgco2e : 1);
      if (f.missing) anyFactorMissing = true;
    }
  }

  const intensity = item.outputQty > 0 ? total / item.outputQty : 0;

  let deviationFlag = false;
  let deviationPercent = null;
  if (item.manualCo2e != null && total > 0) {
    deviationPercent = Math.abs(item.manualCo2e - total) / total;
    deviationFlag = deviationPercent > DEVIATION_THRESHOLD;
  }

  return {
    calcRuleVersion:        CALC_RULE_VERSION,
    totalKgco2e:            Math.round(total * 1000) / 1000,
    intensityKgco2ePerUnit: Math.round(intensity * 1000) / 1000,
    deviationFlag,
    deviationPercent: deviationPercent != null ? Math.round(deviationPercent * 10000) / 100 : null,
    factorMissing:    anyFactorMissing,
  };
}

async function calculateTransport(transport) {
  const factorType = TRANSPORT_MODE_MAP[transport.mode];
  const f = await getFactor(factorType);

  const massKg = transport.massKg ?? 1000;
  const tkm    = (massKg / 1000) * transport.distanceKm;
  const total  = tkm * f.factorKgco2e;

  return {
    calcRuleVersion: CALC_RULE_VERSION,
    totalKgco2e:     Math.round(total * 1000) / 1000,
    mode:            transport.mode,
    tkm:             Math.round(tkm * 1000) / 1000,
    factorMissing:   f.missing,
  };
}

/**
 * Run full calculation for a SupplierResponse.
 * Calculates per-item emissions AND transport totals, persists EmissionCalculation rows.
 */
async function calculateResponse(responseId) {
  const response = await prisma.supplierResponse.findUniqueOrThrow({
    where:   { id: responseId },
    include: { items: true, transport: true },
  });

  const qualityLabel = DATA_SOURCE_QUALITY[response.dataSourceType];
  const results = [];

  // ── Per-item calculations ──────────────────────────────────────────────────
  for (const item of response.items) {
    const calc = await calculateItem(item);

    await prisma.emissionCalculation.upsert({
      where:  { itemId: item.id },
      update: { ...calc, qualityLabel, responseId },
      create: { ...calc, qualityLabel, responseId, itemId: item.id },
    });

    results.push({ itemId: item.id, productName: item.productName, ...calc, qualityLabel });
  }

  // ── Transport totals (summary — returned but not persisted per-leg) ────────
  if (response.transport.length > 0) {
    const transportResults = await Promise.all(response.transport.map(calculateTransport));
    const totalTransportKgco2e = transportResults.reduce((sum, t) => sum + t.totalKgco2e, 0);
    results.push({
      type:          'transport_summary',
      totalKgco2e:   Math.round(totalTransportKgco2e * 1000) / 1000,
      legs:          transportResults,
      calcRuleVersion: CALC_RULE_VERSION,
    });
  }

  return results;
}

module.exports = {
  calculateItem,
  calculateTransport,
  calculateResponse,
  DATA_SOURCE_QUALITY,
  CALC_RULE_VERSION,
  DEVIATION_THRESHOLD,
};
