import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, must } from '../../lib/supabase';
import { useLoad } from '../../lib/session';
import { useOrg } from '../../components/OrgLayout';
import { Loading, ErrorBox, SettlePill, Empty } from '../../components/ui';
import { money, inr0, fds, istDate, istTime } from '../../lib/format';

export function PayTable({ rows, base, onInvoice }) {
  if (!rows.length) return <Empty>No payments in this view.</Empty>;
  return (
    <div className="tw"><table className="t"><thead><tr><th>Date</th>{!onInvoice && <th>Customer & invoice</th>}<th>CCAvenue ref.</th><th className="right">Amount paid</th><th className="right">INR gross</th><th className="right">Fee</th><th className="right">Net to bank</th><th>Settlement</th></tr></thead><tbody>
      {rows.map((p) => (
        <tr key={p.id}>
          <td>{fds(istDate(p.paid_at))}<span className="l2">{istTime(p.paid_at)}</span></td>
          {!onInvoice && <td><b>{p.customer_name}</b><span className="l2"><Link className="link" to={`${base}/invoices/${p.invoice_id}`}>{p.invoice_number}</Link></span></td>}
          <td><span className="mono">{p.tracking_id || '—'}</span><span className="l2">{p.method}</span></td>
          <td className="right num"><b>{money(p.amount, p.currency)}</b>{p.currency !== 'INR' && <span className="l2">@ {Number(p.fx_rate)}</span>}</td>
          <td className="right num">{money(p.inr_amount, 'INR')}</td>
          <td className="right num muted">−{money(p.fee_inr, 'INR')}</td>
          <td className="right num"><b>{money(p.net_inr, 'INR')}</b></td>
          <td><SettlePill s={p.settlement_status} /></td>
        </tr>
      ))}
    </tbody></table></div>
  );
}

export default function Payments() {
  const { org, base } = useOrg();
  const [f, setF] = useState('all');
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useLoad(async () => must(await supabase.from('payment_details').select('*').eq('org_id', org.id).order('paid_at', { ascending: false })), [org.id]);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const rows = data.filter((p) => (f === 'all' || (f === 'awaiting' ? p.settlement_status !== 'credited' : p.settlement_status === 'credited'))
    && (!q || `${p.customer_name} ${p.invoice_number} ${p.tracking_id}`.toLowerCase().includes(q.toLowerCase())));
  const g = rows.reduce((a, p) => a + Number(p.inr_amount), 0), fe = rows.reduce((a, p) => a + Number(p.fee_inr), 0);
  const chip = (k, l) => <button className={`chip ${f === k ? 'on' : ''}`} onClick={() => setF(k)}>{l}</button>;
  return (
    <>
      <div className="pagehead"><div><h1>Payments</h1><p className="sub">Every payment captured on your CCAvenue account, converted to INR.</p></div></div>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
        <div className="kpi"><span className="k">Gross received</span><span className="v">{inr0(g)}</span><span className="s">{rows.length} payments in view</span></div>
        <div className="kpi"><span className="k">Gateway fees</span><span className="v">{inr0(fe)}</span><span className="s">{Number(org.fee_pct)}% + {Number(org.fee_gst)}% GST (from settings)</span></div>
        <div className="kpi"><span className="k">Net to bank</span><span className="v">{inr0(g - fe)}</span><span className="s">Expected T+{org.settle_days} from payment</span></div>
      </div>
      <section className="card">
        <div className="toolbar"><div className="chips">{chip('all', 'All payments')}{chip('awaiting', 'Awaiting bank credit')}{chip('credited', 'Bank credited')}</div>
          <input className="in sm search" type="search" placeholder="Search customer, invoice or reference" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <PayTable rows={rows} base={base} />
      </section>
    </>
  );
}
