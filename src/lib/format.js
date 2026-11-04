export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'AED', 'SGD', 'CAD'];
const SYM = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AUD: 'A$', AED: 'AED ', SGD: 'S$', CAD: 'C$' };

export function money(v, cur) {
  const loc = cur === 'INR' ? 'en-IN' : 'en-US';
  return (SYM[cur] ?? `${cur} `) + (Number(v) || 0).toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export const inr0 = (v) => '₹' + Math.round(Number(v) || 0).toLocaleString('en-IN');
export const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

// Dates are handled as YYYY-MM-DD strings in India time.
export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}
export function addDays(s, n) {
  const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const diffDays = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5);
export function fd(s) {
  if (!s) return '—';
  return new Date(String(s).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function fds(s) {
  if (!s) return '—';
  return new Date(String(s).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
export const istDate = (ts) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(ts));
export const istTime = (ts) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
export const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export const ST_LBL = { draft: 'Draft', sent: 'Awaiting payment', partial: 'Partially paid', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled' };
export const INST_LBL = { paid: 'Paid', part: 'Part paid', overdue: 'Overdue', open: 'Upcoming' };
export const SETTLE_LBL = { credited: 'Bank credited', awaiting: 'Awaiting credit', late: 'Credit late' };
export const ROLE_LBL = { owner: 'Owner', accounts: 'Accounts', sales: 'Sales' };

export const payLink = (token) => `${window.location.origin}/p/${token}`;
