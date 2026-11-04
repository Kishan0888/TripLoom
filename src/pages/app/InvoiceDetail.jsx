import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase, must } from '../../lib/supabase';
import { useLoad } from '../../lib/session';
import { useOrg } from '../../components/OrgLayout';
import { Loading, ErrorBox, Icon, StatusPill, InstPill, When, Modal, Field, useToast, copyText } from '../../components/ui';
import { OrgLogo } from '../../components/LogoUpload';
import { money, fd, fds, payLink, istDate, today } from '../../lib/format';
import { PayTable } from './Payments';

// Logs a reminder. Email delivery is wired up in the next phase (transactional email provider).
export async function remind(orgId, invoiceId, name, toast) {
  const { error } = await supabase.from('activity').insert({ org_id: orgId, invoice_id: invoiceId, text: 'Payment reminder sent to customer' });
  toast(error ? error.message : `Reminder logged for ${name}`);
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const { org, base, refreshCounts, can } = useOrg();
  const nav = useNavigate();
  const [recording, setRecording] = useState(false);
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);
  const { data, loading, error, reload } = useLoad(async () => {
    const [inv, inst, lines, pays, act, cust] = await Promise.all([
      supabase.from('invoice_summary').select('*').eq('id', id).single(),
      supabase.from('instalment_status').select('*').eq('invoice_id', id).order('position'),
      supabase.from('invoice_lines').select('*').eq('invoice_id', id).order('position'),
      supabase.from('payment_details').select('*').eq('invoice_id', id).order('paid_at'),
      supabase.from('activity').select('*').eq('invoice_id', id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('customers(*)').eq('id', id).single(),
    ]);
    return { inv: must(inv), inst: must(inst), lines: must(lines), pays: must(pays), act: must(act), cust: must(cust).customers };
  }, [id]);

  if (loading && !data) return <Loading />;
  if (error) return <><Link className="crumb" to={`${base}/invoices`}>← Invoices</Link><ErrorBox error={{ message: 'This invoice could not be found.' }} /></>;
  const { inv: i, inst, lines, pays, act, cust: c } = data;
  const pc = Number(i.total) ? Math.min(100, (i.paid / i.total) * 100) : 0;
  const link = payLink(i.public_token);
  const events = [...act.map((a) => ({ date: a.created_at, text: a.text }))];
  pays.forEach((p) => { if (p.credit_date) events.push({ date: p.credit_date + 'T12:00:00+05:30', text: `Bank credit of ${money(p.credit_amount, 'INR')} logged · UTR ${p.utr}` }); });
  if (!act.some((a) => /captured/i.test(a.text))) pays.forEach((p) => events.push({ date: p.paid_at, text: `Payment of ${money(p.amount, p.currency)} captured (${p.method})` }));
  events.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  async function act2(kind) {
    if (kind === 'send') {
      const { error: e } = await supabase.from('invoices').update({ status: 'sent', issue_date: new Date().toISOString().slice(0, 10) }).eq('id', i.id);
      if (!e) await supabase.from('activity').insert({ org_id: org.id, invoice_id: i.id, text: 'Invoice sent to customer' });
      toast(e ? e.message : 'Invoice sent. Share the payment link with your customer.');
    } else if (kind === 'delete') {
      const { error: e } = await supabase.from('invoices').delete().eq('id', i.id);
      if (e) { toast(e.message); return; } toast('Draft deleted'); nav(`${base}/invoices`); return;
    } else if (kind === 'cancel') {
      const { error: e } = await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', i.id);
      if (!e) await supabase.from('activity').insert({ org_id: org.id, invoice_id: i.id, text: 'Invoice cancelled. Payment link disabled.' });
      toast(e ? e.message : 'Invoice cancelled');
    }
    setConfirm(null); refreshCounts(); reload();
  }

  return (
    <>
      <div className="pagehead">
        <div><Link className="crumb" to={`${base}/invoices`}>← Invoices</Link>
          <div className="dhead"><h1 style={{ fontSize: 24 }}>{i.number}</h1><StatusPill s={i.display_status} /></div>
          <p className="sub">{i.customer_name} · {i.trip}</p></div>
        <div className="actions">
          <Link className="btn" to={`${base}/invoices/${i.id}/print?print=1`} target="_blank"><Icon name="inv" />Download PDF</Link>
          {i.status === 'draft' && <><button className="btn danger" onClick={() => setConfirm('delete')}>Delete draft</button><button className="btn primary" onClick={() => act2('send')}>Send invoice</button></>}
          {i.status === 'sent' && <>
            {i.display_status !== 'paid' && <><button className="btn" onClick={() => remind(org.id, i.id, i.customer_name, toast).then(reload)}><Icon name="bell" />Send reminder</button>
              <button className="btn" onClick={() => copyText(link, toast)}><Icon name="link" />Copy payment link</button></>}
            {i.display_status !== 'paid' && can(['owner', 'accounts']) && <button className="btn" onClick={() => setRecording(true)}>Record payment</button>}
            {Number(i.paid) === 0 && <button className="btn ghost" onClick={() => setConfirm('cancel')}>Cancel invoice</button>}
            <a className="btn primary" href={link} target="_blank" rel="noreferrer"><Icon name="eye" />Customer view</a>
          </>}
        </div>
      </div>
      <div className="grid2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {org.logo_url ? <OrgLogo org={org} size={48} /> : <b style={{ fontFamily: 'var(--f-display)', fontSize: 18 }}>{org.name}</b>}
                <span className="muted" style={{ fontSize: 12.5 }}>{[org.address, org.gstin && `GSTIN ${org.gstin}`].filter(Boolean).join(' · ')}</span>
              </div>
              <div style={{ textAlign: 'right' }}><span className="eyebrow">Invoice</span><div className="mono" style={{ fontSize: 14 }}>{i.number}</div><span className="muted" style={{ fontSize: 12.5 }}>Issued {fd(i.issue_date)}</span></div>
            </div>
            <div className="amounts"><div><span>Invoice total</span><b>{money(i.total, i.currency)}</b></div><div><span>Collected</span><b style={{ color: 'var(--good)' }}>{money(i.paid, i.currency)}</b></div><div><span>Balance</span><b>{money(Math.max(0, i.due), i.currency)}</b></div></div>
            <div className="prog" style={{ marginTop: 14, height: 8 }}><span style={{ width: `${pc}%` }} /></div>
          </section>
          <section className="card"><div className="card-h"><div><h2>Instalments</h2><p>Paid amounts are applied to instalments in order.</p></div></div>
            <div className="tw"><table className="t"><thead><tr><th>Instalment</th><th>Due</th><th className="right">Amount</th><th className="right">Paid</th><th>Status</th></tr></thead><tbody>
              {inst.map((s) => <tr key={s.id}><td><b>{s.label}</b><span className="l2">{Number(s.pct)}% of total</span></td><td>{fd(s.due_date)}{s.status !== 'paid' && i.status === 'sent' && <span className="l2"><When due={s.due_date} /></span>}</td>
                <td className="right num">{money(s.amount, i.currency)}</td><td className="right num">{money(s.paid_amount, i.currency)}</td><td><InstPill s={s.status} /></td></tr>)}
            </tbody></table></div>
          </section>
          <section className="card"><div className="card-h"><h2>Services</h2></div>
            <div className="tw"><table className="t"><thead><tr><th>Description</th><th className="right">Qty</th><th className="right">Rate</th><th className="right">Amount</th></tr></thead><tbody>
              {lines.map((l) => <tr key={l.id}><td>{l.description}</td><td className="right num">{Number(l.qty)}</td><td className="right num">{money(l.rate, i.currency)}</td><td className="right num">{money(l.qty * l.rate, i.currency)}</td></tr>)}
            </tbody><tfoot>
              {Number(i.tax) > 0 && <tr><td colSpan={3} className="right">Tax ({Number(i.tax_pct)}%)</td><td className="right num">{money(i.tax, i.currency)}</td></tr>}
              <tr><td colSpan={3} className="right">Total</td><td className="right num">{money(i.total, i.currency)}</td></tr></tfoot></table></div>
          </section>
          <section className="card"><div className="card-h"><div><h2>Payments on this invoice</h2><p>INR settled after conversion and gateway fees</p></div></div>
            {pays.length ? <PayTable rows={pays} base={base} onInvoice /> : <div className="empty">No payments yet.</div>}</section>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Customer</h2>
            <dl className="kv"><dt>Name</dt><dd>{c.name}</dd><dt>Email</dt><dd>{c.email}</dd><dt>Phone</dt><dd>{c.phone || '—'}</dd><dt>Country</dt><dd>{c.country || '—'}</dd></dl>
            <h2 style={{ margin: '18px 0 12px' }}>Trip</h2>
            <dl className="kv"><dt>Trip</dt><dd>{i.trip}</dd><dt>Travel</dt><dd>{fd(i.travel_date)}</dd><dt>Travellers</dt><dd>{i.pax}</dd><dt>Issued</dt><dd>{fd(i.issue_date)}</dd></dl>
          </section>
          {i.status === 'sent' && (
            <section className="card"><h2 style={{ marginBottom: 12 }}>Payment link</h2>
              <div className="copyrow"><input className="in" id="d-link" readOnly value={link} /><button className="btn" onClick={() => copyText(link, toast)}>Copy</button></div>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Opens the next unpaid instalment. Your customer can also pay the full balance.</p></section>
          )}
          <section className="card"><h2 style={{ marginBottom: 14 }}>Activity</h2>
            <div className="timeline">{events.map((e, k) => <div className="ev" key={k}><time>{fds(istDate(e.date))}</time><span>{e.text}</span></div>)}</div></section>
        </div>
      </div>
      {recording && <RecordPayment inv={i} onClose={() => setRecording(false)} onSaved={(m) => { setRecording(false); toast(m); refreshCounts(); reload(); }} />}
      {confirm && (
        <Modal title={confirm === 'delete' ? 'Delete this draft?' : 'Cancel this invoice?'} onClose={() => setConfirm(null)}
          footer={<><button className="btn ghost" onClick={() => setConfirm(null)}>Keep it</button><button className="btn primary" onClick={() => act2(confirm)}>{confirm === 'delete' ? 'Delete draft' : 'Cancel invoice'}</button></>}>
          <p>{confirm === 'delete' ? 'The draft and its services are removed permanently.' : 'The payment link stops working. The invoice stays in your records as cancelled.'}</p>
        </Modal>
      )}
    </>
  );
}

function RecordPayment({ inv, onClose, onSaved }) {
  const [f, setF] = useState({ amount: Number(inv.next_due_amount ?? inv.due).toFixed(2), date: today(), method: 'Bank transfer', reference: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!(Number(f.amount) > 0) || Number(f.amount) > Number(inv.due) + 0.005) { setErr(`Enter an amount up to the balance of ${money(inv.due, inv.currency)}.`); return; }
    setBusy(true);
    const { error } = await supabase.rpc('record_manual_payment', { p_invoice: inv.id, p_amount: Number(f.amount), p_paid_on: f.date, p_method: f.method, p_reference: f.reference.trim() });
    if (error) { setErr(error.message); setBusy(false); return; }
    onSaved(`${money(f.amount, inv.currency)} recorded`);
  }
  return (
    <Modal title="Record a payment" sub={`${inv.number} · balance ${money(inv.due, inv.currency)}`} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Record payment'}</button></>}>
      <p className="muted" style={{ fontSize: 13 }}>For money received outside the payment link: a bank transfer, cash, or a custom gateway without a webhook.</p>
      <div className="fgrid">
        <Field label={`Amount (${inv.currency})`} id="rp-amt"><input className="in num" id="rp-amt" type="number" step="0.01" min="0" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Received on" id="rp-date"><input className="in" id="rp-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Method" id="rp-method"><select className="in" id="rp-method" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
          {['Bank transfer', 'UPI', 'Cash', 'Cheque', 'Card machine', 'Other gateway'].map((m) => <option key={m}>{m}</option>)}</select></Field>
        <Field label="Reference (optional)" id="rp-ref"><input className="in mono" id="rp-ref" placeholder="UTR, cheque no. or transaction ID" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
      </div>
      {err && <div className="alert bad">{err}</div>}
    </Modal>
  );
}
