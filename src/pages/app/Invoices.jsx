import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, must } from '../../lib/supabase';
import { useLoad } from '../../lib/session';
import { useOrg } from '../../components/OrgLayout';
import { Loading, ErrorBox, Icon, StatusPill, Modal, Field, Empty, useToast } from '../../components/ui';
import { money, fds, today, addDays, CURRENCIES } from '../../lib/format';

export default function Invoices() {
  const { org, base } = useOrg();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [quick, setQuick] = useState(false);
  const cust = sp.get('customer') || '';
  const { data, loading, error, reload } = useLoad(async () => {
    const [inv, cs] = await Promise.all([
      supabase.from('invoice_summary').select('*').eq('org_id', org.id).order('issue_date', { ascending: false }).order('number', { ascending: false }),
      supabase.from('customers').select('id,name').eq('org_id', org.id).order('name'),
    ]);
    return { inv: must(inv), cs: must(cs) };
  }, [org.id]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const counts = { all: 0, draft: 0, sent: 0, partial: 0, overdue: 0, paid: 0, cancelled: 0 };
  data.inv.forEach((i) => { counts.all++; counts[i.display_status]++; });
  const ql = q.trim().toLowerCase();
  const rows = data.inv.filter((i) => (status === 'all' || i.display_status === status) && (!cust || i.customer_id === cust)
    && (!ql || `${i.number} ${i.customer_name} ${i.trip}`.toLowerCase().includes(ql)));
  const chip = (k, l) => <button key={k} className={`chip ${status === k ? 'on' : ''}`} onClick={() => setStatus(k)}>{l}<span>{counts[k]}</span></button>;

  return (
    <>
      <div className="pagehead">
        <div><h1>Invoices</h1><p className="sub">Every invoice, its instalments and how much is still to come in.</p></div>
        <div className="actions"><button className="btn" onClick={() => setQuick(true)}><Icon name="link" />Quick payment link</button><Link className="btn primary" to={`${base}/invoices/new`}><Icon name="plus" />New invoice</Link></div>
      </div>
      <section className="card">
        <div className="toolbar">
          <div className="chips">{chip('all', 'All')}{chip('overdue', 'Overdue')}{chip('partial', 'Partially paid')}{chip('sent', 'Awaiting payment')}{chip('paid', 'Paid')}{chip('draft', 'Drafts')}</div>
          <select className="in sm" id="f-cust" style={{ width: 'auto', maxWidth: 200 }} value={cust} onChange={(e) => setSp(e.target.value ? { customer: e.target.value } : {})}>
            <option value="">All customers</option>{data.cs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="in sm search" id="f-q" type="search" placeholder="Search invoice no., customer or trip" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {rows.length === 0 ? <Empty>{data.inv.length ? 'No invoices match these filters.' : 'No invoices yet. Create your first one.'}</Empty> : (
          <div className="tw"><table className="t"><thead><tr><th>Invoice</th><th>Customer & trip</th><th className="right">Total</th><th>Collected</th><th>Next due</th><th>Status</th></tr></thead><tbody>
            {rows.map((i) => {
              const pc = Number(i.total) ? Math.min(100, (i.paid / i.total) * 100) : 0;
              return (
                <tr key={i.id} className="click" onClick={() => nav(`${base}/invoices/${i.id}`)}>
                  <td><span className="mono">{i.number}</span><span className="l2">Issued {fds(i.issue_date)}</span></td>
                  <td><b>{i.customer_name}</b><span className="l2">{i.trip}</span></td>
                  <td className="right num"><b>{money(i.total, i.currency)}</b><span className="l2">{i.instalment_count} instalment{i.instalment_count > 1 ? 's' : ''}</span></td>
                  <td style={{ minWidth: 130 }}><div className="prog"><span style={{ width: `${pc}%` }} /></div><span className="l2 num">{money(i.paid, i.currency)}</span></td>
                  <td>{i.next_due_date && i.status === 'sent' ? <><span className="num">{money(i.next_due_amount, i.currency)}</span><span className="l2">{fds(i.next_due_date)} · {i.next_due_label}</span></> : <span className="muted">—</span>}</td>
                  <td><StatusPill s={i.display_status} /></td>
                </tr>
              );
            })}
          </tbody></table></div>
        )}
      </section>
      {quick && <QuickLinkModal onClose={() => setQuick(false)} />}
    </>
  );
}

export function QuickLinkModal({ onClose }) {
  const { org, base, refreshCounts } = useOrg();
  const nav = useNavigate();
  const toast = useToast();
  const { data: cs } = useLoad(async () => must(await supabase.from('customers').select('id,name,currency').eq('org_id', org.id).order('name')), [org.id]);
  const [f, setF] = useState({ customer_id: '', currency: 'USD', amount: '', purpose: '', due: addDays(today(), 3) });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function save() {
    const e = [];
    if (!f.customer_id) e.push('Choose a customer.'); if (!(Number(f.amount) > 0)) e.push('Enter an amount above zero.');
    if (!f.purpose.trim()) e.push('Say what it’s for.'); if (!f.due) e.push('Pick a due date.');
    if (e.length) { setErr(e.join(' ')); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc('create_invoice', { p: {
      org_id: org.id, customer_id: f.customer_id, currency: f.currency, trip: f.purpose.trim(), pax: 1, tax_pct: 0, send: true,
      lines: [{ description: f.purpose.trim(), qty: 1, rate: Number(f.amount) }], instalments: [{ label: 'Full payment', pct: 100, due_date: f.due }] } });
    if (error) { setErr(error.message); setBusy(false); return; }
    toast('Payment link created'); refreshCounts(); onClose(); nav(`${base}/invoices/${data}`);
  }
  return (
    <Modal title="Quick payment link" sub="Creates a one-instalment invoice with its own payment link." onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Creating…' : 'Create link'}</button></>}>
      <Field label="Customer" id="ql-cust"><select className="in" id="ql-cust" value={f.customer_id} onChange={(e) => { const c = cs?.find((x) => x.id === e.target.value); setF({ ...f, customer_id: e.target.value, currency: c?.currency || f.currency }); }}>
        <option value="">Choose a customer</option>{(cs || []).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.currency}</option>)}</select></Field>
      <div className="fgrid">
        <Field label="Currency" id="ql-cur"><select className="in" id="ql-cur" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Amount" id="ql-amt"><input className="in num" id="ql-amt" type="number" min="0" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
      </div>
      <Field label="What it’s for" id="ql-for"><input className="in" id="ql-for" placeholder="e.g. Houseboat upgrade, Alleppey" value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} /></Field>
      <Field label="Due date" id="ql-due"><input className="in" id="ql-due" type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
      {err && <div className="alert bad">{err}</div>}
    </Modal>
  );
}
