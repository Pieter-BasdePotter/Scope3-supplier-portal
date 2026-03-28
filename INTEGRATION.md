# Massure Integration Guide

This document describes what needs to change when moving the Scope 3 Supplier Portal prototype into the Massure production platform.

---

## What to keep as-is (minimal changes)

| Component | Notes |
|---|---|
| `calculationService.js` | Versioned, server-side, stateless — drop directly into Massure services |
| `validationService.js` | Zod schemas — reuse unchanged or extend |
| `statusService.js` | State machine logic — reuse as-is |
| `unitConversion.js` | Pure utility functions — drop in |
| Prisma schema models | Migrate into Massure's database schema |
| API route structure | Map `/api/requests`, `/api/supplier/:token`, `/api/published` into Massure routing |
| Frontend form components | SupplierFormStepA/B/C — reusable React components |

---

## What to replace in Massure

### 1. Authentication

**Prototype:** Mock JWT with seeded `admin@massure.test / admin123`, stored in `backend/src/config/env.js`.

**Replace with:** Massure's existing customer/user authentication (session, OAuth, or Massure-native JWT). Remove `backend/src/routes/auth.js` and `backend/src/middleware/customerAuth.js`. Replace `customerAuth` middleware calls in `customer.js` routes with Massure's auth middleware.

**Frontend:** Remove `src/hooks/useAuth.jsx` and replace with Massure's auth context/hook. Remove `LoginPage.jsx`.

---

### 2. Email delivery

**Prototype:** Invitation link is logged to the backend console and returned in the API response for display in the UI. No external mail service.

**Replace with:** Massure's notification or email service. In `backend/src/routes/customer.js`, the `POST /api/requests` handler returns `inviteLink`. Wire this to your email service call instead:

```js
// Prototype: console log + return in response
console.log(`[INVITE LINK] ${inviteLink}`);

// Massure: call notification service
await notificationService.sendSupplierInvite({
  to: supplierEmail,
  link: inviteLink,
  customerName: req.user.companyName,
});
```

---

### 3. File storage

**Prototype:** Multer disk storage to `backend/uploads/` (local filesystem).

**Replace with:** Massure's cloud storage (S3, Azure Blob, or similar). Update `backend/src/middleware/upload.js`:

- Change multer storage from `diskStorage` to `memoryStorage`
- After upload, stream buffer to cloud storage
- Store the returned cloud URL in `Attachment.filename` instead of the local path

---

### 4. Emission factor library

**Prototype:** 8 hardcoded factors seeded in `prisma/seed.js`.

**Replace with:** Massure's production emission factor database or approved factor library. The lookup in `calculationService.js` uses:

```js
prisma.emissionFactor.findFirst({ where: { type, version: 'v1.0' } })
```

Map this to Massure's factor API or extend the `EmissionFactor` table with more factors, regions, and years. The `calcRuleVersion` field allows pinning each calculation to a specific factor set for auditability.

---

### 5. Database

**Prototype:** Standalone MySQL database `scope3_portal`, isolated from Massure.

**Replace with:** Add the Prisma schema models to Massure's existing database. Run a coordinated migration. Suggested approach:

1. Export Prisma schema models as raw SQL from `prisma migrate dev --create-only`
2. Review and apply to Massure's database alongside existing tables
3. Add `customerId` foreign key to `SupplierRequest` to link to Massure's customer/tenant model

---

### 6. Frontend routing and layout

**Prototype:** Standalone React app with its own `TopNav`, `PageLayout`, and routing at `/`.

**Replace with:** Embed the supplier portal pages into Massure's existing frontend:
- Import `DashboardPage`, `NewRequestPage`, `RequestDetailPage` as child routes in Massure's router
- Replace `TopNav` + `PageLayout` with Massure's layout components
- The supplier portal route (`/supplier/:token`) may remain a standalone public route or be embedded
- Form components (SupplierFormStepA/B/C) are self-contained and require only React Hook Form + Zod

---

### 7. Multi-tenancy

**Prototype:** Single mock customer; no tenant isolation.

**Replace with:** Add `customerId` (Massure tenant ID) to:
- `SupplierRequest` — scope all queries by `customerId`
- `EmissionFactor` — allow per-customer factor overrides
- `StatusHistory` — set `changedBy` to actual Massure user ID

---

## Integration checklist

- [ ] Replace JWT mock auth with Massure auth middleware
- [ ] Wire invitation link to Massure email service
- [ ] Move file uploads to cloud storage (update middleware/upload.js)
- [ ] Migrate Prisma schema into Massure's database with `customerId` FK
- [ ] Replace seeded emission factors with production factor library
- [ ] Add `customerId` scoping to all `SupplierRequest` queries
- [ ] Embed frontend pages into Massure's router and layout
- [ ] Remove standalone `LoginPage` and `useAuth` hook
- [ ] Set `calcRuleVersion` to match Massure's versioning scheme
- [ ] Review `TOKEN_EXPIRY_HOURS` and configure per Massure's policy
- [ ] Add Massure-side user notification when supplier submits

---

## Calculation engine versioning

Each `EmissionCalculation` record stores `calcRuleVersion` (currently `"v1.0"`). When Massure updates emission factors or calculation methodology, increment this version string. Existing published calculations retain their original version for auditability.

---

## Security notes for production

- Rotate `JWT_SECRET` to a cryptographically strong value
- Enforce HTTPS for all supplier token links
- Set `TOKEN_EXPIRY_HOURS` to an appropriate value (72h is prototype default)
- Review multer file size limit (currently 10MB) against Massure's storage policy
- Add rate limiting to supplier submit endpoint to prevent abuse
- Validate CORS `FRONTEND_URL` env var matches Massure's domain
