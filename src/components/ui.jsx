import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ST_LBL, INST_LBL, SETTLE_LBL, diffDays, today } from '../lib/format';

/* ---------- icons ---------- */
const P = {
  dash: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  inv: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 12h7M9 16h5" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.2 2.3 3.5 5" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19M6 15h4" /></>,
  bank: <path d="M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18" />,
  box: <><path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5l9 4.5 9-4.5M12 12v9" /></>,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  link: <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>,
  bell: <><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  building: <><path d="M4 21V5l8-3 8 3v16" /><path d="M9 21v-4h6v4M8 8h1M8 12h1M15 8h1M15 12h1" /></>,
  swap: <path d="M7 7h12l-3-3M17 17H5l3 3" />,
};
export function Icon({ name, size }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={size ? { width: size, height: size } : undefined}>{P[name]}</svg>;
}

export function LogoMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="var(--brand)" />
      <g fill="var(--on-brand)"><circle cx="14.5" cy="22" r="5" /><circle cx="21" cy="17.5" r="7" /><circle cx="27.5" cy="22" r="5" /><rect x="14.5" y="20" width="13" height="7" /></g>
      <path d="M6.5 32.5c7-4.5 16-5 27-12.5" fill="none" stroke="var(--thread)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="33.5" cy="20" r="2.4" fill="var(--thread)" />
    </svg>
  );
}

/* ---------- pills ---------- */
export const Pill = ({ kind, children }) => <span className={`pill ${kind || ''}`}>{children}</span>;
export const StatusPill = ({ s }) => <Pill kind={s}>{ST_LBL[s] ?? s}</Pill>;
export const InstPill = ({ s }) => <Pill kind={s}>{INST_LBL[s] ?? s}</Pill>;
export const SettlePill = ({ s }) => <Pill kind={s}>{SETTLE_LBL[s] ?? s}</Pill>;

export function When({ due }) {
  const d = diffDays(today(), due);
  if (d < 0) return <span className="when bad">{-d} day{d === -1 ? '' : 's'} overdue</span>;
  if (d === 0) return <span className="when soon">Due today</span>;
  return <span className={`when ${d <= 3 ? 'soon' : ''}`}>in {d} day{d === 1 ? '' : 's'}</span>;
}

export function Loading({ label = 'Loading' }) {
  return <div className="loading"><div className="spinner" />{label}…</div>;
}
export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return <div className="alert bad">{String(error.message || error)} {onRetry && <button className="link" onClick={onRetry}>Try again</button>}</div>;
}
export const Empty = ({ children }) => <div className="empty">{children}</div>;

/* ---------- toast ---------- */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const t = useRef();
  const toast = useCallback((m) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(null), 3200); }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------- modal ---------- */
export function Modal({ title, sub, onClose, children, footer, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={wide ? { maxWidth: 640 } : undefined}>
        <div className="mh">
          <div><h2 style={{ fontSize: 18 }}>{title}</h2>{sub && <p className="sub" style={{ fontSize: 13, marginTop: 2 }}>{sub}</p>}</div>
          <button className="x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="mb">{children}</div>
        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, id, children, span }) {
  return (
    <div className={`field ${span ? 'span2' : ''}`}>
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export async function copyText(text, toast) {
  try { await navigator.clipboard.writeText(text); toast('Link copied'); }
  catch { toast(text); }
}

/* instalments drawn as a thread with knots */
export function Thread({ items, currency, money }) {
  return (
    <div className="thread">
      {items.map((s, k) => (
        <div key={k} className={`knot ${s.status || 'open'}`}>
          <span className="dot" />
          <div><b>{s.label || 'Instalment'}</b><small>{s.sub}</small></div>
          <span className="num" style={{ fontWeight: 600 }}>{money(s.amount, currency)}</span>
        </div>
      ))}
    </div>
  );
}
