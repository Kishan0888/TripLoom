import { useEffect, useMemo } from 'react';
import qrcode from 'qrcode-generator';
import { money, fd, istDate, ST_LBL, INST_LBL } from '../lib/format';

// A4 invoice, laid out in millimetres so it prints (or saves as PDF) exactly one A4 width.
// Colours are fixed (not theme tokens) so the printout is always black-on-white.

function Qr({ text, size = 20 }) {
  const path = useMemo(() => {
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(); let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { d, n };
  }, [text]);
  return (
    <svg viewBox={`-2 -2 ${path.n + 4} ${path.n + 4}`} style={{ width: `${size}mm`, height: `${size}mm`, display: 'block' }} role="img" aria-label="QR code for the payment link">
      <rect x="-2" y="-2" width={path.n + 4} height={path.n + 4} fill="#fff" /><path d={path.d} fill="#111" />
    </svg>
  );
}

export default function InvoiceDocument({ org, inv, customer, lines, instalments, payments, payUrl }) {
  const status = inv.display_status;
  const paidInFull = status === 'paid';
  const balance = Math.max(0, Number(inv.due));
  return (
    <article className="a4">
      {paidInFull && <div className="a4-stamp">PAID</div>}
      <header className="a4-head">
        <div className="a4-brand">
          {org.logo_url ? <img src={org.logo_url} alt={org.name} className="a4-logo" /> : <div className="a4-orgname">{org.name}</div>}
          <div className="a4-small">
            {org.logo_url && <div className="a4-strong">{org.name}</div>}
            {org.address && <div>{org.address}</div>}
            <div>{[org.email, org.phone].filter(Boolean).join(' · ')}</div>
            {org.gstin && <div>GSTIN {org.gstin}</div>}
          </div>
        </div>
        <div className="a4-title">
          <div className="a4-h1">Invoice</div>
          <table className="a4-meta"><tbody>
            <tr><th>Invoice no.</th><td className="a4-mono">{inv.number}</td></tr>
            <tr><th>Issue date</th><td>{fd(inv.issue_date)}</td></tr>
            {!paidInFull && inv.next_due_date && <tr><th>Next due</th><td>{fd(inv.next_due_date)}</td></tr>}
            <tr><th>Status</th><td>{ST_LBL[status] ?? status}</td></tr>
          </tbody></table>
        </div>
      </header>

      <section className="a4-parties">
        <div>
          <div className="a4-label">Bill to</div>
          <div className="a4-strong">{customer.name}</div>
          {customer.email && <div>{customer.email}</div>}
          {customer.phone && <div>{customer.phone}</div>}
          {customer.country && <div>{customer.country}</div>}
        </div>
        <div>
          <div className="a4-label">Trip</div>
          <div className="a4-strong">{inv.trip}</div>
          <div>{inv.pax} traveller{inv.pax > 1 ? 's' : ''}{inv.travel_date ? ` · starts ${fd(inv.travel_date)}` : ''}</div>
          <div>Currency: {inv.currency}</div>
        </div>
      </section>

      <table className="a4-table">
        <thead><tr><th style={{ width: '7mm' }}>#</th><th>Description</th><th className="r" style={{ width: '16mm' }}>Qty</th><th className="r" style={{ width: '30mm' }}>Rate</th><th className="r" style={{ width: '32mm' }}>Amount</th></tr></thead>
        <tbody>
          {lines.map((l, k) => (
            <tr key={k}><td>{k + 1}</td><td>{l.description}</td><td className="r">{Number(l.qty)}</td><td className="r">{money(l.rate, inv.currency)}</td><td className="r">{money(Number(l.qty) * Number(l.rate), inv.currency)}</td></tr>
          ))}
        </tbody>
      </table>

      <section className="a4-totals-wrap">
        <div className="a4-notes">
          {inv.notes && <><div className="a4-label">Note</div><p>{inv.notes}</p></>}
        </div>
        <table className="a4-totals"><tbody>
          <tr><th>Subtotal</th><td>{money(inv.subtotal, inv.currency)}</td></tr>
          {Number(inv.tax) > 0 && <tr><th>Tax ({Number(inv.tax_pct)}%)</th><td>{money(inv.tax, inv.currency)}</td></tr>}
          <tr className="a4-total"><th>Total</th><td>{money(inv.total, inv.currency)}</td></tr>
          <tr><th>Paid</th><td>{money(inv.paid, inv.currency)}</td></tr>
          <tr className="a4-due"><th>Balance due</th><td>{money(balance, inv.currency)}</td></tr>
        </tbody></table>
      </section>

      <section className="a4-block">
        <div className="a4-label">Payment schedule</div>
        <table className="a4-table a4-compact">
          <thead><tr><th>Instalment</th><th>Due date</th><th className="r">Share</th><th className="r">Amount</th><th className="r">Paid</th><th className="r">Status</th></tr></thead>
          <tbody>{instalments.map((s, k) => (
            <tr key={k}><td>{s.label}</td><td>{fd(s.due_date)}</td><td className="r">{Number(s.pct)}%</td><td className="r">{money(s.amount, inv.currency)}</td><td className="r">{money(s.paid_amount, inv.currency)}</td><td className="r">{INST_LBL[s.status] ?? s.status}</td></tr>
          ))}</tbody>
        </table>
      </section>

      {payments.length > 0 && (
        <section className="a4-block">
          <div className="a4-label">Payments received</div>
          <table className="a4-table a4-compact">
            <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th className="r">Amount</th></tr></thead>
            <tbody>{payments.map((p, k) => (
              <tr key={k}><td>{fd(istDate(p.paid_at))}</td><td>{p.method || '—'}</td><td className="a4-mono">{p.tracking_id || '—'}</td><td className="r">{money(p.amount, inv.currency)}</td></tr>
            ))}</tbody>
          </table>
        </section>
      )}

      {!paidInFull && payUrl && (
        <section className="a4-pay">
          <Qr text={payUrl} />
          <div>
            <div className="a4-strong">Pay online</div>
            <div>Scan the code or open the link to pay the next instalment or the full balance securely.</div>
            <div className="a4-mono a4-link">{payUrl}</div>
          </div>
        </section>
      )}

      {org.terms && <section className="a4-block a4-terms"><div className="a4-label">Terms</div><p>{org.terms}</p></section>}

      <footer className="a4-foot">This is a computer-generated invoice and does not need a signature. · Powered by TravoCloud Payments</footer>
    </article>
  );
}

// Wraps the document with a screen toolbar; prints itself when opened with ?print=1.
export function PrintFrame({ title, onBack, autoPrint, children }) {
  useEffect(() => {
    document.title = title;
    if (!autoPrint) return undefined;
    const imgs = Array.from(document.querySelectorAll('.a4 img'));
    let done = false;
    const go = () => { if (!done) { done = true; setTimeout(() => window.print(), 250); } };
    Promise.all(imgs.map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = r; im.onerror = r; })))).then(go);
    const t = setTimeout(go, 3000);
    return () => clearTimeout(t);
  }, [title, autoPrint]);
  useEffect(() => () => { document.title = 'TravoCloud Payments'; }, []);
  return (
    <div className="print-page">
      <div className="print-bar">
        {onBack && <button className="btn ghost" onClick={onBack}>← Back</button>}
        <span className="muted" style={{ fontSize: 13, flex: 1 }}>A4 invoice. In the print window, choose “Save as PDF” to download it.</span>
        <button className="btn primary" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>
      {children}
    </div>
  );
}
