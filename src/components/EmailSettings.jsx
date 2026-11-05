import { useState, useEffect } from 'react';
import { supabase, must, callFunction } from '../lib/supabase';
import { useLoad, useSession } from '../lib/session';
import { useOrg } from './OrgLayout';
import { Loading, Field, Pill, Modal, Icon, useToast } from './ui';
import { SMTP_PRESETS } from '../lib/email';
import { fd } from '../lib/format';

// Settings → Email: the organisation's own mailbox for invoices and payment reminders.
export default function EmailSettings() {
  const { org, role } = useOrg();
  const { user } = useSession();
  const toast = useToast();
  const owner = role === 'owner';
  const { data, loading, reload } = useLoad(async () => must(await supabase.rpc('get_smtp', { p_org: org.id })), [org.id]);
  const [f, setF] = useState(null);
  const [preset, setPreset] = useState('other');
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [err, setErr] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setF({ host: data.host || '', port: data.port || 465, username: data.username || '', password: '', from_name: data.from_name || org.name,
      from_email: data.from_email || org.email || '', reply_to: data.reply_to || '', enabled: data.configured ? data.enabled : true });
    const p = SMTP_PRESETS.find((x) => x.host && x.host === data.host);
    setPreset(p ? p.id : data.configured ? 'other' : 'gmail');
    if (!data.configured) setF((v) => ({ ...v, host: 'smtp.gmail.com', port: 465 }));
  }, [data, org.name, org.email]);

  if (loading || !f) return <Loading />;
  const P = SMTP_PRESETS.find((x) => x.id === preset) || SMTP_PRESETS.at(-1);
  const s = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  function choose(id) {
    setPreset(id);
    const p = SMTP_PRESETS.find((x) => x.id === id);
    setF((v) => ({ ...v, host: p.host || (id === 'other' ? v.host : ''), port: p.port, username: v.username || v.from_email }));
  }
  async function save() {
    const e = [];
    if (!f.host.trim()) e.push('Enter the SMTP host.');
    if (![465, 2525].includes(Number(f.port))) e.push('Use port 465 (SSL) or 2525. Ports 25 and 587 are blocked by our hosting provider.');
    if (!f.username.trim()) e.push('Enter the SMTP username (usually your full email address).');
    if (!data.has_password && !f.password) e.push('Enter the mailbox password or app password.');
    if (!/^\S+@\S+\.\S+$/.test(f.from_email)) e.push('Enter a valid sender email.');
    if (f.reply_to && !/^\S+@\S+\.\S+$/.test(f.reply_to)) e.push('Enter a valid reply-to email, or leave it blank.');
    if (e.length) { setErr(e); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc('save_smtp', { p_org: org.id, p_host: f.host.trim(), p_port: Number(f.port), p_username: f.username.trim(), p_password: f.password,
      p_from_name: f.from_name, p_from_email: f.from_email.trim(), p_reply_to: f.reply_to, p_enabled: f.enabled });
    setBusy(false);
    if (error) { setErr([error.message]); return; }
    toast('Email settings saved. Send a test email to check them.'); reload();
  }
  async function test() {
    setTesting(true);
    try {
      const r = await callFunction('mailer', { action: 'test_smtp', org_id: org.id });
      toast(r.ok ? `Test email sent to ${r.to}. Check your inbox.` : `Test failed: ${r.error}`);
    } catch (e2) { toast(e2.message); }
    setTesting(false); reload();
  }
  async function remove() {
    const { error } = await supabase.rpc('delete_smtp', { p_org: org.id });
    setRemoving(false); toast(error ? error.message : 'Email settings removed'); reload();
  }

  const status = !data.configured ? <Pill kind="awaiting">Not set up</Pill>
    : !data.enabled ? <Pill>Turned off</Pill>
    : data.last_error ? <Pill kind="fail">Needs attention</Pill>
    : data.verified_at ? <Pill kind="ok">Connected</Pill> : <Pill kind="info">Saved, not tested</Pill>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="gw">
        <span className="logo"><Icon name="inv" /></span>
        <div style={{ flex: 1, minWidth: 200 }}><b>Send from your own mailbox</b>
          <div className="muted" style={{ fontSize: 12.5 }}>Invoices and payment reminders go to customers from {data.configured ? data.from_email : 'your company email'}, with your name and logo. Replies come straight to you.</div></div>
        {status}
      </div>
      {data.configured && data.last_error && <div className="alert bad"><b>Last email failed:</b> {data.last_error}</div>}
      {data.configured && data.verified_at && !data.last_error && <p className="muted" style={{ fontSize: 12.5, marginTop: -8 }}>Last confirmed working {fd(data.verified_at)}.</p>}
      {!owner && <div className="alert info">Only the organisation owner can change email settings.</div>}

      <fieldset disabled={!owner} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="fgrid">
          <Field label="Email provider" id="sm-preset" span hint={P.hint}>
            <select className="in" id="sm-preset" value={preset} onChange={(e) => choose(e.target.value)}>{SMTP_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </Field>
          <Field label="SMTP host" id="sm-host"><input className="in mono" id="sm-host" value={f.host} onChange={s('host')} placeholder="smtp.yourprovider.com" /></Field>
          <Field label="Port" id="sm-port" hint="465 uses SSL. 2525 uses STARTTLS. Microsoft 365 / Outlook needs port 587, which isn’t supported."><select className="in" id="sm-port" value={f.port} onChange={s('port')}><option value={465}>465 (SSL, recommended)</option><option value={2525}>2525 (STARTTLS)</option></select></Field>
          <Field label="Username" id="sm-user" hint="Usually your full email address."><input className="in" id="sm-user" autoComplete="off" value={f.username} onChange={s('username')} /></Field>
          <Field label="Password or app password" id="sm-pass" hint={data.has_password ? 'Saved. Leave blank to keep it.' : 'Stored on the server, never shown again.'}>
            <input className="in" id="sm-pass" type="password" autoComplete="new-password" value={f.password} onChange={s('password')} placeholder={data.has_password ? '•••••••••• saved' : ''} /></Field>
          <Field label="Sender name" id="sm-fname" hint="What customers see in their inbox."><input className="in" id="sm-fname" value={f.from_name} onChange={s('from_name')} /></Field>
          <Field label="Sender email" id="sm-from" hint="Must belong to this mailbox."><input className="in" id="sm-from" type="email" value={f.from_email} onChange={s('from_email')} placeholder="accounts@yourcompany.com" /></Field>
          <Field label="Reply-to (optional)" id="sm-reply" hint="Where customer replies go, if different."><input className="in" id="sm-reply" type="email" value={f.reply_to} onChange={s('reply_to')} /></Field>
          <Field label="Status" id="sm-on"><label className="check" style={{ height: 38 }}><input type="checkbox" id="sm-on" checked={f.enabled} onChange={s('enabled')} />Email invoices and reminders to customers</label></Field>
        </div>
        {err && <div className="alert bad" style={{ marginTop: 14 }}>{err.map((x) => <div key={x}>{x}</div>)}</div>}
        {owner && (
          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            {data.configured && <button className="btn" onClick={test} disabled={testing}>{testing ? 'Sending…' : `Send test email to ${user?.email}`}</button>}
            {data.configured && <button className="btn ghost danger" style={{ marginLeft: 'auto' }} onClick={() => setRemoving(true)}>Remove</button>}
          </div>
        )}
      </fieldset>

      <div className="card" style={{ background: 'var(--surface-2)', padding: 16 }}>
        <h3 style={{ marginBottom: 6 }}>When emails are sent</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li><b>Create &amp; send</b>, <b>Send invoice</b> on a draft, and <b>Quick payment link</b> email the invoice with its payment link and PDF.</li>
          <li><b>Send reminder</b> on an invoice or the dashboard emails a payment reminder for the next unpaid instalment.</li>
          <li>Every email, sent or failed, is noted in the invoice’s activity.</li>
        </ul>
      </div>
      {removing && <Modal title="Remove email settings?" onClose={() => setRemoving(false)}
        footer={<><button className="btn ghost" onClick={() => setRemoving(false)}>Cancel</button><button className="btn primary" onClick={remove}>Remove</button></>}>
        <p>Invoices and reminders will stop being emailed until you set up a mailbox again. You can still share payment links yourself.</p></Modal>}
    </div>
  );
}
