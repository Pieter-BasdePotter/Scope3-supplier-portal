/**
 * Seed script — populates the database with:
 *   - Emission factors (NL / EU, v1.0)
 *   - 2 sample supplier requests (for local testing)
 *
 * Run: node prisma/seed.js   (after prisma migrate dev)
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// ─── Emission Factors ───────────────────────────────────────────────────────

const emissionFactors = [
  { type: 'electricity',     unit: 'kWh',  factorKgco2e: 0.649,  region: 'NL',     year: 2023, version: 'v1.0', source: 'CBS / RVO 2023' },
  { type: 'natural_gas',     unit: 'm3',   factorKgco2e: 1.884,  region: 'NL',     year: 2023, version: 'v1.0', source: 'IPCC / RVO 2023' },
  { type: 'solid_fuel_coal', unit: 'kg',   factorKgco2e: 2.500,  region: '',       year: 2023, version: 'v1.0', source: 'IPCC AR6' },
  { type: 'transport_road',  unit: 'tkm',  factorKgco2e: 0.096,  region: 'EU',     year: 2023, version: 'v1.0', source: 'EEA 2023' },
  { type: 'transport_rail',  unit: 'tkm',  factorKgco2e: 0.028,  region: 'EU',     year: 2023, version: 'v1.0', source: 'EEA 2023' },
  { type: 'transport_sea',   unit: 'tkm',  factorKgco2e: 0.016,  region: '',       year: 2023, version: 'v1.0', source: 'IMO / EEA 2023' },
  { type: 'transport_air',   unit: 'tkm',  factorKgco2e: 0.602,  region: '',       year: 2023, version: 'v1.0', source: 'ICAO 2023' },
  { type: 'water',           unit: 'm3',   factorKgco2e: 0.344,  region: 'NL',     year: 2023, version: 'v1.0', source: 'Waternet / BEES 2023' },
  { type: 'heat_steam',      unit: 'kWh',  factorKgco2e: 0.067,  region: 'NL',     year: 2023, version: 'v1.0', source: 'CBS 2023' },
];

// ─── Sample Supplier Requests ───────────────────────────────────────────────

function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

function expiresAt(hoursFromNow = 72) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}

const sampleRequests = [
  {
    supplierName:    'Acme Packaging BV',
    supplierEmail:   'contact@acme-packaging.example',
    referenceYear:   2023,
    categoryContext: 'Cardboard packaging materials for product delivery',
    token:           makeToken(),
    tokenExpiresAt:  expiresAt(72),
    status:          'INVITED',
  },
  {
    supplierName:    'GreenFreight NL',
    supplierEmail:   'data@greenfreight.example',
    referenceYear:   2023,
    categoryContext: 'Road and rail freight transport services',
    token:           makeToken(),
    tokenExpiresAt:  expiresAt(72),
    status:          'INVITED',
  },
];

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding emission factors…');
  for (const factor of emissionFactors) {
    await prisma.emissionFactor.upsert({
      where: { type_region_year_version: { type: factor.type, region: factor.region ?? '', year: factor.year ?? 0, version: factor.version } },
      update: { factorKgco2e: factor.factorKgco2e, source: factor.source },
      create: { ...factor, region: factor.region ?? '' },
    });
  }
  console.log(`   ✓ ${emissionFactors.length} emission factors seeded`);

  console.log('🌱  Seeding sample supplier requests…');
  for (const req of sampleRequests) {
    const existing = await prisma.supplierRequest.findFirst({
      where: { supplierEmail: req.supplierEmail, referenceYear: req.referenceYear },
    });
    if (!existing) {
      const created = await prisma.supplierRequest.create({ data: req });
      console.log(`   ✓ Created request for ${req.supplierName}`);
      console.log(`     Invitation link: http://localhost:5173/supplier/${created.token}`);
    } else {
      console.log(`   – Skipped ${req.supplierName} (already exists)`);
    }
  }

  console.log('\n✅  Seed complete');
  console.log('\nMock customer login:');
  console.log('  Email:    admin@massure.test');
  console.log('  Password: admin123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
