import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { I, useMeta } from '../SiteLayout';
import { SITE, waLink } from '../site.config';

const TYPES = ['Domestic', 'Inbound / DMC', 'Outbound', 'Mixed'];
const SIZES = ['1–2', '3–10', '11–25', '26–50', '50+'];

export default function Contact() {
  useMeta('Book a Demo | TravoCloud', 'Talk to our team and see TravoCloud with your own rates. We reply on WhatsApp within one working hour.');
  const [sp] = useSearchParams();
  const intent = ['trial', 'payments'].includes(sp.get('intent')) ? sp.get('intent') : 'demo';
  const [f, setF] = useState({ full_name: '', company: '', email: '', phone: '+91 ', city: '', business_type: '', team_size: '', current_software: '', preferred_time: '', consent: false, website: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const s = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const wa = waLink();

  async function submit(e) {
    e.preventDefault();
    if (f.website) { setDone(f.full_name); return; } // honeypot: bots fill hidden fields
    const er = [];
    if (f.full_name.trim().length < 2) er.push('your name');
    if (f.company.trim().length < 2) er.push('company name');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.push('a valid work email');
    if (f.phone.replace(/\D/g, '').length < 10) er.push('mobile / WhatsApp number');
    if (f.city.trim().length < 2) er.push('city');
    if (!f.business_type) er.push('business type');
    if (!f.team_size) er.push('team size');
    if (er.length) { setErr(`Please add ${er.join(', ')}.`); return; }
    if (!f.consent) { setErr('Please tick the box so we can contact you.'); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.from('demo_requests').insert({
      full_name: f.full_name.trim(), company: f.company.trim(), email: f.email.trim(), phone: f.phone.trim(), city: f.city.trim(),
      business_type: f.business_type, team_size: f.team_size, current_software: f.current_software.trim() || null,
      preferred_time: f.preferred_time ? new Date(`${f.preferred_time}:00+05:30`).toISOString() : null, intent, consent: true,
    });
    setBusy(false);
    if (error) { setErr('Something went wrong sending your request. Please try again in a moment.'); return; }
    setDone(f.full_name.trim().split(' ')[0]);
  }

  return (
    <>
      <section className="band">
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 48, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <span className="eyebrow">About TravoCloud</span>
            <h1 style={{ fontSize: 'clamp(32px,4.4vw,52px)', lineHeight: 1.07, fontWeight: 700 }}>Built with tour operators, for tour operators.</h1>
            <p className="lead" style={{ color: 'var(--ink-soft)' }}>We spoke to operators across India who were running million-rupee groups on WhatsApp threads and Excel sheets. TravoCloud started from their lists of what goes wrong (missed enquiries, slow quotes, unconfirmed suppliers, unpaid balances) and fixes them in one workspace. We’re an Indian team, and we answer on WhatsApp.</p>
            <div className="grid3" style={{ gap: 12 }}>
              {[['user', 'Operator-first'], ['wallet', 'Honest pricing'], ['shield', 'Your data stays yours']].map(([ic, t]) => (
                <div className="card" key={t} style={{ padding: 16, gap: 8 }}><span className="ico t" style={{ width: 38, height: 38 }}><I n={ic} /></span><b>{t}</b></div>))}
            </div>
            <div className="card" style={{ gap: 12 }}>
              <h3>Contact</h3>
              {SITE.salesEmail && <div style={{ display: 'flex', gap: 10 }}><b style={{ width: 90 }}>Sales</b><a href={`mailto:${SITE.salesEmail}`}>{SITE.salesEmail}</a></div>}
              {SITE.supportEmail && <div style={{ display: 'flex', gap: 10 }}><b style={{ width: 90 }}>Support</b><a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a></div>}
              {SITE.phoneDisplay && <div style={{ display: 'flex', gap: 10 }}><b style={{ width: 90 }}>WhatsApp</b><span>{SITE.phoneDisplay} · Mon–Sat, 10:00–19:00 IST</span></div>}
              {SITE.address && <div style={{ display: 'flex', gap: 10 }}><b style={{ width: 90 }}>Office</b><span>{SITE.address}</span></div>}
              <p style={{ color: 'var(--ink-soft)' }}>Existing customer? <Link to="/login" style={{ fontWeight: 600, color: 'var(--orange-d)' }}>Log in</Link></p>
              {wa && <a className="b teal sm" style={{ alignSelf: 'flex-start' }} href={wa} target="_blank" rel="noreferrer">Chat on WhatsApp</a>}
            </div>
          </div>

          <div id="form" style={{ scrollMarginTop: 90 }}>
            {done !== null ? (
              <div className="form"><div className="okbox"><h3 style={{ fontSize: 22, marginBottom: 8 }}>Thanks, {done}.</h3>We’ll WhatsApp you within one working hour to fix a time.</div><Link className="b line" to="/">Back to home</Link></div>
            ) : (
              <form className="form" onSubmit={submit} noValidate>
                <div><h2 style={{ fontSize: 26 }}>{intent === 'trial' ? `Start your ${SITE.trialDays}-day free trial` : intent === 'payments' ? 'See TravoCloud Payments' : 'Book a demo'}</h2>
                  <p style={{ color: 'var(--ink-soft)', marginTop: 6 }}>{intent === 'trial' ? 'Tell us about your team and we’ll set up your workspace.' : 'A 30-minute walkthrough with your own rates and workflow.'}</p></div>
                <div className="fg">
                  <div className="f"><label htmlFor="d-name">Full name</label><input id="d-name" autoComplete="name" value={f.full_name} onChange={s('full_name')} /></div>
                  <div className="f"><label htmlFor="d-co">Company name</label><input id="d-co" autoComplete="organization" value={f.company} onChange={s('company')} /></div>
                  <div className="f"><label htmlFor="d-email">Work email</label><input id="d-email" type="email" autoComplete="email" value={f.email} onChange={s('email')} /></div>
                  <div className="f"><label htmlFor="d-phone">Mobile / WhatsApp</label><input id="d-phone" type="tel" autoComplete="tel" value={f.phone} onChange={s('phone')} /></div>
                  <div className="f"><label htmlFor="d-city">City</label><input id="d-city" autoComplete="address-level2" value={f.city} onChange={s('city')} /></div>
                  <div className="f"><label htmlFor="d-type">Business type</label><select id="d-type" value={f.business_type} onChange={s('business_type')}><option value="">Choose</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                  <div className="f"><label htmlFor="d-size">Team size</label><select id="d-size" value={f.team_size} onChange={s('team_size')}><option value="">Choose</option>{SIZES.map((t) => <option key={t}>{t}</option>)}</select></div>
                  <div className="f"><label htmlFor="d-time">Preferred demo time (IST)</label><input id="d-time" type="datetime-local" value={f.preferred_time} onChange={s('preferred_time')} /></div>
                  <div className="f full"><label htmlFor="d-sw">Software you use today (optional)</label><input id="d-sw" value={f.current_software} onChange={s('current_software')} placeholder="e.g. Excel, Tally, another travel CRM" /></div>
                  <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true"><label htmlFor="d-web">Website</label><input id="d-web" tabIndex={-1} autoComplete="off" value={f.website} onChange={s('website')} /></div>
                </div>
                <label className="check"><input type="checkbox" id="d-consent" checked={f.consent} onChange={s('consent')} />You can contact me on WhatsApp and email about TravoCloud.</label>
                {err && <div className="err" role="alert">{err}</div>}
                <button className="b o" type="submit" disabled={busy}>{busy ? 'Sending…' : intent === 'trial' ? 'Request my trial' : 'Book my demo'}</button>
                <p className="muted" style={{ fontSize: 13 }}>By submitting you agree to our <Link to="/privacy">Privacy Policy</Link>.</p>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
