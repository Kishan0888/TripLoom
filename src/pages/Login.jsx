import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';

export default function Login() {
  const nav = useNavigate();
  const { user, loading } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { if (!loading && user) nav('/app', { replace: true }); }, [user, loading, nav]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setMsg({ kind: 'bad', text: error.message === 'Invalid login credentials' ? 'That email and password don’t match. Check them and try again.' : error.message });
  }
  async function forgot() {
    if (!/^\S+@\S+\.\S+$/.test(email)) { setMsg({ kind: 'warn', text: 'Enter your work email above first.' }); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/login` });
    setMsg(error ? { kind: 'bad', text: error.message } : { kind: 'ok', text: `If ${email} has an account, a reset link is on its way.` });
  }

  return (
    <div className="tcl">
      <section className="tcl-side">
        <svg className="tcl-threads" viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden="true">
          {Array.from({ length: 11 }, (_, i) => <path key={`o${i}`} d={`M0 ${40 + i * 72} C 300 ${i * 72 - 10}, 600 ${110 + i * 72}, 1200 ${30 + i * 72}`} stroke="#F2994A" strokeWidth="1.3" fill="none" />)}
          {Array.from({ length: 11 }, (_, i) => <path key={`t${i}`} d={`M0 ${70 + i * 72} C 350 ${130 + i * 72}, 700 ${i * 72}, 1200 ${80 + i * 72}`} stroke="#2A9D8F" strokeWidth="1.3" fill="none" />)}
        </svg>
        <a className="tcl-brand" href="/">
          <svg width="38" height="38" viewBox="0 0 40 40" aria-hidden="true">
            <rect width="40" height="40" rx="11" fill="#F6F3EC" />
            <g fill="#0F2A33"><circle cx="14.5" cy="22" r="5" /><circle cx="21" cy="17.5" r="7" /><circle cx="27.5" cy="22" r="5" /><rect x="14.5" y="20" width="13" height="7" /></g>
            <path d="M6.5 32.5c7-4.5 16-5 27-12.5" fill="none" stroke="#F2994A" strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="33.5" cy="20" r="2.4" fill="#F2994A" />
          </svg>
          <span><b>TravoCloud</b><small>Payments</small></span>
        </a>
        <div className="tcl-copy">
          <span className="tcl-eyebrow">For tour operators &amp; DMCs</span>
          <h1>Collect every instalment, in <em>every currency.</em></h1>
          <p>Invoice international travellers, split trips into deposits and balances, send payment links through Razorpay, CCAvenue, PayPal and more, and match every payout to your bank account.</p>
        </div>
        <ul className="tcl-list">
          <li><i aria-hidden="true">✓</i>Payment links in USD, EUR, GBP, AUD, AED and INR</li>
          <li><i aria-hidden="true">✓</i>Deposit and balance schedules with reminders</li>
          <li><i aria-hidden="true">✓</i>Bank credit reconciliation for every payment</li>
        </ul>
      </section>
      <section className="tcl-main">
        <form className="tcl-card" onSubmit={submit} noValidate>
          <div className="tcl-head">
            <h2>Welcome back</h2>
            <p>Sign in with the account your administrator created for you.</p>
          </div>
          <div className="tcl-field"><label htmlFor="l-email">Work email</label><input id="l-email" type="email" autoComplete="username" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="tcl-field">
            <div className="tcl-row"><label htmlFor="l-pass">Password</label><button type="button" className="tcl-link" onClick={forgot}>Forgot password?</button></div>
            <input id="l-pass" type="password" autoComplete="current-password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {msg && <div className={`tcl-alert ${msg.kind}`} role="status">{msg.text}</div>}
          <button className="tcl-btn" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="tcl-note">New operator? TravoCloud sets up your workspace and sends you a login. <a href="/contact">Book a demo</a></p>
        </form>
        <p className="tcl-foot"><a href="/">← Back to {window.location.host}</a></p>
      </section>
    </div>
  );
}
