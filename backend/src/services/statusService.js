const prisma = require('../config/database');
const logger = require('../utils/logger');

// ─── Valid status transitions ────────────────────────────────────────────────

const TRANSITIONS = {
  INVITED:    ['STARTED'],
  STARTED:    ['SUBMITTED'],
  SUBMITTED:  ['VALIDATED'],
  VALIDATED:  ['ACCEPTED', 'REJECTED'],
  ACCEPTED:   ['PUBLISHED'],
  REJECTED:   ['STARTED'],
  PUBLISHED:  [],
};

/**
 * Atomically transition a supplier request to a new status.
 * Uses compare-and-swap to prevent TOCTOU race conditions.
 */
async function transitionStatus(requestId, newStatus, changedBy = 'system', note = null) {
  const request = await prisma.supplierRequest.findUniqueOrThrow({ where: { id: requestId } });
  const allowed = TRANSITIONS[request.status] ?? [];

  if (!allowed.includes(newStatus)) {
    const err = new Error(`Cannot transition from ${request.status} to ${newStatus}.`);
    err.status = 409;
    err.code = 'INVALID_TRANSITION';
    throw err;
  }

  // Atomic compare-and-swap: only update if status hasn't changed since we read it
  const [updateResult, historyEntry] = await prisma.$transaction([
    prisma.supplierRequest.updateMany({
      where: { id: requestId, status: request.status },   // CAS condition
      data:  { status: newStatus, updatedAt: new Date() },
    }),
    prisma.statusHistory.create({
      data: { requestId, oldStatus: request.status, newStatus, changedBy, note },
    }),
  ]);

  if (updateResult.count === 0) {
    const err = new Error('Request status was modified concurrently. Please retry.');
    err.status = 409;
    err.code = 'CONCURRENT_MODIFICATION';
    throw err;
  }

  logger.info('Status transition', { requestId, from: request.status, to: newStatus, by: changedBy });

  // Return object matching the shape of a SupplierRequest with updated status
  return { ...request, status: newStatus };
}

module.exports = { TRANSITIONS, transitionStatus };
