const TZ = 'Asia/Dhaka';

export const isValidStudentId = (s) => /^\d{17}$/.test(s || '');

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function mmss(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function fmt(iso, options) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB', { timeZone: TZ, ...options });
}

export const hhmm = (iso) => fmt(iso, { hour: '2-digit', minute: '2-digit' });
export const day = (iso) => fmt(iso, { day: 'numeric', month: 'short' });
export const fullDay = (iso) => fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' });
export const dayTime = (iso) => `${day(iso)}, ${hhmm(iso)}`;

export const grouped = (s) => String(s).replace(/(\d{4})(\d{4})(\d{4})(\d{5})/, '$1 $2 $3 $4');

// A HELD hold past its time is shown as EXPIRED at once, before the next refresh.
export function effectiveStatus(hold, now) {
  return hold.status === 'HELD' && Date.parse(hold.expiresAt) <= now ? 'EXPIRED' : hold.status;
}

export function countdown(hold, now) {
  const end = Date.parse(hold.expiresAt);
  const start = Date.parse(hold.createdAt || hold.expiresAt);
  const left = end - now;
  const span = end - start;
  return {
    left,
    pct: span > 0 ? Math.max(0, Math.min(100, (left / span) * 100)) : 0,
    urgent: left > 0 && left < 60_000,
  };
}
