import { useState, useEffect } from 'react';
import { supabase, must, callFunction } from '../../lib/supabase';
import { useLoad } from '../../lib/session';
import { Loading, ErrorBox, Field, Pill, Empty, useToast } from '../../components/ui';
import { SMTP_PRESETS } from '../../lib/email';
import { fd, istDate, istTime } from '../../lib/format';

const SOURCE = { demo: 'Book a demo', trial: 'Free trial', payments: 'Payments demo', pricing: 'Pricing page' };

// Platform admin: website demo requests, and the mailbox that delivers them to sales.
export default function AdminLeads() {
  const toast = useToast();
  const { data, loading, error, reload } = useLoad(async () => {
    const [mail, leads] = await Promise.all([
      supabase.rpc('get_platform_mail'),
      supabase.from('demo_requests').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    return { mail: must(mail), leads: must(leads) };
  }, []);
  const [f, setF] = useState(null);
  const [preset, setPreset] = useState('other');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!data) return;
    const m = data.mail;
    setF({ host: m.host || '', port: m.port || 465, username: m.username || '', password: '', from_name: m.from_name || 'TravoCloud Website',
      from_email: m.from_email || '', lead_email: m.lead_email || 'sales@travocloud.com', enabled: m.enabled ?? true });
    const p = SMTP_PRESETS.find((x) => x.host && x.host === m.host);
    setPreset(p ? p.id : 'other');
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!f) return <Loading />;
  const m = data.mail;
  const s = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const P = SMTP_PRESETS.find((x) => x.id === preset) || SMTP_PRESETS.at(-1);

  async function save() {
    const e = [];
    if (!f.host.trim()) e.push('Enter the SMTP host.');
    if (!f.username.trim()) e.push('Enter the SMTP username.');
    if (!m.has_password && !f.password) e.push('Enter the mailbox password or app password.');
    if (!/^\S+@\S+\.\S+$/.test(f.from_email)) e.push('Enter a valid sender email.');
    if (!/^\S+@\S+\.\S+$/.test(f.lead_email)) e.push('Enter the email that should receive demo requests.');
    if (e.length) { setErr(e); return; }
    setBusy(true); setErr(null);
    const { error: e2 } = await supabase.rpc('save_platform_mail', { p_host: f.host.trim(), p_port: Number(f.port), p_username: f.username.trim(), p_password: f.password,
      p_from_name: f.from_name, p_from_email: f.from_email.trim(), p_lead_email: f.lead_email.trim(), p_enabled: f.enabled });
    setBusy(false);
    if (e2) { setErr([e2.message]); return; }
    toast('Saved. Send a test to check it.'); reload();
  }
  async function test() {
    setBusy(true);
    try { const r = await callFunction('mailer', { action: 'test_platform' }); toast(r.ok ? `Test sent to ${r.to}` : `Test failed: ${r.error}`); }
    catch (e) { toast(e.message); }
    setBusy(false); reload();
  }

  const status = !m.host ? <Pill kind="awaiting">Not set up</Pill> : m.last_error ? <Pill kind="fail">Needs attention</Pill>
    : m.verified_at ? <Pill kind="ok">Connected</Pill> : <Pill kind="info">Saved, not tested</Pill>;

  return (
    <>
      <div className="pagehead"><div><span className="admin-badge">Platform admin</span><h1 style={{ marginTop: 6 }}>Website leads</h1>
        <p className="sub">Demo requests from the website. Each one is also emailed to {m.lead_email} once the mailbox below is set up.</p></div></div>

      <section className="card">
        <div className="card-h"><div><h2>Demo requests ({data.leads.length})</h2><p>Newest first</p></div></div>
        {data.leads.length === 0 ? <Empty>No requests yet. They appear here when someone books a demo on the website.</Empty> : (
          <div className="tw"><table className="t"><thead><tr><th>Received</th><th>Name &amp; company</th><th>Contact</th><th>Details</th><th>Emailed</th></tr></thead><tbody>
            {data.leads.map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{fd(istDate(r.created_at))}<span className="l2">{istTime(r.created_at)}</span></td>
                <td><b>{r.full_name}</b><span className="l2">{r.company}{r.city ? ` · ${r.city}` : ''}</span></td>
                <td>{r.email}<span className="l2">{r.phone}</span></td>
                <td>{[SOURCE[r.intent] || r.intent, r.plan, r.business_type, r.team_size && `${r.team_size} people`].filter(Boolean).join(' · ')}
                  {(r.message || r.current_software) && <span className="l2">{[r.message, r.current_software && `Uses: ${r.current_software}`].filter(Boolean).join(' · ')}</span>}</td>
                <td>{r.notified_at ? <Pill kind="ok">Sent</Pill> : <Pill>Not emailed</Pill>}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </section>

      <section className="card">
        <div className="card-h"><div><h2>Mailbox that sends demo requests</h2><p>Use the sales@travocloud.com mailbox (or any TravoCloud mailbox) to deliver requests to your sales inbox.</p></div>{status}</div>
        {m.last_error && <div className="alert bad" style={{ marginBottom: 14 }}><b>Last email failed:</b> {m.last_error}</div>}
        <div className="fgrid" style={{ maxWidth: 760 }}>
          <Field label="Email provider" id="pm-preset" span hint={P.hint}>
            <select className="in" id="pm-preset" value={preset} onChange={(e) => { const p = SMTP_PRESETS.find((x) => x.id === e.target.value); setPreset(p.id); setF({ ...f, host: p.host || f.host, port: p.port }); }}>
              {SMTP_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="SMTP host" id="pm-host"><input className="in mono" id="pm-host" value={f.host} onChange={s('host')} /></Field>
          <Field label="Port" id="pm-port"><select className="in" id="pm-port" value={f.port} onChange={s('port')}><option value={465}>465 (SSL, recommended)</option><option value={2525}>2525 (STARTTLS)</option></select></Field>
          <Field label="Username" id="pm-user"><input className="in" id="pm-user" autoComplete="off" value={f.username} onChange={s('username')} /></Field>
          <Field label="Password or app password" id="pm-pass" hint={m.has_password ? 'Saved. Leave blank to keep it.' : ''}><input className="in" id="pm-pass" type="password" autoComplete="new-password" value={f.password} onChange={s('password')} placeholder={m.has_password ? '•••••••••• saved' : ''} /></Field>
          <Field label="Sender name" id="pm-fname"><input className="in" id="pm-fname" value={f.from_name} onChange={s('from_name')} /></Field>
          <Field label="Sender email" id="pm-from"><input className="in" id="pm-from" type="email" value={f.from_email} onChange={s('from_email')} placeholder="sales@travocloud.com" /></Field>
          <Field label="Send demo requests to" id="pm-lead"><input className="in" id="pm-lead" type="email" value={f.lead_email} onChange={s('lead_email')} /></Field>
          <Field label="Status" id="pm-on"><label className="check" style={{ height: 38 }}><input type="checkbox" id="pm-on" checked={f.enabled} onChange={s('enabled')} />Email new demo requests</label></Field>
        </div>
        {err && <div className="alert bad" style={{ marginTop: 14 }}>{err.map((x) => <div key={x}>{x}</div>)}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button className="btn primary" onClick={save} disabled={busy}>Save</button>
          {m.host && <button className="btn" onClick={test} disabled={busy}>Send test to {m.lead_email}</button>}
        </div>
      </section>
    </>
  );
}
