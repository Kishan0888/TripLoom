import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase, callFunction } from '../lib/supabase';
import { SITE } from './site.config';

const TYPES = ['Domestic', 'Inbound / DMC', 'Outbound', 'Mixed'];
const SIZES = ['1–2', '3–10', '11–25', '26–50', '50+'];

// Saves a website request, then asks the server to email it to sales (sales@travocloud.com). Returns an error message or null.
async function submitRequest(row) {
  const id = crypto.randomUUID();
  const { error } = await supabase.from('demo_requests').insert({ id, ...row });
  if (error) return 'Something went wrong sending your request. Please try again in a moment.';
  try { await callFunction('mailer', { action: 'notify_lead', id }); } catch { /* the request is saved; email delivery is best-effort */ }
  return null;
}

/* Demo / trial form. `compact` is the short version used in the popup. */
export function DemoForm({ intent = 'demo', plan = null, compact = false, onDone }) {
  const [f, setF] = useState({ full_name: '', company: '', email: '', phone: '+91 ', city: '', business_type: '', team_size: '', current_software: '', preferred_time: '', message: '', consent: false, website: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const s = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const p = compact ? 'pd' : 'd';

  async function submit(e) {
    e.preventDefault();
    if (f.website) { setDone(f.full_name); return; } // honeypot: bots fill hidden fields
    const er = [];
    if (f.full_name.trim().length < 2) er.push('your name');
    if (f.company.trim().length < 2) er.push('company name');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.push('a valid work email');
    if (f.phone.replace(/\D/g, '').length < 10) er.push('mobile / WhatsApp number');
    if (!compact && f.city.trim().length < 2) er.push('city');
    if (!f.business_type) er.push('business type');
    if (!f.team_size) er.push('team size');
    if (er.length) { setErr(`Please add ${er.join(', ')}.`); return; }
    if (!f.consent) { setErr('Please tick the box so we can contact you.'); return; }
    setBusy(true); setErr(null);
    const problem = await submitRequest({
      full_name: f.full_name.trim(), company: f.company.trim(), email: f.email.trim(), phone: f.phone.trim(), city: f.city.trim() || null,
      business_type: f.business_type, team_size: f.team_size, current_software: f.current_software.trim() || null,
      preferred_time: f.preferred_time ? new Date(`${f.preferred_time}:00+05:30`).toISOString() : null,
      message: f.message.trim() || null, plan, intent, consent: true,
    });
    setBusy(false);
    if (problem) { setErr(problem); return; }
    const first = f.full_name.trim().split(' ')[0];
    setDone(first); onDone?.(first);
  }

  if (done !== null) {
    return (
      <div className="okbox"><h3 style={{ fontSize: 22, marginBottom: 8 }}>Thanks, {done}.</h3>
        Your request has reached our sales team. We’ll call or WhatsApp you within one working hour to fix a time.</div>
    );
  }
  return (
    <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="fg">
        <div className="f"><label htmlFor={`${p}-name`}>Full name</label><input id={`${p}-name`} autoComplete="name" value={f.full_name} onChange={s('full_name')} /></div>
        <div className="f"><label htmlFor={`${p}-co`}>Company name</label><input id={`${p}-co`} autoComplete="organization" value={f.company} onChange={s('company')} /></div>
        <div className="f"><label htmlFor={`${p}-email`}>Work email</label><input id={`${p}-email`} type="email" autoComplete="email" value={f.email} onChange={s('email')} /></div>
        <div className="f"><label htmlFor={`${p}-phone`}>Mobile / WhatsApp</label><input id={`${p}-phone`} type="tel" autoComplete="tel" value={f.phone} onChange={s('phone')} /></div>
        {!compact && <div className="f"><label htmlFor={`${p}-city`}>City</label><input id={`${p}-city`} autoComplete="address-level2" value={f.city} onChange={s('city')} /></div>}
        <div className="f"><label htmlFor={`${p}-type`}>Business type</label><select id={`${p}-type`} value={f.business_type} onChange={s('business_type')}><option value="">Choose</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="f"><label htmlFor={`${p}-size`}>Team size</label><select id={`${p}-size`} value={f.team_size} onChange={s('team_size')}><option value="">Choose</option>{SIZES.map((t) => <option key={t}>{t}</option>)}</select></div>
        {!compact && <div className="f"><label htmlFor={`${p}-time`}>Preferred demo time (IST)</label><input id={`${p}-time`} type="datetime-local" value={f.preferred_time} onChange={s('preferred_time')} /></div>}
        {!compact && <div className="f full"><label htmlFor={`${p}-sw`}>Software you use today (optional)</label><input id={`${p}-sw`} value={f.current_software} onChange={s('current_software')} placeholder="e.g. Excel, Tally, another travel CRM" /></div>}
        {compact && <div className="f full"><label htmlFor={`${p}-msg`}>What would you like to see? (optional)</label><input id={`${p}-msg`} value={f.message} onChange={s('message')} placeholder="e.g. multi-currency invoices, WhatsApp enquiries" /></div>}
        <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true"><label htmlFor={`${p}-web`}>Website</label><input id={`${p}-web`} tabIndex={-1} autoComplete="off" value={f.website} onChange={s('website')} /></div>
      </div>
      <label className="check"><input type="checkbox" id={`${p}-consent`} checked={f.consent} onChange={s('consent')} />You can contact me on WhatsApp and email about TravoCloud.</label>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="b o" type="submit" disabled={busy}>{busy ? 'Sending…' : intent === 'trial' ? 'Request my trial' : 'Book my demo'}</button>
      <p className="muted" style={{ fontSize: 13 }}>By submitting you agree to our <Link to="/privacy">Privacy Policy</Link>.</p>
    </form>
  );
}

/* ---------- popup ---------- */
const DemoCtx = createContext(() => {});
export const useDemo = () => useContext(DemoCtx);

export function DemoProvider({ children }) {
  const [state, setState] = useState(null); // { plan, intent }
  const open = useCallback((opts = {}) => setState({ plan: opts.plan ?? null, intent: opts.intent ?? (opts.plan ? 'pricing' : 'demo') }), []);
  const close = useCallback(() => setState(null), []);
  useEffect(() => {
    if (!state) return undefined;
    const k = (e) => e.key === 'Escape' && close();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [state, close]);
  return (
    <DemoCtx.Provider value={open}>
      {children}
      {state && (
        <div className="mk-pop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="mk-pop-card" role="dialog" aria-modal="true" aria-labelledby="pop-title">
            <button className="mk-pop-x" onClick={close} aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18, paddingRight: 36 }}>
              {state.plan && <span className="eyebrow">{state.plan} plan</span>}
              <h2 id="pop-title" style={{ fontSize: 26 }}>Book a demo</h2>
              <p style={{ color: 'var(--ink-soft)' }}>A 30-minute walkthrough with your own rates. We’ll recommend the right plan and share a quote for your team.</p>
            </div>
            <DemoForm compact intent={state.intent} plan={state.plan} />
            {SITE.salesEmail && <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Prefer email? Write to <a href={`mailto:${SITE.salesEmail}`}>{SITE.salesEmail}</a>.</p>}
          </div>
        </div>
      )}
    </DemoCtx.Provider>
  );
}
