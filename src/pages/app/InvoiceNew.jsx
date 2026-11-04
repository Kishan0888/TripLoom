import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, must } from '../../lib/supabase';
import { useLoad } from '../../lib/session';
import { useOrg } from '../../components/OrgLayout';
import { Loading, Field, Thread, useToast } from '../../components/ui';
import { money, inr0, today, addDays, fd, r2, CURRENCIES } from '../../lib/format';
import { CustomerModal } from './Customers';

const PRESETS = { '100': ['Full payment'], '30,70': ['Deposit', 'Balance'], '50,50': ['Deposit', 'Balance'], '20,40,40': ['Booking deposit', 'Second instalment', 'Final balance'] };

export default function InvoiceNew() {
  const { org, base, refreshCounts } = useOrg();
  const nav = useNavigate();
  const toast = useToast();
  const { data, loading, reload } = useLoad(async () => {
    const [cs, items, fx] = await Promise.all([
      supabase.from('customers').select('*').eq('org_id', org.id).order('name'),
      supabase.from('items').select('*').eq('org_id', org.id).eq('active', true).order('category').order('name'),
      supabase.from('fx_rates').select('*'),
    ]);
    return { cs: must(cs), items: must(items), fx: Object.fromEntries(must(fx).map((r) => [r.currency, Number(r.rate_to_inr)])) };
  }, [org.id]);
  const t = today();
  const [d, setD] = useState({ customer_id: '', currency: 'USD', trip: '', travel_date: '', pax: 2, tax_pct: 0, notes: '',
    lines: [{ description: '', qty: 1, rate: 0 }],
    instalments: [{ label: 'Deposit', pct: 30, due_date: addDays(t, 3) }, { label: 'Balance', pct: 70, due_date: addDays(t, 30) }] });
  const [errs, setErrs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [newCust, setNewCust] = useState(false);

  const totals = useMemo(() => {
    const sub = d.lines.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
    const tax = r2(sub * (Number(d.tax_pct) || 0) / 100);
    const total = r2(sub + tax);
    let acc = 0;
    const inst = d.instalments.map((s, k) => {
      const amt = k === d.instalments.length - 1 ? r2(total - acc) : r2(total * (Number(s.pct) || 0) / 100);
      acc = r2(acc + amt); return amt;
    });
    return { sub: r2(sub), tax, total, inst, pctSum: r2(d.instalments.reduce((a, s) => a + (Number(s.pct) || 0), 0)) };
  }, [d]);

  if (loading && !data) return <Loading />;
  const cust = data.cs.find((c) => c.id === d.customer_id);
  const fx = (c) => (c === 'INR' ? 1 : data.fx[c] || 1);
  const upd = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const updLine = (i, k, v) => setD((p) => ({ ...p, lines: p.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const updInst = (i, k, v) => setD((p) => ({ ...p, instalments: p.instalments.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  function addItem(id) {
    const it = data.items.find((x) => x.id === id); if (!it) return;
    const rate = r2(Number(it.price) * fx(it.currency) / fx(d.currency));
    const line = { description: it.name, qty: it.unit.includes('person') ? Number(d.pax) || 1 : 1, rate };
    setD((p) => {
      const blank = p.lines.findIndex((l) => !l.description.trim() && !(Number(l.rate) > 0));
      const lines = [...p.lines]; if (blank >= 0) lines[blank] = line; else lines.push(line);
      return { ...p, lines };
    });
  }
  function preset(key) {
    const pcts = key.split(',').map(Number);
    const end = d.travel_date ? addDays(d.travel_date, -21) : addDays(t, 60);
    setD((p) => ({ ...p, instalments: pcts.map((pct, k) => ({ label: PRESETS[key][k], pct,
      due_date: k === 0 ? addDays(t, 3) : k === pcts.length - 1 ? (end > addDays(t, 3) ? end : addDays(t, 30 * k)) : addDays(t, 30 * k) })) }));
  }
  function validate() {
    const e = [];
    if (!d.customer_id) e.push('Choose a customer.');
    if (!d.trip.trim()) e.push('Add a trip name.');
    if (!d.lines.some((l) => l.description.trim() && l.qty * l.rate > 0)) e.push('Add at least one service with a quantity and rate.');
    if (Math.abs(totals.pctSum - 100) >= 0.01) e.push(`Instalments add up to ${totals.pctSum}%. They must total 100%.`);
    if (d.instalments.some((s) => !s.due_date)) e.push('Give every instalment a due date.');
    return e;
  }
  async function save(send) {
    const e = send ? validate() : (!d.customer_id ? ['Choose a customer before saving a draft.'] : []);
    setErrs(e); if (e.length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setBusy(true);
    const lines = d.lines.filter((l) => l.description.trim() && l.qty * l.rate > 0).map((l) => ({ description: l.description.trim(), qty: Number(l.qty), rate: Number(l.rate) }));
    const { data: id, error } = await supabase.rpc('create_invoice', { p: { ...d, org_id: org.id, trip: d.trip.trim() || 'Untitled trip', send,
      lines: lines.length ? lines : [{ description: 'To be confirmed', qty: 1, rate: 0 }],
      instalments: d.instalments.map((s) => ({ label: s.label || 'Instalment', pct: Number(s.pct), due_date: s.due_date || addDays(t, 30) })) } });
    setBusy(false);
    if (error) { setErrs([error.message]); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    toast(send ? `Invoice created. Share the payment link with ${cust?.name}.` : 'Draft saved');
    refreshCounts(); nav(`${base}/invoices/${id}`);
  }

  return (
    <>
      <div className="pagehead">
        <div><Link className="crumb" to={`${base}/invoices`}>← Invoices</Link><h1>New invoice</h1></div>
        <div className="actions"><Link className="btn ghost" to={`${base}/invoices`}>Discard</Link><button className="btn" onClick={() => save(false)} disabled={busy}>Save draft</button><button className="btn primary" onClick={() => save(true)} disabled={busy}>{busy ? 'Saving…' : 'Create & send'}</button></div>
      </div>
      {errs.length > 0 && <div className="alert bad">{errs.map((x) => <div key={x}>{x}</div>)}</div>}
      <div className="builder">
        <div className="bmain">
          <section className="card"><div className="card-h"><h2>Customer and trip</h2><button className="link" onClick={() => setNewCust(true)}>+ New customer</button></div>
            <div className="fgrid">
              <Field label="Customer" id="b-cust"><select className="in" id="b-cust" value={d.customer_id} onChange={(e) => { const c = data.cs.find((x) => x.id === e.target.value); setD((p) => ({ ...p, customer_id: e.target.value, currency: c?.currency || p.currency })); }}>
                <option value="">Choose a customer</option>{data.cs.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.currency}</option>)}</select></Field>
              <Field label="Invoice currency" id="b-cur" hint="The customer pays in this currency. You receive INR."><select className="in" id="b-cur" value={d.currency} onChange={(e) => upd('currency', e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Trip name" id="b-trip" span><input className="in" id="b-trip" value={d.trip} onChange={(e) => upd('trip', e.target.value)} placeholder="e.g. Rajasthan Heritage, private tour" /></Field>
              <Field label="Travel start date" id="b-travel"><input className="in" id="b-travel" type="date" value={d.travel_date} onChange={(e) => upd('travel_date', e.target.value)} /></Field>
              <Field label="Travellers" id="b-pax"><input className="in" id="b-pax" type="number" min="1" value={d.pax} onChange={(e) => upd('pax', e.target.value)} /></Field>
            </div>
          </section>
          <section className="card"><div className="card-h"><h2>Services</h2></div>
            <div className="tw"><table className="t lines"><thead><tr><th style={{ minWidth: 200 }}>Description</th><th style={{ width: 80 }}>Qty</th><th style={{ width: 130 }}>Rate ({d.currency})</th><th className="right" style={{ width: 130 }}>Amount</th><th style={{ width: 40 }} /></tr></thead><tbody>
              {d.lines.map((l, k) => (
                <tr key={k}>
                  <td><input className="in" id={`ld-${k}`} value={l.description} onChange={(e) => updLine(k, 'description', e.target.value)} placeholder="Service or package" /></td>
                  <td><input className="in num" id={`lq-${k}`} type="number" min="0" value={l.qty} onChange={(e) => updLine(k, 'qty', e.target.value)} /></td>
                  <td><input className="in num" id={`lr-${k}`} type="number" min="0" step="0.01" value={l.rate} onChange={(e) => updLine(k, 'rate', e.target.value)} /></td>
                  <td className="right num">{money((Number(l.qty) || 0) * (Number(l.rate) || 0), d.currency)}</td>
                  <td><button className="btn ghost sm" aria-label="Remove line" disabled={d.lines.length < 2} onClick={() => setD((p) => ({ ...p, lines: p.lines.filter((_, j) => j !== k) }))}>✕</button></td>
                </tr>
              ))}
            </tbody></table></div>
            <div className="addrow">
              <select className="in sm" id="b-additem" style={{ width: 'auto', maxWidth: 280 }} value="" onChange={(e) => addItem(e.target.value)}>
                <option value="">+ Add from catalogue</option>{data.items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <button className="btn sm" onClick={() => setD((p) => ({ ...p, lines: [...p.lines, { description: '', qty: 1, rate: 0 }] }))}>Add custom line</button>
              <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' }}><label htmlFor="b-tax">Tax %</label><input className="in sm num" id="b-tax" type="number" min="0" step="0.01" style={{ width: 80 }} value={d.tax_pct} onChange={(e) => upd('tax_pct', e.target.value)} /></div>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Catalogue prices convert at the platform’s reference rate. Edit any rate before sending.</p>
          </section>
          <section className="card"><div className="card-h"><div><h2>Payment schedule</h2><p>Each instalment gets its own due date and reminders.</p></div></div>
            <div className="presets">{Object.keys(PRESETS).map((k) => <button key={k} className="chip" onClick={() => preset(k)}>{k === '100' ? 'Full payment' : k.replace(/,/g, ' / ')}</button>)}</div>
            <div className="tw"><table className="t lines"><thead><tr><th style={{ minWidth: 150 }}>Instalment</th><th style={{ width: 90 }}>% of total</th><th style={{ width: 160 }}>Due date</th><th className="right" style={{ width: 130 }}>Amount</th><th style={{ width: 40 }} /></tr></thead><tbody>
              {d.instalments.map((s, k) => (
                <tr key={k}>
                  <td><input className="in" id={`sl-${k}`} value={s.label} onChange={(e) => updInst(k, 'label', e.target.value)} /></td>
                  <td><input className="in num" id={`sp-${k}`} type="number" min="0" max="100" step="0.01" value={s.pct} onChange={(e) => updInst(k, 'pct', e.target.value)} /></td>
                  <td><input className="in" id={`sd-${k}`} type="date" value={s.due_date} onChange={(e) => updInst(k, 'due_date', e.target.value)} /></td>
                  <td className="right num">{money(totals.inst[k], d.currency)}</td>
                  <td><button className="btn ghost sm" aria-label="Remove instalment" disabled={d.instalments.length < 2} onClick={() => setD((p) => ({ ...p, instalments: p.instalments.filter((_, j) => j !== k) }))}>✕</button></td>
                </tr>
              ))}
            </tbody></table></div>
            <div className="addrow">
              <button className="btn sm" onClick={() => setD((p) => ({ ...p, instalments: [...p.instalments, { label: `Instalment ${p.instalments.length + 1}`, pct: Math.max(0, r2(100 - totals.pctSum)), due_date: addDays(p.instalments.at(-1)?.due_date || t, 30) }] }))}>Add instalment</button>
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: Math.abs(totals.pctSum - 100) < 0.01 ? 'var(--good)' : 'var(--bad)' }}>
                {Math.abs(totals.pctSum - 100) < 0.01 ? 'Adds up to 100%' : `Adds up to ${totals.pctSum}%. Make it 100%.`}</span>
            </div>
          </section>
          <section className="card"><div className="card-h"><h2>Note to customer</h2></div><textarea className="in" id="b-notes" rows={3} placeholder="Shown on the payment page" value={d.notes} onChange={(e) => upd('notes', e.target.value)} /></section>
        </div>
        <aside><div className="card sticky">
          <span className="eyebrow">Summary</span>
          <div style={{ margin: '10px 0 14px' }}>{cust ? <><b>{cust.name}</b><div className="muted" style={{ fontSize: 12.5 }}>{cust.email}</div></> : <span className="muted">No customer chosen yet</span>}</div>
          <div className="sumrow"><span className="sub">Subtotal</span><span className="num">{money(totals.sub, d.currency)}</span></div>
          {Number(d.tax_pct) > 0 && <div className="sumrow"><span className="sub">Tax ({d.tax_pct}%)</span><span className="num">{money(totals.tax, d.currency)}</span></div>}
          <div className="sumrow total"><span>Total</span><span className="num">{money(totals.total, d.currency)}</span></div>
          {d.currency !== 'INR' && <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>≈ {inr0(totals.total * fx(d.currency))} at reference rate {fx(d.currency)}</div>}
          <div style={{ marginTop: 16 }}><Thread currency={d.currency} money={money} items={d.instalments.map((s, k) => ({ label: s.label, amount: totals.inst[k], sub: `${s.due_date ? fd(s.due_date) : 'No due date'} · ${Number(s.pct) || 0}%` }))} /></div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>One payment link covers the whole schedule. Your customer pays the next instalment or the full balance.</p>
        </div></aside>
      </div>
      {newCust && <CustomerModal onClose={() => setNewCust(false)} onSaved={(c) => { setNewCust(false); reload(); setD((p) => ({ ...p, customer_id: c.id, currency: c.currency })); toast(`${c.name} added`); }} />}
    </>
  );
}
