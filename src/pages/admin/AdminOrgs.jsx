import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, callFunction, must } from '../../lib/supabase';
import { useLoad } from '../../lib/session';
import { Loading, ErrorBox, Modal, Field, Icon, Pill, Empty, useToast, copyText } from '../../components/ui';
import { inr0, fd, initials } from '../../lib/format';

const slugify = (s) => s.toLowerCase().replace(/\b(pvt|ltd|private|limited)\b\.?/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export default function AdminOrgs() {
  const nav = useNavigate();
  const { data, loading, error, reload } = useLoad(async () => must(await supabase.rpc('admin_org_overview')), []);
  const [show, setShow] = useState(false);
  const [created, setCreated] = useState(null);
  const [q, setQ] = useState('');
  const list = (data || []).filter((o) => !q || (o.name + o.slug + (o.owner_email || '')).toLowerCase().includes(q.toLowerCase()));
  const active = (data || []).filter((o) => o.status === 'active').length;
  const total = (data || []).reduce((a, o) => a + Number(o.collected_inr), 0);

  return (
    <>
      <div className="pagehead">
        <div><span className="admin-badge">Platform admin</span><h1 style={{ marginTop: 6 }}>Organisations</h1><p className="sub">Every tour operator on TripLoom Payments gets its own private workspace.</p></div>
        <div className="actions"><button className="btn primary" onClick={() => setShow(true)}><Icon name="plus" />Onboard organisation</button></div>
      </div>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
        <div className="kpi"><span className="k">Organisations</span><span className="v">{data?.length ?? '—'}</span><span className="s">{active} active</span></div>
        <div className="kpi"><span className="k">Collected through the platform</span><span className="v">{inr0(total)}</span><span className="s">Gross INR, all operators</span></div>
        <div className="kpi"><span className="k">On live gateway</span><span className="v">{(data || []).filter((o) => o.gateway_env === 'live').length}</span><span className="s">Others are in demo or test mode</span></div>
      </div>
      <ErrorBox error={error} onRetry={reload} />
      {loading ? <Loading /> : (
        <section className="card">
          <div className="toolbar"><input className="in sm search" style={{ marginLeft: 0 }} type="search" placeholder="Search organisations" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          {list.length === 0 ? <Empty>No organisations yet. Onboard your first tour operator.</Empty> : (
            <div className="orgcards">
              {list.map((o) => (
                <button key={o.id} className="orgcard" onClick={() => nav(`/admin/orgs/${o.id}`)}>
                  <div className="top">
                    <span className="avatar" style={{ background: 'var(--brand-soft)', color: 'var(--brand)', width: 40, height: 40 }}>{initials(o.name)}</span>
                    <div style={{ minWidth: 0, flex: 1 }}><b style={{ display: 'block' }}>{o.name}</b><span className="muted mono" style={{ fontSize: 12 }}>/o/{o.slug}</span></div>
                    <Pill kind={o.status === 'active' ? 'ok' : 'late'}>{o.status === 'active' ? 'Active' : 'Suspended'}</Pill>
                  </div>
                  <div className="stats"><div><b>{o.members}</b>users</div><div><b>{o.invoices}</b>invoices</div><div><b>{inr0(o.collected_inr)}</b>collected</div></div>
                  <span className="muted" style={{ fontSize: 12.5 }}>Owner {o.owner_email || '—'} · {o.gateway_env === 'live' ? 'Live gateway' : o.gateway_env === 'test' ? 'Test gateway' : 'Demo mode'} · since {fd(o.created_at)}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      {show && <OnboardModal onClose={() => setShow(false)} onDone={(r) => { setShow(false); setCreated(r); reload(); }} />}
      {created && <CreatedModal r={created} onClose={() => setCreated(null)} />}
    </>
  );
}

function OnboardModal({ onClose, onDone }) {
  const [f, setF] = useState({ name: '', slug: '', invoice_prefix: '', email: '', phone: '', gstin: '', address: '', owner_name: '', owner_email: '' });
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => {
    // Workspace address is cleaned as you type: lowercase, spaces become hyphens, other characters dropped.
    const v = k === 'slug' ? e.target.value.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40) : e.target.value;
    setF((p) => {
      const n = { ...p, [k]: v };
      if (k === 'name' && !slugTouched) n.slug = slugify(v);
      if (k === 'name' && !p.invoice_prefix) n.invoice_prefix = '';
      return n;
    });
    if (k === 'slug') setSlugTouched(true);
  };
  async function save() {
    const e = [];
    if (!f.name.trim()) e.push('Enter the company name.');
    if (!/^[a-z0-9-]{2,40}$/.test(f.slug)) e.push('Workspace address needs at least 2 characters, e.g. banyan-tours.');
    if (!f.owner_name.trim()) e.push('Enter the owner’s name.');
    if (!/^\S+@\S+\.\S+$/.test(f.owner_email)) e.push('Enter a valid owner email.');
    if (e.length) { setErr(e.join(' ')); return; }
    setBusy(true); setErr(null);
    try {
      const prefix = (f.invoice_prefix || f.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3)).toUpperCase();
      const r = await callFunction('admin-onboard', { action: 'create_org', ...f, invoice_prefix: prefix });
      onDone(r);
    } catch (x) { setErr(x.message); setBusy(false); }
  }
  return (
    <Modal title="Onboard organisation" sub="Creates a private workspace and the owner’s login." onClose={onClose} wide
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Creating…' : 'Create workspace'}</button></>}>
      <div className="fgrid">
        <Field label="Company name" id="o-name" span><input className="in" id="o-name" value={f.name} onChange={set('name')} placeholder="e.g. Banyan Tours Pvt Ltd" /></Field>
        <Field label="Workspace address" id="o-slug" hint={`Short name for their link, e.g. banyan-tours → payments.triploom.in/o/${f.slug || 'banyan-tours'}`}><input className="in mono" id="o-slug" value={f.slug} onChange={set('slug')} /></Field>
        <Field label="Invoice prefix" id="o-pre" hint="Invoices are numbered PREFIX/26-27/0001"><input className="in mono" id="o-pre" value={f.invoice_prefix} onChange={set('invoice_prefix')} placeholder="BT" maxLength={6} /></Field>
        <Field label="Billing email" id="o-email"><input className="in" id="o-email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Phone" id="o-phone"><input className="in" id="o-phone" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="GSTIN" id="o-gst"><input className="in mono" id="o-gst" value={f.gstin} onChange={set('gstin')} /></Field>
        <Field label="Address" id="o-addr"><input className="in" id="o-addr" value={f.address} onChange={set('address')} /></Field>
      </div>
      <h3 style={{ marginTop: 6 }}>Owner login</h3>
      <div className="fgrid">
        <Field label="Owner name" id="o-oname"><input className="in" id="o-oname" value={f.owner_name} onChange={set('owner_name')} /></Field>
        <Field label="Owner email" id="o-oemail"><input className="in" id="o-oemail" type="email" value={f.owner_email} onChange={set('owner_email')} /></Field>
      </div>
      {err && <div className="alert bad">{err}</div>}
    </Modal>
  );
}

export function CreatedModal({ r, onClose, title = 'Workspace ready' }) {
  const toast = useToast();
  const who = r.owner || r.member;
  const url = r.org ? `${window.location.origin}/o/${r.org.slug}` : `${window.location.origin}/login`;
  const text = `Your TripLoom Payments login\nSign in: ${window.location.origin}/login\nEmail: ${who.email}${who.temp_password ? `\nTemporary password: ${who.temp_password}` : ''}`;
  return (
    <Modal title={title} onClose={onClose} footer={<><button className="btn" onClick={() => copyText(text, toast)}>Copy login details</button><button className="btn primary" onClick={onClose}>Done</button></>}>
      {r.org && <p className="sub">{r.org.name} is live at <span className="mono">{url.replace(/^https?:\/\//, '')}</span>.</p>}
      {who.temp_password ? (
        <>
          <p>Share these details with {who.email}. They should change the password after first sign-in (Settings → My account).</p>
          <div className="secret">Email: {who.email}<br />Temporary password: {who.temp_password}</div>
          <div className="alert warn">This password is shown only once.</div>
        </>
      ) : <p>{who.email} already has a TripLoom login, so they can sign in with their existing password.</p>}
    </Modal>
  );
}
