import React from 'react';
import clsx from 'clsx';

const STATUS_STYLES = {
  INVITED:   'bg-blue-100 text-blue-700',
  STARTED:   'bg-yellow-100 text-yellow-700',
  SUBMITTED: 'bg-purple-100 text-purple-700',
  VALIDATED: 'bg-teal-100 text-teal-700',
  ACCEPTED:  'bg-massure-mint text-massure-green',
  REJECTED:  'bg-red-100 text-red-700',
  PUBLISHED: 'bg-massure-green text-white',
};

const STATUS_LABELS = {
  INVITED:   'Invited',
  STARTED:   'Started',
  SUBMITTED: 'Submitted',
  VALIDATED: 'Validated',
  ACCEPTED:  'Accepted',
  REJECTED:  'Rejected',
  PUBLISHED: 'Published',
};

export function StatusBadge({ status }) {
  return (
    <span className={clsx('badge', STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600')}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function QualityBadge({ label }) {
  const styles = { A: 'bg-green-100 text-green-700', B: 'bg-blue-100 text-blue-700',
                   C: 'bg-yellow-100 text-yellow-700', D: 'bg-gray-100 text-gray-600' };
  const labels = { A: 'A – Measured', B: 'B – Calculated', C: 'C – Estimated', D: 'D – Database' };
  return (
    <span className={clsx('badge', styles[label] ?? 'bg-gray-100 text-gray-600')}>
      {labels[label] ?? label}
    </span>
  );
}
