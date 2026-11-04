import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, must } from '../../lib/supabase';
import { useLoad, useSession } from '../../lib/session';
import { useOrg } from '../../components/OrgLayout';
import { Loading, ErrorBox, Icon, When, useToast } from '../../components/ui';
import { inr0, money, today, addDays, fd, fds, istDate, istTime } from '../../lib/format';
import { PayTable } from './Payments';
import { QuickLinkModal } from './Invoices';
import { CustomerModal } from './Customers';
import { remind } from './InvoiceDetail';

export default function Dashboard() {
  const { org, base } = useOrg();
  const { user } = useSession();
  const toast = useToast();
  const [range, setRange] = useState('30');
  const [modal, setModal] = useState(null);
  const t = today();
  const from = range === 'month' ? t.slice(0, 8) + '01' : range === 'fy' ? (Number(t.slice(5, 7)) >= 4 ? t.slice(0, 4) : String(Number(t.slice(0, 4)) - 1)) + '-04-01' : addDays(t, -30);

  const { data, loading, error, reload } = useLoad(async () => {
    const [inv, pays, fx, dues] = await Promise.all([
      supabase.from('invoice_summary').select('id,number,currency,total,due,issue_date,display_status,status,customer_name').eq('org_id', org.id).neq('status', 'draft'),
      supabase.from('payment_details').select('*').eq('org_id', org.id).order('paid_at', { ascending: false }),
      supabase.from('fx_rates').select('*'),
      supabase.from('instalment_status').select('*').eq('org_id', org.id).neq('status', 'paid').lte('due_date', addDays(t, 14)).order('due_date'),
    ]);
    const invs = must(inv);
    const byId = Object.fromEntries(invs.map((x) => [x.id, x]));
    const dueRows = must(dues).filter((d) => byId[d.invoice_id]?.status === 'sent')
      .map((d) => ({ ...d, invoices: { number: byId[d.invoice_id].number, customers: { name: byId[d.invoice_id].customer_name } } }));
    return { inv: invs, pays: must(pays), fx: Object.fromEntries(must(fx).map((r) => [r.currency, Number(r.rate_to_inr)])), dues: dueRows };
  }, [org.id]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const { inv, pays, fx, dues } = data;
  const rate = (c) => (c === 'INR' ? 1 : fx[c] || 1);
  const inRange = inv.filter((i) => i.issue_date >= from);
  const invoiced = inRange.reduce((a, i) => a + Number(i.total) * rate(i.currency), 0);
  const pr = pays.filter((p) => istDate(p.paid_at) >= from);
  const collected = pr.reduce((a, p) => a + Number(p.inr_amount), 0);
  const outstanding = inv.reduce((a, i) => a + Math.max(0, Number(i.due)) * rate(i.currency), 0);
  const overdueN = inv.filter((i) => i.display_status === 'overdue').length;
  const unrec = pays.filter((p) => p.settlement_status !== 'credited');
  const awaiting = unrec.reduce((a, p) => a + Number(p.net_inr), 0);
  const lateN = unrec.filter((p) => p.settlement_status === 'late').length;
  const hr = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(new Date()));
  const first = (user?.user_metadata?.full_name || '').split(' ')[0];

  return (
    <>
      <div className="pagehead">
        <div><span className="eyebrow">{fd(t)}</span><h1>{hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'}{first ? `, ${first}` : ''}</h1></div>
        <div className="actions"><select className="in" id="d-range" style={{ width: 'auto' }} value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="30">Last 30 days</option><option value="month">This month</option><option value="fy">This financial year</option></select></div>
      </div>
      <div className="quick">
        <Link className="btn primary" to={`${base}/invoices/new`}><Icon name="plus" />New invoice</Link>
        <button className="btn" onClick={() => setModal('quick')}><Icon name="link" />Quick payment link</button>
        <button className="btn" onClick={() => setModal('cust')}><Icon name="users" />Add customer</button>
        <Link className="btn" to={`${base}/reconciliation`}><Icon name="bank" />Log bank credit</Link>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="k"><i style={{ background: 'var(--brand)' }} />Invoiced</span><span className="v">{inr0(invoiced)}</span><span className="s">{inRange.length} invoices raised · INR equivalent</span></div>
        <div className="kpi"><span className="k"><i style={{ background: 'var(--good)' }} />Collected</span><span className="v">{inr0(collected)}</span><span className="s">{pr.length} payments captured</span></div>
        <div className="kpi"><span className="k"><i style={{ background: 'var(--bad)' }} />Outstanding</span><span className="v">{inr0(outstanding)}</span><span className="s">{overdueN > 0 && <><b>{overdueN} overdue</b> · </>}across all open invoices</span></div>
        <div className="kpi loud"><span className="k"><i style={{ background: 'var(--thread)' }} />Awaiting bank credit</span><span className="v">{inr0(awaiting)}</span><span className="s">{unrec.length} payouts to match{lateN ? ` · ${lateN} late` : ''}</span></div>
      </div>
      <div className="grid2">
        <section className="card"><div className="card-h"><div><h2>Collections by month</h2><p>Gross INR received through CCAvenue</p></div></div><div className="chart"><BarChart pays={pays} /></div></section>
        <section className="card"><div className="card-h"><div><h2>Due in the next 14 days</h2><p>Including anything overdue</p></div></div>
          <div className="rowlist">
            {dues.length === 0 ? <div className="empty">Nothing due in the next two weeks.</div> : dues.slice(0, 6).map((d) => (
              <div className="r" key={d.id}>
                <div className="grow"><b>{d.invoices?.customers?.name}</b><span>{d.label} · <Link className="link" to={`${base}/invoices/${d.invoice_id}`}>{d.invoices?.number}</Link></span></div>
                <div className="right"><div className="num" style={{ fontWeight: 600 }}>{money(d.remaining, inv.find((i) => i.id === d.invoice_id)?.currency || 'USD')}</div><When due={d.due_date} /></div>
                <button className="btn sm" title="Email a reminder" onClick={() => remind(org.id, d.invoice_id, d.invoices?.customers?.name, toast)}><Icon name="bell" /></button>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="card"><div className="card-h"><div><h2>Recent payments</h2><p>Captured on CCAvenue, newest first</p></div><Link className="btn sm" to={`${base}/payments`}>View all</Link></div>
        <PayTable rows={pays.slice(0, 5)} base={base} /></section>
      {modal === 'quick' && <QuickLinkModal onClose={() => setModal(null)} />}
      {modal === 'cust' && <CustomerModal onClose={() => setModal(null)} onSaved={() => { setModal(null); toast('Customer added'); }} />}
    </>
  );
}

function BarChart({ pays }) {
  const t = today();
  const months = [];
  for (let k = 5; k >= 0; k--) {
    const d = new Date(t.slice(0, 7) + '-01T00:00:00'); d.setMonth(d.getMonth() - k);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, m: d.toLocaleDateString('en-GB', { month: 'short' }), v: 0, cur: k === 0 });
  }
  pays.forEach((p) => { const k = istDate(p.paid_at).slice(0, 7); const m = months.find((x) => x.key === k); if (m) m.v += Number(p.inr_amount); });
  const W = 560, H = 220, L = 44, B = 28, T = 18, R = 8;
  const max = Math.max(...months.map((x) => x.v), 1);
  const step = max > 2e6 ? 1e6 : max > 4e5 ? 2e5 : 1e5;
  const top = Math.ceil(max / step) * step;
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const bw = (W - L - R) / months.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monthly collections in lakh rupees">
      {[0, top / 2, top].map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={L - 8} y={y(v) + 4} textAnchor="end">₹{(v / 1e5).toFixed(v % 1e5 ? 1 : 0)}L</text></g>)}
      {months.map((x, k) => {
        const cx = L + bw * k + bw / 2, w = Math.min(46, bw * 0.56);
        return (
          <g key={x.key}>
            <rect x={cx - w / 2} y={y(x.v)} width={w} height={Math.max(H - B - y(x.v), 1)} rx="4" fill={x.cur ? 'var(--thread)' : 'var(--brand)'} opacity={x.cur ? 1 : 0.85} />
            <text x={cx} y={y(x.v) - 6} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontWeight: 600 }}>{(x.v / 1e5).toFixed(1)}L</text>
            <text x={cx} y={H - 8} textAnchor="middle">{x.m}{x.cur ? ' (MTD)' : ''}</text>
          </g>
        );
      })}
    </svg>
  );
}
export { istTime, fds };
