# Scope 3 Supplier Portal — Standalone Prototype

A localhost-runnable MVP for validating the **Supplier Scope 3 data collection flow** before any integration into Massure.

---

## What this prototype does

| Role | Capability |
|---|---|
| **Customer** | Create supplier requests, review/accept/reject/publish submissions |
| **Supplier** | Open a tokenised link, fill a 3-step data form, submit for review |
| **Published** | Calculated emission intensities visible on the dashboard |

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| MySQL | ≥ 8.0 running locally |
| npm | ≥ 9 |

---

## Quick start

### 1 — Create the MySQL database

```sql
CREATE DATABASE scope3_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2 — Backend setup

```bash
cd backend

# Copy environment config
cp .env.example .env
# Edit .env and set DATABASE_URL to your MySQL connection string
# e.g. DATABASE_URL="mysql://root:yourpassword@localhost:3306/scope3_portal"

# Install dependencies
npm install

# Run Prisma migrations (creates all tables)
npx prisma migrate dev --name init

# Seed the database (emission factors + sample requests)
node prisma/seed.js

# Start the backend (port 3001)
npm run dev
```

### 3 — Frontend setup

```bash
cd frontend

# Copy environment config
cp .env.example .env
# VITE_API_URL defaults to http://localhost:3001/api — leave as-is for local dev

# Install dependencies
npm install

# Start the frontend (port 5173)
npm run dev
```

### 4 — Open the app

| URL | What it is |
|---|---|
| http://localhost:5173 | Customer dashboard |
| http://localhost:5173/supplier/:token | Supplier form (use link from dashboard) |

---

## Customer login (mock)

```
Email:    admin@massure.test
Password: admin123
```

---

## End-to-end test flow

1. Log in to http://localhost:5173 with the credentials above
2. Click **+ New Request** and create a supplier request (fill supplier name, email, year, context)
3. Copy the **invitation link** shown after creation (also logged in backend console)
4. Open the invitation link in a new browser tab — this opens the supplier form
5. Complete **Step A** (basic supplier info) → **Step B** (add product rows with activity data) → **Step C** (optional transport)
6. Submit the form
7. Return to the customer dashboard, click **Review →** on the request
8. Actions available: **Validate** → **Accept** → **Publish** (or **Reject** with a note)
9. Published results appear in the **Published Results** table on the dashboard

---

## Backend tests

```bash
cd backend
npm test
```

Test coverage:
- `token.test.js` — token generation, expiry, validation
- `validation.test.js` — Zod schema validation with edge cases
- `calculation.test.js` — CO₂e calculation engine correctness
- `status.test.js` — state machine transitions (valid + invalid)
- `unitConversion.test.js` — unit normalisation helpers

---

## Environment configuration

### `backend/.env`

```env
DATABASE_URL="mysql://root:yourpassword@localhost:3306/scope3_portal"
JWT_SECRET="change-me-in-production"
PORT=3001
TOKEN_EXPIRY_HOURS=72
FRONTEND_URL="http://localhost:5173"
MOCK_CUSTOMER_EMAIL="admin@massure.test"
MOCK_CUSTOMER_PASSWORD="admin123"
NODE_ENV="development"
```

### `frontend/.env`

```env
VITE_API_URL="http://localhost:3001/api"
```

---

## Emission factors (seeded)

| Type | Factor | Unit | Region |
|---|---|---|---|
| Electricity | 0.649 kgCO₂e/kWh | kWh | NL |
| Natural gas | 1.884 kgCO₂e/m³ | m³ | NL |
| Transport road | 0.096 kgCO₂e/tkm | tkm | EU |
| Transport rail | 0.028 kgCO₂e/tkm | tkm | EU |
| Transport sea | 0.016 kgCO₂e/tkm | tkm | global |
| Transport air | 0.602 kgCO₂e/tkm | tkm | global |
| Water | 0.344 kgCO₂e/m³ | m³ | NL |
| Heat/steam | 0.067 kgCO₂e/kWh | kWh | NL |

---

## Status machine

```
INVITED ──→ STARTED (supplier opens link)
STARTED ──→ SUBMITTED (supplier submits)
SUBMITTED ──→ VALIDATED (customer validates)
VALIDATED ──→ ACCEPTED (customer accepts)
VALIDATED ──→ REJECTED (customer rejects + note)
ACCEPTED ──→ PUBLISHED (customer publishes)
REJECTED ──→ STARTED (supplier opens link to resubmit)
```

---

## Project structure

```
scope3-supplier-portal/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # All 8 database models
│   │   ├── migrations/      # Auto-generated migration SQL
│   │   └── seed.js          # Emission factors + sample data
│   ├── src/
│   │   ├── config/          # env, Prisma client
│   │   ├── middleware/       # auth, error handling, uploads
│   │   ├── routes/          # customer, supplier, auth, public
│   │   ├── services/        # token, validation, calculation, status
│   │   └── utils/           # unit conversion, logger
│   └── tests/               # Jest test suites
└── frontend/
    └── src/
        ├── components/
        │   ├── forms/        # SupplierFormStepA/B/C
        │   ├── layout/       # TopNav, PageLayout
        │   └── ui/           # Badge, FormField
        ├── hooks/            # useAuth
        ├── pages/            # Dashboard, NewRequest, Detail, SupplierPortal
        ├── services/         # api.js (axios)
        └── utils/            # format.js
```

---

## What is intentionally simplified (prototype scope)

| Production concern | Prototype approach |
|---|---|
| Multi-tenant / customer accounts | Single seeded mock customer |
| Real email delivery | Console log + UI link display |
| Cloud file storage | Local disk (`backend/uploads/`) |
| Real emission factor database | Small seeded factor table |
| RBAC / permissions | Single customer role, supplier token |
| Production secrets management | `.env` file |
| Audit logging | `StatusHistory` table only |

---

## See also

- `INTEGRATION.md` — guide for moving this prototype into Massure
# Scope3-supplier-portal
