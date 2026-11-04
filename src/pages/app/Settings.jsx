import { useState, useEffect } from 'react';
import { supabase, must, FUNCTIONS_URL } from '../../lib/supabase';
import { useLoad, useSession } from '../../lib/session';
import { useOrg } from '../../components/OrgLayout';
import { Loading, Field, Pill, Icon, Modal, useToast, copyText } from '../../components/ui';
import { CURRENCIES, ROLE_LBL, fd } from '../../lib/format';
import { AddMember } from '../admin/AdminOrg';
import { CreatedModal } from '../admin/AdminOrgs';

export default function Settings() {
  const { role } = useOrg();
  const [tab, setTab] = useState(role === 'owner' ? 'gateway' : 'account');
  const tabs = [['gateway', 'Payment gateway'], ['company', 'Company'], ['invoice', 'Invoices'], ['team', 'Team'], ['account', 'My account']];
  return (
    <>
      <div className="pagehead"><div><h1>Settings</h1><p className="sub">Gateway, company, invoice numbering, team and your account.</p></div></div>
      <section className="card">
        <div className="tabs">{tabs.map(([k, l]) => <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>
        <div style={{ marginTop: 20, maxWidth: 760 }}>
          {tab === 'gateway' && <Gateway />}{tab === 'company' && <Company />}{tab === 'invoice' && <InvoiceSettings />}{tab === 'team' && <Team />}{tab === 'account' && <Account />}
        </div>
      </section>
    </>
  );
}

const OwnerNote = () => <div className="alert info" style={{ marginBottom: 16 }}>Only the organisation owner can change these settings.</div>;

function Gateway() {
  const { org, role } = useOrg();
  const toast = useToast();
  const owner = role === 'owner';
  const { data, loading, reload } = useLoad(async () => must(await supabase.rpc('get_gateway_config', { p_org: org.id })), [org.id]);
  const [f, setF] = useState(null);
  const [fees, setFees] = useState({ fee_pct: org.fee_pct, settle_days: org.settle_days });
  useEffect(() => { if (data) setF({ environment: data.environment, merchant_id: data.merchant_id || '', access_code: data.access_code || '', working_key: '', currencies: data.currencies }); }, [data]);
  if (loading || !f) return <Loading />;
  const ret = `${FUNCTIONS_URL}/ccavenue/response`;
  async function save() {
    if (f.environment !== 'demo' && (!f.merchant_id || !f.access_code || (!data.has_working_key && !f.working_key))) { toast('Enter merchant ID, access code and working key to use test or live mode.'); return; }
    const { error } = await supabase.rpc('save_gateway_config', { p_org: org.id, p_env: f.environment, p_merchant: f.merchant_id || null, p_access: f.access_code || null, p_key: f.working_key || null, p_currencies: f.currencies });
    if (error) { toast(error.message); return; }
    const e2 = await supabase.from('organizations').update({ fee_pct: Number(fees.fee_pct), settle_days: parseInt(fees.settle_days, 10) || 0 }).eq('id', org.id);
    toast(e2.error ? e2.error.message : 'Gateway settings saved'); reload();
  }
  const envLbl = { demo: 'Demo mode', test: 'Test', live: 'Live' };
  return (
    <>
      {!owner && <OwnerNote />}
      <div className="gw"><span className="logo">CCA</span><div style={{ flex: 1, minWidth: 180 }}><b>CCAvenue</b><div className="muted" style={{ fontSize: 12.5 }}>Your own merchant account. Money settles straight to your bank.</div></div>
        <Pill kind={data.environment === 'live' ? 'ok' : data.environment === 'test' ? 'info' : 'awaiting'}>{envLbl[data.environment]}{data.has_working_key ? ' · keys saved' : ''}</Pill></div>
      {f.environment === 'demo' && <div className="alert warn" style={{ marginTop: 14 }}>Demo mode: the payment page completes payments without charging anyone. Switch to Test or Live once your CCAvenue keys are ready.</div>}
      <fieldset disabled={!owner} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="fgrid" style={{ marginTop: 18 }}>
          <Field label="Mode" id="g-mode"><select className="in" id="g-mode" value={f.environment} onChange={(e) => setF({ ...f, environment: e.target.value })}><option value="demo">Demo (no real charges)</option><option value="test">Test (CCAvenue sandbox)</option><option value="live">Live</option></select></Field>
          <Field label="Merchant ID" id="g-mid"><input className="in mono" id="g-mid" value={f.merchant_id} onChange={(e) => setF({ ...f, merchant_id: e.target.value })} /></Field>
          <Field label="Access code" id="g-acc"><input className="in mono" id="g-acc" value={f.access_code} onChange={(e) => setF({ ...f, access_code: e.target.value })} /></Field>
          <Field label="Working key" id="g-key" hint={data.has_working_key ? 'A key is saved. Leave blank to keep it.' : 'Stored on the server. Never shown again after saving.'}><input className="in mono" id="g-key" type="password" autoComplete="off" value={f.working_key} onChange={(e) => setF({ ...f, working_key: e.target.value })} placeholder={data.has_working_key ? '••••••••••••' : ''} /></Field>
          <Field label="Redirect and cancel URL" id="g-ret" span hint="Register this URL for both redirect and cancel in your CCAvenue dashboard, and whitelist payments.triploom.in.">
            <div className="copyrow"><input className="in" id="g-ret" readOnly value={ret} /><button type="button" className="btn" onClick={() => copyText(ret, toast)}>Copy</button></div></Field>
          <Field label="Currencies enabled on your account" id="g-cur" span hint="Multi-currency processing must also be activated by CCAvenue.">
            <div className="curgrid">{CURRENCIES.map((c) => <label key={c} className="check"><input type="checkbox" id={`cur-${c}`} checked={f.currencies.includes(c)} onChange={(e) => setF({ ...f, currencies: e.target.checked ? [...f.currencies, c] : f.currencies.filter((x) => x !== c) })} />{c}</label>)}</div></Field>
          <Field label="Gateway fee (%)" id="g-fee" hint={`Used to estimate net payout. GST at ${Number(org.fee_gst)}% is added.`}><input className="in num" id="g-fee" type="number" step="0.01" value={fees.fee_pct} onChange={(e) => setFees({ ...fees, fee_pct: e.target.value })} /></Field>
          <Field label="Settlement cycle (days)" id="g-settle" hint="Drives “expected by” dates in reconciliation."><input className="in num" id="g-settle" type="number" value={fees.settle_days} onChange={(e) => setFees({ ...fees, settle_days: e.target.value })} /></Field>
        </div>
        {owner && <button className="btn primary" style={{ marginTop: 18 }} onClick={save}>Save</button>}
      </fieldset>
    </>
  );
}

function Company() {
  const { org, role, reloadOrg } = useOrg();
  const toast = useToast();
  const [f, setF] = useState({ name: org.name, email: org.email || '', phone: org.phone || '', gstin: org.gstin || '', address: org.address || '' });
  async function save() {
    const { error } = await supabase.from('organizations').update(f).eq('id', org.id);
    toast(error ? error.message : 'Company details saved'); if (!error) reloadOrg();
  }
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <fieldset disabled={role !== 'owner'} style={{ border: 0, padding: 0, margin: 0 }}>
      {role !== 'owner' && <OwnerNote />}
      <div className="fgrid">
        <Field label="Company name" id="co-name" span><input className="in" id="co-name" value={f.name} onChange={s('name')} /></Field>
        <Field label="Billing email" id="co-email" hint="Shown to customers on the payment page."><input className="in" id="co-email" value={f.email} onChange={s('email')} /></Field>
        <Field label="Phone" id="co-phone"><input className="in" id="co-phone" value={f.phone} onChange={s('phone')} /></Field>
        <Field label="GSTIN" id="co-gst"><input className="in mono" id="co-gst" value={f.gstin} onChange={s('gstin')} /></Field>
        <Field label="Workspace address" id="co-slug"><input className="in mono" id="co-slug" readOnly value={`/o/${org.slug}`} /></Field>
        <Field label="Registered address" id="co-addr" span><textarea className="in" id="co-addr" rows={2} value={f.address} onChange={s('address')} /></Field>
      </div>
      {role === 'owner' && <button className="btn primary" style={{ marginTop: 18 }} onClick={save}>Save</button>}
    </fieldset>
  );
}

function InvoiceSettings() {
  const { org, role, reloadOrg } = useOrg();
  const toast = useToast();
  const [f, setF] = useState({ invoice_prefix: org.invoice_prefix, fy: org.fy, reminder_days: org.reminder_days, terms: org.terms || '' });
  async function save() {
    if (!/^[A-Za-z0-9-]{1,8}$/.test(f.invoice_prefix)) { toast('Prefix can be up to 8 letters, numbers or hyphens.'); return; }
    const { error } = await supabase.from('organizations').update({ ...f, invoice_prefix: f.invoice_prefix.toUpperCase(), reminder_days: parseInt(f.reminder_days, 10) || 0 }).eq('id', org.id);
    toast(error ? error.message : 'Invoice settings saved'); if (!error) reloadOrg();
  }
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <fieldset disabled={role !== 'owner'} style={{ border: 0, padding: 0, margin: 0 }}>
      {role !== 'owner' && <OwnerNote />}
      <div className="fgrid">
        <Field label="Invoice prefix" id="iv-pre"><input className="in mono" id="iv-pre" value={f.invoice_prefix} onChange={s('invoice_prefix')} /></Field>
        <Field label="Financial year" id="iv-fy"><input className="in mono" id="iv-fy" value={f.fy} onChange={s('fy')} /></Field>
        <Field label="Next invoice number" id="iv-next" span hint="Assigned automatically when an invoice is created."><input className="in mono" id="iv-next" readOnly value={`${f.invoice_prefix.toUpperCase()}/${f.fy}/${String(org.next_invoice_no).padStart(4, '0')}`} /></Field>
        <Field label="Reminder before due date (days)" id="iv-rem"><input className="in num" id="iv-rem" type="number" value={f.reminder_days} onChange={s('reminder_days')} /></Field>
        <Field label="Default terms" id="iv-terms" span><textarea className="in" id="iv-terms" rows={3} value={f.terms} onChange={s('terms')} /></Field>
      </div>
      {role === 'owner' && <button className="btn primary" style={{ marginTop: 18 }} onClick={save}>Save</button>}
    </fieldset>
  );
}

function Team() {
  const { org, role } = useOrg();
  const { user } = useSession();
  const toast = useToast();
  const { data, loading, reload } = useLoad(async () => must(await supabase.from('org_members').select('*').eq('org_id', org.id).order('created_at')), [org.id]);
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState(null);
  const [removing, setRemoving] = useState(null);
  if (loading) return <Loading />;
  const owner = role === 'owner';
  async function changeRole(m, r) {
    const { error } = await supabase.from('org_members').update({ role: r }).eq('org_id', org.id).eq('user_id', m.user_id);
    toast(error ? error.message : `${m.full_name || m.email} is now ${ROLE_LBL[r]}`); reload();
  }
  async function remove() {
    const { error } = await supabase.from('org_members').delete().eq('org_id', org.id).eq('user_id', removing.user_id);
    toast(error ? error.message : 'Member removed'); setRemoving(null); reload();
  }
  return (
    <>
      <div className="tw"><table className="t"><thead><tr><th>Member</th><th>Role</th><th>Added</th>{owner && <th />}</tr></thead><tbody>
        {data.map((m) => (
          <tr key={m.user_id}>
            <td><b>{m.full_name || '—'}</b><span className="l2">{m.email}</span></td>
            <td>{owner && m.user_id !== user.id
              ? <select className="in sm" id={`role-${m.user_id}`} style={{ width: 'auto' }} value={m.role} onChange={(e) => changeRole(m, e.target.value)}><option value="owner">Owner</option><option value="accounts">Accounts</option><option value="sales">Sales</option></select>
              : <Pill kind={m.role === 'owner' ? 'sent' : m.role === 'accounts' ? 'info' : ''}>{ROLE_LBL[m.role]}</Pill>}</td>
            <td>{fd(m.created_at)}</td>
            {owner && <td className="right">{m.user_id !== user.id && <button className="btn sm ghost danger" onClick={() => setRemoving(m)}>Remove</button>}</td>}
          </tr>
        ))}
      </tbody></table></div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>Owner: everything, including gateway keys and team. Accounts: invoices, payments, reconciliation and catalogue. Sales: create and send invoices, manage customers.</p>
      {owner && <button className="btn" style={{ marginTop: 14 }} onClick={() => setAdding(true)}><Icon name="plus" />Add member</button>}
      {adding && <AddMember org={org} onClose={() => setAdding(false)} onDone={(r) => { setAdding(false); setCreated(r); reload(); }} />}
      {created && <CreatedModal r={created} title="Member added" onClose={() => setCreated(null)} />}
      {removing && <Modal title={`Remove ${removing.full_name || removing.email}?`} onClose={() => setRemoving(null)}
        footer={<><button className="btn ghost" onClick={() => setRemoving(null)}>Cancel</button><button className="btn primary" onClick={remove}>Remove</button></>}>
        <p>They lose access to this workspace straight away. Their past activity stays in your records.</p></Modal>}
    </>
  );
}

function Account() {
  const { user, refresh } = useSession();
  const toast = useToast();
  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [pw, setPw] = useState({ a: '', b: '' });
  async function saveName() {
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    toast(error ? error.message : 'Name updated'); refresh();
  }
  async function savePw() {
    if (pw.a.length < 8) { toast('Use at least 8 characters.'); return; }
    if (pw.a !== pw.b) { toast('The two passwords don’t match.'); return; }
    const { error } = await supabase.auth.updateUser({ password: pw.a });
    toast(error ? error.message : 'Password changed'); if (!error) setPw({ a: '', b: '' });
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="fgrid">
        <Field label="Email" id="ac-email"><input className="in" id="ac-email" readOnly value={user?.email || ''} /></Field>
        <Field label="Your name" id="ac-name"><input className="in" id="ac-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      </div>
      <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={saveName}>Save name</button>
      <div><h3 style={{ marginBottom: 12 }}>Change password</h3>
        <div className="fgrid">
          <Field label="New password" id="ac-pw1"><input className="in" id="ac-pw1" type="password" autoComplete="new-password" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} /></Field>
          <Field label="Repeat new password" id="ac-pw2"><input className="in" id="ac-pw2" type="password" autoComplete="new-password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} /></Field>
        </div>
        <button className="btn primary" style={{ marginTop: 14 }} onClick={savePw}>Change password</button></div>
    </div>
  );
}
