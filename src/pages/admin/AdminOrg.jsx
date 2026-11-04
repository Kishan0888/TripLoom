import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, callFunction, must } from '../../lib/supabase';
import { useLoad, useSession } from '../../lib/session';
import { Loading, ErrorBox, Pill, Modal, Field, Icon, useToast } from '../../components/ui';
import { fd, inr0, ROLE_LBL } from '../../lib/format';
import { CreatedModal } from './AdminOrgs';
import LogoUpload from '../../components/LogoUpload';

export default function AdminOrg() {
  const { id } = useParams();
  const toast = useToast();
  const { memberships } = useSession();
  const { data, loading, error, reload } = useLoad(async () => {
    const [org, members, gw, ov] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', id).single(),
      supabase.from('org_members').select('*').eq('org_id', id).order('created_at'),
      supabase.rpc('list_gateways', { p_org: id }),
      supabase.rpc('admin_org_overview'),
    ]);
    return { org: must(org), members: must(members), gw: must(gw), stats: (must(ov) || []).find((o) => o.id === id) };
  }, [id]);
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState(null);
  const [confirm, setConfirm] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const { org, members, gw, stats } = data;
  const mine = memberships.find((m) => m.org_id === org.id);

  async function setStatus(status) {
    try { await callFunction('admin-onboard', { action: 'set_status', org_id: org.id, status }); toast(status === 'active' ? 'Organisation reactivated' : 'Organisation suspended'); setConfirm(false); reload(); }
    catch (e) { toast(e.message); }
  }

  return (
    <>
      <div className="pagehead">
        <div><Link className="crumb" to="/admin">← Organisations</Link>
          <div className="dhead"><h1>{org.name}</h1><Pill kind={org.status === 'active' ? 'ok' : 'late'}>{org.status === 'active' ? 'Active' : 'Suspended'}</Pill></div>
          <p className="sub mono">payments.triploom.in/o/{org.slug}</p></div>
        <div className="actions">
          {mine && <Link className="btn" to={`/o/${org.slug}`}>Open workspace</Link>}
          {org.status === 'active'
            ? <button className="btn danger" onClick={() => setConfirm(true)}>Suspend</button>
            : <button className="btn primary" onClick={() => setStatus('active')}>Reactivate</button>}
        </div>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="k">Team members</span><span className="v">{members.length}</span></div>
        <div className="kpi"><span className="k">Invoices sent</span><span className="v">{stats?.invoices ?? 0}</span></div>
        <div className="kpi"><span className="k">Collected</span><span className="v">{inr0(stats?.collected_inr)}</span></div>
        <div className="kpi"><span className="k">Payments</span><span className="v" style={{ fontSize: 20 }}>{org.payment_mode === 'live' ? 'Live' : 'Demo mode'}</span><span className="s">{gw.filter((g) => g.enabled).map((g) => g.label).join(', ') || 'No gateway connected yet'}</span></div>
      </div>
      <div className="grid2">
        <section className="card">
          <div className="card-h"><div><h2>Team</h2><p>People who can sign in to this workspace</p></div><button className="btn sm" onClick={() => setAdding(true)}><Icon name="plus" />Add user</button></div>
          <div className="tw"><table className="t"><thead><tr><th>Name</th><th>Role</th><th>Added</th></tr></thead><tbody>
            {members.map((m) => <tr key={m.user_id}><td><b>{m.full_name || '—'}</b><span className="l2">{m.email}</span></td><td><Pill kind={m.role === 'owner' ? 'sent' : m.role === 'accounts' ? 'info' : ''}>{ROLE_LBL[m.role]}</Pill></td><td>{fd(m.created_at)}</td></tr>)}
          </tbody></table></div>
        </section>
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>Logo</h2>
          <LogoUpload org={org} canEdit toast={toast} onChange={reload} />
          <h2 style={{ margin: '20px 0 12px' }}>Company details</h2>
          <dl className="kv">
            <dt>Billing email</dt><dd>{org.email || '—'}</dd><dt>Phone</dt><dd>{org.phone || '—'}</dd><dt>GSTIN</dt><dd>{org.gstin || '—'}</dd>
            <dt>Address</dt><dd>{org.address || '—'}</dd><dt>Invoice format</dt><dd className="mono">{org.invoice_prefix}/{org.fy}/{String(org.next_invoice_no).padStart(4, '0')}</dd>
            <dt>Onboarded</dt><dd>{fd(org.created_at)}</dd><dt>Last activity</dt><dd>{stats?.last_activity ? fd(stats.last_activity) : '—'}</dd>
          </dl>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>The operator manages their own invoices, customers and gateway keys. Their financial records stay private to their team.</p>
        </section>
      </div>
      {adding && <AddMember org={org} onClose={() => setAdding(false)} onDone={(r) => { setAdding(false); setCreated(r); reload(); }} />}
      {created && <CreatedModal r={created} title="User added" onClose={() => setCreated(null)} />}
      {confirm && (
        <Modal title={`Suspend ${org.name}?`} onClose={() => setConfirm(false)}
          footer={<><button className="btn ghost" onClick={() => setConfirm(false)}>Cancel</button><button className="btn primary" onClick={() => setStatus('suspended')}>Suspend</button></>}>
          <p>Their team will lose access to the workspace and their payment links will stop working until you reactivate it. No data is deleted.</p>
        </Modal>
      )}
    </>
  );
}

export function AddMember({ org, onClose, onDone }) {
  const [f, setF] = useState({ name: '', email: '', role: 'sales' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function save() {
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email)) { setErr('Enter a name and a valid email.'); return; }
    setBusy(true); setErr(null);
    try { onDone(await callFunction('admin-onboard', { action: 'add_member', org_id: org.id, ...f })); }
    catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <Modal title="Add team member" sub={org.name} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Adding…' : 'Add member'}</button></>}>
      <div className="fgrid">
        <Field label="Full name" id="m-name"><input className="in" id="m-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Email" id="m-email"><input className="in" id="m-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Role" id="m-role" span hint={f.role === 'owner' ? 'Everything, including gateway keys and team.' : f.role === 'accounts' ? 'Invoices, payments, reconciliation and catalogue.' : 'Create and send invoices, manage customers.'}>
          <select className="in" id="m-role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="sales">Sales</option><option value="accounts">Accounts</option><option value="owner">Owner</option>
          </select>
        </Field>
      </div>
      {err && <div className="alert bad">{err}</div>}
    </Modal>
  );
}
