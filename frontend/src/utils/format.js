// Lightweight formatting helpers
export const format = {
  date: (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  datetime: (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('nl-NL');
  },
  co2e: (val) => {
    if (val == null) return '—';
    return `${Number(val).toLocaleString('nl-NL', { maximumFractionDigits: 3 })} kgCO₂e`;
  },
};
