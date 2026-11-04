import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, must } from '../../lib/supabase';
import { useLoad } from '../../lib/session';
import { useOrg } from '../../components/OrgLayout';
import { Loading, ErrorBox, Icon, Modal, Field, Empty, useToast } from '../../components/ui';
import { money, initials, CURRENCIES } from '../../lib/format';

export default function Customers() {
  const { org, base } = useOrg();
  const nav = useNavigate();
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useLoad(async () => {
    const [cs, inv] = await Promise.all([
      supabase.from('customers').select('*').eq('org_id', org.id).order('name'),
      supabase.from('invoice_summary').select('customer_id,currency,due,status').eq('org_id', org.id).neq('status', 'draft'),
    ]);
    return { cs: must(cs), inv: must(inv) };
  }, [org.id]);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const rows = data.cs.filter((c) => !q || `${c.name} ${c.email} ${c.country}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="pagehead"><div><h1>Customers</h1><p className="sub">Travellers and agents you invoice.</p></div>
        <div className="actions"><button className="btn primary" onClick={() => setEdit({})}><Icon name="plus" />Add customer</button></div></div>
      <section className="card">
        <div className="toolbar"><input className="in sm search" style={{ marginLeft: 0 }} type="search" placeholder="Search customers" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {rows.length === 0 ? <Empty>{data.cs.length ? 'No customers match.' : 'No customers yet. Add your first traveller or agent.'}</Empty> : (
          <div className="tw"><table className="t"><thead><tr><th>Customer</th><th>Country</th><th>Currency</th><th className="right">Invoices</th><th className="right">Outstanding</th><th /></tr></thead><tbody>
            {rows.map((c) => {
              const its = data.inv.filter((i) => i.customer_id === c.id && i.status === 'sent');
              const by = {}; its.forEach((i) => { if (Number(i.due) > 0.005) by[i.currency] = (by[i.currency] || 0) + Number(i.due); });
              const out = Object.entries(by).map(([k, v]) => money(v, k)).join(', ');
              return (
                <tr key={c.id}>
                  <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="avatar" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>{initials(c.name)}</span><div><b>{c.name}</b><span className="l2">{c.email}</span></div></div></td>
                  <td>{c.country || '—'}</td><td className="mono">{c.currency}</td><td className="right num">{its.length}</td>
                  <td className="right num">{out || <span className="muted">—</span>}</td>
                  <td className="right" style={{ whiteSpace: 'nowrap' }}><button className="btn sm ghost" onClick={() => setEdit(c)}>Edit</button> <button className="btn sm" onClick={() => nav(`${base}/invoices?customer=${c.id}`)}>Invoices</button></td>
                </tr>
              );
            })}
          </tbody></table></div>
        )}
      </section>
      {edit && <CustomerModal customer={edit.id ? edit : null} onClose={() => setEdit(null)} onSaved={(c) => { setEdit(null); toast(edit.id ? 'Customer updated' : `${c.name} added`); reload(); }} />}
    </>
  );
}

export function CustomerModal({ customer, onClose, onSaved }) {
  const { org } = useOrg();
  const [f, setF] = useState(customer || { name: '', email: '', phone: '', country: '', currency: 'USD' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function save() {
    const e = [];
    if (!f.name?.trim()) e.push('Enter a name.'); if (!/^\S+@\S+\.\S+$/.test(f.email || '')) e.push('Enter a valid email.');
    if (e.length) { setErr(e.join(' ')); return; }
    setBusy(true);
    const row = { name: f.name.trim(), email: f.email.trim(), phone: f.phone || null, country: f.country || null, currency: f.currency };
    const res = customer
      ? await supabase.from('customers').update(row).eq('id', customer.id).select().single()
      : await supabase.from('customers').insert({ ...row, org_id: org.id }).select().single();
    if (res.error) { setErr(res.error.message); setBusy(false); return; }
    onSaved(res.data);
  }
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={customer ? 'Edit customer' : 'Add customer'} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : customer ? 'Save' : 'Add customer'}</button></>}>
      <div className="fgrid">
        <Field label="Full name or company" id="nc-name" span><input className="in" id="nc-name" value={f.name} onChange={s('name')} /></Field>
        <Field label="Email" id="nc-email"><input className="in" id="nc-email" type="email" value={f.email} onChange={s('email')} /></Field>
        <Field label="Phone" id="nc-phone"><input className="in" id="nc-phone" value={f.phone || ''} onChange={s('phone')} /></Field>
        <Field label="Country" id="nc-country"><input className="in" id="nc-country" value={f.country || ''} onChange={s('country')} /></Field>
        <Field label="Default currency" id="nc-cur"><select className="in" id="nc-cur" value={f.currency} onChange={s('currency')}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      {err && <div className="alert bad">{err}</div>}
    </Modal>
  );
}
