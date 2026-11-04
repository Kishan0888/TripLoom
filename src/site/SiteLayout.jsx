import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../lib/session';
import { SITE, waLink } from './site.config';
import './site.css';

/* ---------- brand ---------- */
// Two woven strands (orange and teal) crossing three times, echoing the three o's.
export function Mark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#0F2A33" />
      <path d="M6 14c5 0 7 12 14 12s9-12 14-12" fill="none" stroke="#F2994A" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M6 26c5 0 7-12 14-12s9 12 14 12" fill="none" stroke="#2A9D8F" strokeWidth="3.6" strokeLinecap="round" />
      <circle cx="20" cy="20" r="2.2" fill="#F6F3EC" />
    </svg>
  );
}
export function Logo({ to = '/' }) {
  return <Link to={to} className="mk-logo" aria-label="TripLooom home"><Mark /><span>TripL<span className="ooo">ooo</span>m</span></Link>;
}

// Faint woven threads used behind dark bands.
export function Threads() {
  const rows = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg className="threads" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true">
      {rows.map((i) => <path key={`o${i}`} d={`M0 ${40 + i * 70} C 300 ${i * 70 - 10}, 600 ${110 + i * 70}, 1200 ${30 + i * 70}`} stroke="#F2994A" strokeWidth="1.4" fill="none" />)}
      {rows.map((i) => <path key={`t${i}`} d={`M0 ${70 + i * 70} C 350 ${130 + i * 70}, 700 ${i * 70}, 1200 ${80 + i * 70}`} stroke="#2A9D8F" strokeWidth="1.4" fill="none" />)}
    </svg>
  );
}

/* ---------- icons ---------- */
const PATHS = {
  inbox: <><path d="M3 13h5l2 3h4l2-3h5" /><path d="M5 5h14l2 8v6H3v-6z" /></>,
  route: <><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  doc: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></>,
  rates: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16" /></>,
  bell: <><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M16 13h2M3 10h18M6 6V4h12v2" /></>,
  mega: <><path d="M3 11v2l11 5V6z" /><path d="M14 8a4 4 0 0 1 0 8M6 14l1 5h3l-1-4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  link: <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>,
  bank: <path d="M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18" />,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  team: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.2 2.3 3.5 5" /></>,
  print: <><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2" /><rect x="6" y="14" width="12" height="7" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  map: <><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>,
};
export function I({ n, size }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={size ? { width: size, height: size } : undefined} aria-hidden="true">{PATHS[n]}</svg>;
}
export const Spark = () => <span className="spark" title="AI feature"><I n="sparkle" /></span>;

export function useMeta(title, description) {
  useEffect(() => {
    document.title = title;
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
    m.content = description;
    return () => { document.title = 'TripLooom'; };
  }, [title, description]);
}

const WA = <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z" /></svg>;

/* ---------- layout ---------- */
const NAV = [['/product', 'Product'], ['/payments', 'Payments'], ['/pricing', 'Pricing'], ['/contact', 'About & Contact']];
const DARK_TOP = ['/', '/payments'];

export default function SiteLayout() {
  const { pathname, hash } = useLocation();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    setOpen(false);
    if (hash) { const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); return () => clearTimeout(t); }
    window.scrollTo(0, 0); return undefined;
  }, [pathname, hash]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const dark = DARK_TOP.includes(pathname) && !scrolled && !open;
  const wa = waLink();
  const login = user ? <Link to="/app" className="mk-login">Open app</Link> : <Link to="/login" className="mk-login">Log in</Link>;

  return (
    <div className="mk">
      <header className={`mk-head ${dark ? 'dark' : ''} ${scrolled ? 'scrolled' : ''}`}>
        <div className="wrap">
          <Logo />
          <nav className="mk-nav" aria-label="Main">{NAV.map(([to, l]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'on' : '')}>{l}</NavLink>)}</nav>
          <div className="mk-actions" style={{ marginLeft: 'auto' }}>
            {login}
            <Link to="/contact" className="b o sm">Book a demo</Link>
            <button className="mk-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}><I n={open ? 'x' : 'menu'} /></button>
          </div>
        </div>
      </header>
      <div className="mk-menu" hidden={!open}>
        {NAV.map(([to, l]) => <Link key={to} to={to} className="lnk">{l}</Link>)}
        <Link to={user ? '/app' : '/login'} className="lnk">{user ? 'Open app' : 'Log in'}</Link>
        <Link to="/contact" className="b o">Book a demo</Link>
      </div>
      <main><Outlet /></main>
      <footer className="mk-foot">
        <div className="wrap">
          <div className="cols">
            <div>
              <Logo />
              <p style={{ fontSize: 15, maxWidth: '30ch', marginBottom: 14 }}>{SITE.tagline}</p>
              <Link to="/login" style={{ fontWeight: 600, color: 'var(--orange)' }}>Log in →</Link>
            </div>
            <div><h4>Product</h4><ul>
              <li><Link to="/product">Features</Link></li><li><Link to="/payments">TripLooom Payments</Link></li><li><Link to="/pricing">Pricing</Link></li>
              <li><Link to="/contact">Book a demo</Link></li><li><Link to="/contact?intent=trial">Start free trial</Link></li></ul></div>
            <div><h4>Company</h4><ul>
              <li><Link to="/contact">About</Link></li><li><Link to="/contact#form">Contact</Link></li><li><Link to="/privacy">Privacy</Link></li>
              <li><Link to="/terms">Terms</Link></li><li><Link to="/refunds">Refund policy</Link></li></ul></div>
            <div><h4>Contact</h4><ul>
              {SITE.salesEmail && <li><a href={`mailto:${SITE.salesEmail}`}>{SITE.salesEmail}</a></li>}
              {SITE.phoneDisplay && <li>{SITE.phoneDisplay}{wa && <> · <a href={wa} target="_blank" rel="noreferrer">WhatsApp</a></>}</li>}
              {SITE.address && <li>{SITE.address}</li>}
              <li><Link to="/contact#form">Send us a message</Link></li>
              {(SITE.linkedin || SITE.instagram) && <li style={{ display: 'flex', gap: 14 }}>
                {SITE.linkedin && <a href={SITE.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}
                {SITE.instagram && <a href={SITE.instagram} target="_blank" rel="noreferrer">Instagram</a>}</li>}
            </ul></div>
          </div>
          <div className="bottom"><span>© {new Date().getFullYear() < 2027 ? 2027 : new Date().getFullYear()} {SITE.legalName || 'TripLooom'}. Made in India.</span><span>Data stored in India (Mumbai region)</span></div>
        </div>
      </footer>
      {wa && <a className="mk-wa" href={wa} target="_blank" rel="noreferrer" aria-label="Chat with us on WhatsApp">{WA}</a>}
    </div>
  );
}
