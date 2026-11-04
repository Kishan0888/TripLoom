import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';
import { LogoMark } from '../components/ui';

export default function Login() {
  const nav = useNavigate();
  const { user, loading } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { if (!loading && user) nav('/', { replace: true }); }, [user, loading, nav]);

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
    <div className="login">
      <section className="loom">
        <div className="brandmark"><LogoMark size={38} /><div><b style={{ color: 'var(--loom-ink)' }}>TripLoom</b><small>Payments</small></div></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1>Collect every instalment, in every currency.</h1>
          <p>Invoice international travellers, split trips into deposits and balances, send CCAvenue payment links, and match every payout to your bank account.</p>
        </div>
        <ul><li>Payment links in USD, EUR, GBP, AUD, AED and INR</li><li>Deposit and balance schedules with reminders</li><li>Bank credit reconciliation for every payment</li></ul>
      </section>
      <section className="lform">
        <form onSubmit={submit} noValidate>
          <span className="urlchip">payments.triploom.in/login</span>
          <div><h1 style={{ fontSize: 24 }}>Sign in</h1><p className="sub" style={{ marginTop: 4 }}>Use the account your administrator created for you.</p></div>
          <div className="field"><label htmlFor="l-email">Work email</label><input className="in" id="l-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="field"><label htmlFor="l-pass">Password</label><input className="in" id="l-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}
          <button className="btn primary paybtn" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={forgot}>Forgot password?</button>
          <p className="muted" style={{ fontSize: 12.5 }}>New operator? TripLoom sets up your workspace and sends you a login.</p>
        </form>
      </section>
    </div>
  );
}
