import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase, FUNCTIONS_URL } from '../../lib/supabase';
import { useLoad } from '../../lib/session';
import { Loading, Thread, Icon, Modal, When } from '../../components/ui';
import { money, fd, initials } from '../../lib/format';

export default function Pay() {
  const { token } = useParams();
  const [sp, setSp] = useSearchParams();
  const [mode, setMode] = useState('next');
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(null);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const { data, loading, reload } = useLoad(async () => {
    const { data: d, error } = await supabase.rpc('get_public_invoice', { p_token: token });
    if (error) throw error; return d;
  }, [token]);

  const back = sp.get('status');
  if (loading && !data) return <div className="co" style={{ justifyContent: 'center' }}><Loading label="Loading your invoice" /></div>;
  if (!data) return <Shell><div className="cobody" style={{ textAlign: 'center' }}><h2>This payment link isn’t active</h2><p className="sub">It may have been cancelled or replaced. Please contact the tour operator who sent it.</p></div></Shell>;

  const { invoice: i, org, lines, instalments } = data;
  const next = instalments.find((s) => s.status !== 'paid');
  const unpaidCount = instalments.filter((s) => s.status !== 'paid').length;
  const amt = mode === 'full' ? Number(i.due) : Number(next?.remaining ?? i.due);

  async function pay() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`${FUNCTIONS_URL}/ccavenue/initiate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, mode }) });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || 'Could not start the payment.');
      if (j.demo) { setDemo(amt); setBusy(false); return; }
      // Hand off to CCAvenue's hosted payment page.
      const form = document.createElement('form');
      form.method = 'POST'; form.action = j.action;
      [['encRequest', j.encRequest], ['access_code', j.access_code]].forEach(([n, v]) => { const el = document.createElement('input'); el.type = 'hidden'; el.name = n; el.value = v; form.appendChild(el); });
      document.body.appendChild(form); form.submit();
    } catch (e) { setErr(e.message); setBusy(false); }
  }
  async function demoOutcome(success) {
    const { data: r, error } = await supabase.rpc('demo_pay', { p_token: token, p_mode: mode, p_success: success });
    setDemo(null);
    if (error) { setErr(error.message); return; }
    if (!r.ok) { setErr(r.message); return; }
    setResult(r); reload();
  }

  const success = result || back === 'success';
  return (
    <Shell org={org}>
      {success ? (
        <div className="cobody" style={{ textAlign: 'center', alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--good-soft)', color: 'var(--good)', display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 700 }}>✓</div>
          <h2 style={{ fontSize: 22 }}>Payment received</h2>
          <p className="sub">{result ? `${money(result.amount, result.currency)} paid. ` : ''}Thank you. {org.name} has been notified.</p>
          <dl className="kv" style={{ textAlign: 'left', width: '100%', background: 'var(--surface-2)', padding: 14, borderRadius: 10 }}>
            {result && <><dt>Reference</dt><dd className="mono">{result.order_id}</dd></>}
            <dt>Invoice</dt><dd>{i.number}</dd><dt>Balance left</dt><dd>{money(Math.max(0, i.due), i.currency)}</dd>
          </dl>
          <button className="btn" onClick={() => { setResult(null); setSp({}); }}>Done</button>
        </div>
      ) : Number(i.due) <= 0.005 ? (
        <div className="cobody" style={{ textAlign: 'center' }}><h2 style={{ fontSize: 22 }}>This invoice is paid in full</h2><p className="sub">Thank you. Nothing more is due on {i.number}.</p></div>
      ) : (
        <div className="cobody">
          {(back === 'failed' || back === 'cancelled') && <div className="alert bad">{back === 'cancelled' ? 'The payment was cancelled. You have not been charged.' : 'The payment didn’t go through. Please try again or use another card.'}</div>}
          <div><span className="eyebrow">Invoice {i.number}</span><h2 style={{ fontSize: 20, marginTop: 4 }}>{i.trip}</h2>
            <p className="sub">For {i.customer_name} · {i.pax} traveller{i.pax > 1 ? 's' : ''}{i.travel_date ? ` · starts ${fd(i.travel_date)}` : ''}</p></div>
          <div className="due-now"><span className="sub" style={{ fontSize: 13 }}>You’re paying</span><div className="big">{money(amt, i.currency)}</div>
            {next?.status === 'overdue' && mode !== 'full' && <When due={next.due_date} />}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {next && <label className={`opt ${mode === 'next' ? 'on' : ''}`}><input type="radio" name="co" id="co-next" checked={mode === 'next'} onChange={() => setMode('next')} />
              <div className="grow"><b>{next.label}</b><div className="muted" style={{ fontSize: 12.5 }}>Due {fd(next.due_date)}</div></div><span className="num" style={{ fontWeight: 600 }}>{money(next.remaining, i.currency)}</span></label>}
            {unpaidCount > 1 && <label className={`opt ${mode === 'full' ? 'on' : ''}`}><input type="radio" name="co" id="co-full" checked={mode === 'full'} onChange={() => setMode('full')} />
              <div className="grow"><b>Full balance</b><div className="muted" style={{ fontSize: 12.5 }}>Settle everything now</div></div><span className="num" style={{ fontWeight: 600 }}>{money(i.due, i.currency)}</span></label>}
          </div>
          <div><span className="eyebrow">Payment plan</span><div style={{ marginTop: 8 }}>
            <Thread currency={i.currency} money={money} items={instalments.map((s) => ({ label: s.label, amount: s.amount, status: s.status, sub: s.status === 'paid' ? 'Paid' : `Due ${fd(s.due_date)}` }))} /></div></div>
          <details><summary className="link" style={{ cursor: 'pointer' }}>What’s included</summary>
            <div className="tw" style={{ marginTop: 10 }}><table className="t"><tbody>{lines.map((l, k) => <tr key={k}><td>{l.description}</td><td className="right num">{Number(l.qty)} × {money(l.rate, i.currency)}</td></tr>)}</tbody>
              <tfoot><tr><td>Total{Number(i.tax) > 0 ? ` incl. ${Number(i.tax_pct)}% tax` : ''}</td><td className="right num">{money(i.total, i.currency)}</td></tr></tfoot></table></div></details>
          {i.notes && <p className="sub" style={{ fontSize: 13 }}>{i.notes}</p>}
          {err && <div className="alert bad">{err}</div>}
          <button className="btn primary paybtn" onClick={pay} disabled={busy}><Icon name="lock" />{busy ? 'Connecting to CCAvenue…' : `Pay ${money(amt, i.currency)} securely`}</button>
          <p className="muted" style={{ fontSize: 12, textAlign: 'center' }}>Cards, net banking, UPI and wallets via CCAvenue. Your card details are never shared with {org.name}.</p>
        </div>
      )}
      {demo !== null && (
        <Modal title="Demo checkout" onClose={() => setDemo(null)}
          footer={<><button className="btn danger" onClick={() => demoOutcome(false)}>Payment fails</button><button className="btn primary" onClick={() => demoOutcome(true)}>Payment succeeds</button></>}>
          <div className="alert info">This operator is in demo mode, so no card is charged. In live mode this step opens CCAvenue’s secure payment page.</div>
          <dl className="kv"><dt>Amount</dt><dd className="num">{money(demo, i.currency)}</dd><dt>Invoice</dt><dd>{i.number}</dd></dl>
        </Modal>
      )}
    </Shell>
  );
}

function Shell({ org, children }) {
  return (
    <div className="co" style={{ paddingTop: 32 }}>
      <div className="cocard">
        {org && <div className="cohead"><span className="oplogo">{initials(org.name)}</span><div><b style={{ fontSize: 15 }}>{org.name}</b>{org.email && <div className="muted" style={{ fontSize: 12.5 }}>{org.email}</div>}</div></div>}
        {children}
      </div>
      <div className="cofoot"><span>Payments processed by CCAvenue</span><span>Powered by TripLoom Payments</span></div>
    </div>
  );
}
