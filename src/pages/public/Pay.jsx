import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useLoad } from '../../lib/session';
import { Loading, Thread, Icon, Modal, When } from '../../components/ui';
import { OrgLogo } from '../../components/LogoUpload';
import { money, fd } from '../../lib/format';
import { GATEWAY_FN, GatewayMark, PROVIDERS, loadScript } from '../../lib/gateways';

export default function Pay() {
  const { token } = useParams();
  const [sp, setSp] = useSearchParams();
  const [mode, setMode] = useState('next');
  const [gw, setGw] = useState(null);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(null);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const { data, loading, reload } = useLoad(async () => {
    const { data: d, error } = await supabase.rpc('get_public_invoice', { p_token: token });
    if (error) throw error; return d;
  }, [token]);
  useEffect(() => { if (data?.gateways?.length && !gw) setGw(data.gateways[0].id); }, [data, gw]);

  const back = sp.get('status');
  if (loading && !data) return <div className="co" style={{ justifyContent: 'center' }}><Loading label="Loading your invoice" /></div>;
  if (!data) return <Shell><div className="cobody" style={{ textAlign: 'center' }}><h2>This payment link isn’t active</h2><p className="sub">It may have been cancelled or replaced. Please contact the tour operator who sent it.</p></div></Shell>;

  const { invoice: i, org, lines, instalments, gateways } = data;
  const next = instalments.find((s) => s.status !== 'paid');
  const unpaidCount = instalments.filter((s) => s.status !== 'paid').length;
  const amt = mode === 'full' ? Number(i.due) : Number(next?.remaining ?? i.due);
  const isDemo = org.payment_mode === 'demo';
  const noGateway = !isDemo && gateways.length === 0;
  const chosen = gateways.find((g) => g.id === gw);

  async function pay() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`${GATEWAY_FN}/initiate`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, mode, gateway_id: gw, origin: window.location.origin }) });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || 'Could not start the payment.');
      if (j.demo) { setDemo(amt); setBusy(false); return; }
      if (j.type === 'redirect') { window.location.href = j.url; return; }
      if (j.type === 'form') {
        const form = document.createElement('form'); form.method = 'POST'; form.action = j.action;
        Object.entries(j.fields).forEach(([n, v]) => { const el = document.createElement('input'); el.type = 'hidden'; el.name = n; el.value = v ?? ''; form.appendChild(el); });
        document.body.appendChild(form); form.submit(); return;
      }
      if (j.type === 'cashfree') {
        await loadScript('https://sdk.cashfree.com/js/v3/cashfree.js');
        window.Cashfree({ mode: j.mode }).checkout({ paymentSessionId: j.payment_session_id, redirectTarget: '_self' }); return;
      }
      if (j.type === 'razorpay') {
        await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        const rzp = new window.Razorpay({
          key: j.key_id, order_id: j.rzp_order_id, amount: j.amount, currency: j.currency, name: j.name, description: j.description, image: j.image, prefill: j.prefill,
          theme: { color: '#26357A' },
          handler: async (r) => {
            const v = await fetch(`${GATEWAY_FN}/verify/razorpay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...r, order: j.order }) });
            const vj = await v.json();
            if (!v.ok || vj.error) { setErr(vj.error || 'We couldn’t confirm the payment.'); setBusy(false); return; }
            window.location.href = vj.redirect;
          },
          modal: { ondismiss: () => setBusy(false) },
        });
        rzp.on('payment.failed', (r) => { setErr(r.error?.description || 'The payment failed. Please try again.'); setBusy(false); });
        rzp.open(); return;
      }
      throw new Error('This payment option is not supported.');
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
          <div style={{ display: 'flex', gap: 8 }}><a className="btn" href={`/p/${token}/invoice?print=1`} target="_blank" rel="noreferrer">Download invoice (PDF)</a><button className="btn primary" onClick={() => { setResult(null); setSp({}); }}>Done</button></div>
        </div>
      ) : back === 'pending' ? (
        <div className="cobody" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 22 }}>Thanks, we’re confirming your payment</h2>
          <p className="sub">{org.name} will update this invoice as soon as the payment is confirmed. You can close this page.</p>
          <button className="btn" style={{ alignSelf: 'center' }} onClick={() => { setSp({}); reload(); }}>Back to invoice</button>
        </div>
      ) : Number(i.due) <= 0.005 ? (
        <div className="cobody" style={{ textAlign: 'center' }}><h2 style={{ fontSize: 22 }}>This invoice is paid in full</h2><p className="sub">Thank you. Nothing more is due on {i.number}.</p>
          <a className="btn" style={{ alignSelf: 'center' }} href={`/p/${token}/invoice?print=1`} target="_blank" rel="noreferrer">Download invoice (PDF)</a></div>
      ) : (
        <div className="cobody">
          {(back === 'failed' || back === 'cancelled') && <div className="alert bad">{back === 'cancelled' ? 'The payment was cancelled. You have not been charged.' : 'The payment didn’t go through. Please try again or choose another option.'}</div>}
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
          <a className="link" style={{ alignSelf: 'flex-start' }} href={`/p/${token}/invoice?print=1`} target="_blank" rel="noreferrer">Download invoice (PDF)</a>

          {!isDemo && gateways.length > 1 && (
            <div><span className="eyebrow">Pay with</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {gateways.map((g) => (
                  <label key={g.id} className={`opt ${gw === g.id ? 'on' : ''}`}>
                    <input type="radio" name="gw" id={`gw-${g.id}`} checked={gw === g.id} onChange={() => setGw(g.id)} />
                    <GatewayMark provider={g.provider} size={30} />
                    <div className="grow"><b>{g.label}</b><div className="muted" style={{ fontSize: 12.5 }}>{PROVIDERS[g.provider]?.blurb.split('.')[0]}</div></div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {err && <div className="alert bad">{err}</div>}
          {noGateway ? (
            <div className="alert warn">Online payment isn’t available for {i.currency} invoices yet. Please contact {org.name}{org.email ? ` at ${org.email}` : ''} to arrange payment.</div>
          ) : (
            <button className="btn primary paybtn" onClick={pay} disabled={busy}><Icon name="lock" />{busy ? 'Opening secure payment…' : `Pay ${money(amt, i.currency)} securely`}</button>
          )}
          <p className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
            {isDemo ? 'Demo checkout: no card will be charged.' : `Processed securely by ${chosen ? PROVIDERS[chosen.provider]?.name ?? chosen.label : 'the payment provider'}. Your card details are never shared with ${org.name}.`}
          </p>
        </div>
      )}
      {demo !== null && (
        <Modal title="Demo checkout" onClose={() => setDemo(null)}
          footer={<><button className="btn danger" onClick={() => demoOutcome(false)}>Payment fails</button><button className="btn primary" onClick={() => demoOutcome(true)}>Payment succeeds</button></>}>
          <div className="alert info">This operator is in demo mode, so no card is charged. In live mode this step opens the gateway’s secure payment page.</div>
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
        {org && (
          <div className="cohead" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            {org.logo_url ? <OrgLogo org={org} size={44} /> : <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><OrgLogo org={org} /><b style={{ fontSize: 15 }}>{org.name}</b></div>}
            <div className="muted" style={{ fontSize: 12.5, textAlign: 'right' }}>{org.email}{org.phone && <div>{org.phone}</div>}</div>
          </div>
        )}
        {children}
      </div>
      <div className="cofoot"><span>Secure payments</span><span>Powered by TripLoom Payments</span></div>
    </div>
  );
}
