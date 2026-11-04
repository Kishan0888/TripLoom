import { useState } from 'react';
import { supabase, must } from '../../lib/supabase';
import { useLoad } from '../../lib/session';
import { useOrg } from '../../components/OrgLayout';
import { Loading, ErrorBox, SettlePill, Pill, Modal, Field, When, Empty, useToast } from '../../components/ui';
import { money, inr0, fd, fds, istDate, today, diffDays, r2 } from '../../lib/format';

export default function Reconciliation() {
  const { org, can, refreshCounts } = useOrg();
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const [logging, setLogging] = useState(null);
  const { data, loading, error, reload } = useLoad(async () => must(await supabase.from('payment_details').select('*').eq('org_id', org.id).order('paid_at')), [org.id]);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const pend = data.filter((p) => p.settlement_status !== 'credited');
  const done = data.filter((p) => p.settlement_status === 'credited').sort((a, b) => b.credit_date.localeCompare(a.credit_date));
  const late = pend.filter((p) => p.settlement_status === 'late');
  const variance = done.reduce((a, p) => a + (Number(p.credit_amount) - Number(p.net_inr)), 0);
  const canWrite = can(['owner', 'accounts']);

  return (
    <>
      <div className="pagehead"><div><h1>Reconciliation</h1><p className="sub">Match each gateway payout to the credit in your bank account, usually {org.settle_days} days after payment.</p></div></div>
      <div className="kpis">
        <div className="kpi loud"><span className="k">Awaiting credit</span><span className="v">{inr0(pend.reduce((a, p) => a + Number(p.net_inr), 0))}</span><span className="s">{pend.length} payouts</span></div>
        <div className="kpi"><span className="k"><i style={{ background: 'var(--bad)' }} />Credit late</span><span className="v">{late.length}</span><span className="s">Past T+{org.settle_days}. Check with your gateway.</span></div>
        <div className="kpi"><span className="k"><i style={{ background: 'var(--good)' }} />Reconciled</span><span className="v">{inr0(done.reduce((a, p) => a + Number(p.credit_amount), 0))}</span><span className="s">{done.length} credits logged</span></div>
        <div className="kpi"><span className="k">Net difference</span><span className="v" style={Math.abs(variance) >= 0.005 ? { color: 'var(--bad)' } : undefined}>{variance < 0 ? '−' : ''}{money(Math.abs(variance), 'INR')}</span><span className="s">Credited minus expected</span></div>
      </div>
      <section className="card">
        <div className="tabs"><button className={`tab ${tab === 'pending' ? 'on' : ''}`} onClick={() => setTab('pending')}>Awaiting bank credit ({pend.length})</button><button className={`tab ${tab === 'done' ? 'on' : ''}`} onClick={() => setTab('done')}>Reconciled ({done.length})</button></div>
        <div style={{ marginTop: 16 }}>
          {tab === 'pending' ? (pend.length === 0 ? <Empty>Every payment is matched to a bank credit.</Empty> : (
            <div className="tw"><table className="t"><thead><tr><th>Paid on</th><th>Customer & invoice</th><th>Gateway ref.</th><th className="right">Expected net</th><th>Expected by</th><th>Status</th><th /></tr></thead><tbody>
              {pend.map((p) => { const lateBy = diffDays(p.expected_credit_date, today()); return (
                <tr key={p.id}>
                  <td>{fds(istDate(p.paid_at))}</td>
                  <td><b>{p.customer_name}</b><span className="l2">{p.invoice_number} · {money(p.amount, p.currency)}</span></td>
                  <td className="mono">{p.tracking_id}</td>
                  <td className="right num"><b>{money(p.net_inr, 'INR')}</b></td>
                  <td>{fds(p.expected_credit_date)}<span className="l2">{p.settlement_status === 'late' ? <span className="when bad">{lateBy} day{lateBy === 1 ? '' : 's'} late</span> : <When due={p.expected_credit_date} />}</span></td>
                  <td><SettlePill s={p.settlement_status} /></td>
                  <td className="right">{canWrite && <button className="btn sm primary" onClick={() => setLogging(p)}>Log bank credit</button>}</td>
                </tr>); })}
            </tbody></table></div>)) : (done.length === 0 ? <Empty>No reconciled payments yet.</Empty> : (
            <div className="tw"><table className="t"><thead><tr><th>Credited on</th><th>Customer & invoice</th><th>UTR / bank ref.</th><th className="right">Expected</th><th className="right">Credited</th><th className="right">Difference</th></tr></thead><tbody>
              {done.map((p) => { const dv = r2(Number(p.credit_amount) - Number(p.net_inr)); return (
                <tr key={p.id}>
                  <td>{fds(p.credit_date)}<span className="l2">Paid {fds(istDate(p.paid_at))}</span></td>
                  <td><b>{p.customer_name}</b><span className="l2">{p.invoice_number}</span></td>
                  <td><span className="mono">{p.utr}</span>{p.credit_note && <span className="l2">{p.credit_note}</span>}</td>
                  <td className="right num">{money(p.net_inr, 'INR')}</td><td className="right num"><b>{money(p.credit_amount, 'INR')}</b></td>
                  <td className="right num">{Math.abs(dv) < 0.005 ? <Pill kind="ok">Matched</Pill> : <span style={{ color: 'var(--bad)', fontWeight: 600 }}>{dv > 0 ? '+' : '−'}{money(Math.abs(dv), 'INR')}</span>}</td>
                </tr>); })}
            </tbody></table></div>))}
        </div>
      </section>
      {logging && <CreditModal p={logging} onClose={() => setLogging(null)} onSaved={(amt, utr) => { setLogging(null); toast(`Reconciled ${money(amt, 'INR')} · ${utr}`); refreshCounts(); reload(); }} />}
    </>
  );
}

function CreditModal({ p, onClose, onSaved }) {
  const { org } = useOrg();
  const [f, setF] = useState({ date: today(), amt: Number(p.net_inr).toFixed(2), utr: '', note: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const dv = r2(Number(f.amt) - Number(p.net_inr));
  async function save() {
    const e = [];
    if (!f.date) e.push('Pick the credit date.'); if (!f.utr.trim()) e.push('Enter the UTR or bank reference from your statement.');
    if (!(Number(f.amt) > 0)) e.push('Enter the amount credited.'); if (f.date && f.date < istDate(p.paid_at)) e.push('Credit date cannot be before the payment date.');
    if (e.length) { setErr(e.join(' ')); return; }
    setBusy(true);
    const { error } = await supabase.from('bank_credits').insert({ org_id: org.id, payment_id: p.id, credit_date: f.date, utr: f.utr.trim(), amount: Number(f.amt), note: f.note.trim() || null });
    if (error) { setErr(error.message); setBusy(false); return; }
    await supabase.from('activity').insert({ org_id: org.id, invoice_id: p.invoice_id, text: `Bank credit of ${money(f.amt, 'INR')} logged · UTR ${f.utr.trim()}` });
    onSaved(Number(f.amt), f.utr.trim());
  }
  return (
    <Modal title="Log bank credit" sub={`${p.customer_name} · ${p.invoice_number}`} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Mark as reconciled'}</button></>}>
      <dl className="kv" style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 10 }}>
        <dt>Payment</dt><dd>{money(p.amount, p.currency)} on {fd(istDate(p.paid_at))}</dd><dt>Gateway ref.</dt><dd className="mono">{p.tracking_id}</dd><dt>Expected net</dt><dd className="num">{money(p.net_inr, 'INR')}</dd>
      </dl>
      <div className="fgrid">
        <Field label="Credit date" id="lc-date"><input className="in" id="lc-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Amount credited (₹)" id="lc-amt"><input className="in num" id="lc-amt" type="number" step="0.01" value={f.amt} onChange={(e) => setF({ ...f, amt: e.target.value })} /></Field>
        <Field label="UTR or bank reference" id="lc-utr" span><input className="in mono" id="lc-utr" placeholder="From your bank statement" value={f.utr} onChange={(e) => setF({ ...f, utr: e.target.value })} /></Field>
        <Field label="Note (optional)" id="lc-note" span><input className="in" id="lc-note" placeholder="e.g. bank charge deducted" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      </div>
      {Math.abs(dv) < 0.005 ? <div className="alert ok">Matches the expected amount.</div> : <div className="alert warn">{dv > 0 ? 'More' : 'Less'} than expected by {money(Math.abs(dv), 'INR')}. Add a note explaining the difference.</div>}
      {err && <div className="alert bad">{err}</div>}
    </Modal>
  );
}
