import { Link } from 'react-router-dom';
import { I, Threads, useMeta } from '../SiteLayout';
import { PaymentsVisual, ReconVisual } from '../visuals';
import { ClosingBand, FAQ, WaButton } from './Home';

const GATEWAYS = [
  ['Razorpay', 'Cards, UPI, net banking, wallets'], ['CCAvenue', 'Cards, net banking, multi-currency'], ['PayU', 'Cards, UPI, EMI'],
  ['Cashfree', 'UPI, cards, pay later'], ['PayPal', 'PayPal balance and cards'], ['Stripe', 'Cards, Apple Pay, Google Pay'], ['Your own gateway', 'Any hosted payment page'],
];

export default function PaymentsPage() {
  useMeta('TravoCloud Payments — Invoices & payment links for tour operators', 'Invoice international travellers, split trips into deposits and balances, collect in 8 currencies through your own gateway and reconcile every payout.');
  return (
    <>
      <section className="mk-hero">
        <Threads />
        <div className="wrap">
          <div className="copy">
            <span className="eyebrow">TravoCloud Payments</span>
            <h1>Collect every instalment, in <em>every currency</em>.</h1>
            <p className="lead">Invoice international travellers, split each trip into a deposit and balances, and send one payment link. They pay through your own gateway, the money settles to your bank, and every payout is matched to its bank credit.</p>
            <div className="btns"><Link className="b o" to="/contact?intent=payments">Book a demo <I n="arrow" /></Link><Link className="b ghost-ink" to="/login">Log in</Link></div>
            <div className="mk-trust"><span><I n="check" />We never hold your money</span><span><I n="check" />8 currencies</span><span><I n="check" />7 gateway options</span></div>
          </div>
          <PaymentsVisual />
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">What it does</span><h2>Everything between “please pay” and “money in the bank”.</h2></div>
          <div className="grid3">
            {[['doc', 'Invoices with instalment plans', 'Build from your services catalogue, then split into a deposit, second instalment and final balance with their own due dates. 30/70, 20/40/40 or your own split.'],
              ['link', 'One link, the right amount', 'The traveller opens one link, sees the plan, and pays the next instalment or the full balance. Paid amounts are applied to instalments in order.'],
              ['globe', 'Eight currencies', 'Invoice in INR, USD, EUR, GBP, AUD, AED, SGD or CAD. The payment page offers only the gateways that accept that currency.'],
              ['bank', 'Bank reconciliation', 'Every payout shows when it should reach your bank. Log the UTR and amount; differences such as bank charges are flagged and noted.'],
              ['print', 'A4 PDF invoices', 'Download a clean A4 invoice with your logo, payment schedule, payments received and a pay-online QR code.'],
              ['team', 'Your team, your roles', 'Owners manage gateways and team; accounts handle payments and reconciliation; sales create and send invoices.']].map(([ic, t, d], k) => (
              <div className="card" key={t}><span className={`ico ${k % 2 ? 't' : ''}`}><I n={ic} /></span><h3>{t}</h3><p>{d}</p></div>))}
          </div>
        </div>
      </section>

      <section className="band" style={{ background: 'var(--paper-2)' }}>
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">How it works</span><h2>Four steps, no spreadsheets.</h2></div>
          <div className="steps">
            {[['Connect your gateway', 'Add your own Razorpay, CCAvenue, PayU, Cashfree, PayPal or Stripe keys. Try everything first in demo mode.'],
              ['Raise the invoice', 'Pick the customer, add services, choose the currency and the instalment plan.'],
              ['Share one link', 'Send it on WhatsApp or email. Reminders go out before each due date.'],
              ['Match the payout', 'When the gateway settles, log the bank credit. Your dashboard shows what is collected, due and late.']].map(([t, d]) => (
              <div className="step" key={t}><h3>{t}</h3><p>{d}</p></div>))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap mk-spot">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <span className="eyebrow">Bring your own gateway</span>
            <h2 style={{ fontSize: 'clamp(28px,3.6vw,40px)', lineHeight: 1.12 }}>Your merchant account. Your bank. Our software.</h2>
            <p className="lead" style={{ color: 'var(--ink-soft)' }}>TravoCloud Payments works on top of the gateway you already use. Travellers pay the gateway directly and funds settle to your account, so TravoCloud never holds your money. Connect more than one, for example Razorpay for INR and PayPal for USD.</p>
            <div className="grid2" style={{ gap: 10 }}>
              {GATEWAYS.map(([n, d]) => <div key={n} className="card" style={{ padding: 14, gap: 2, borderRadius: 14 }}><b style={{ fontSize: 15.5 }}>{n}</b><span className="muted" style={{ fontSize: 13.5 }}>{d}</span></div>)}
            </div>
          </div>
          <ReconVisual />
        </div>
      </section>

      <section className="band tight" style={{ background: 'var(--card)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="wrap grid3">
          {[['shield', 'Private by design', 'Each company’s data is isolated at the database level. Gateway keys stay on the server and are never shown in the browser again.'],
            ['map', 'Stored in India', 'Your data is stored in the Mumbai region.'],
            ['layers', 'Part of the TravoCloud suite', 'Use Payments on its own today, or as the finance module of the full TravoCloud workspace.']].map(([ic, t, d]) => (
            <div key={t} style={{ display: 'flex', gap: 14 }}><span className="ico t"><I n={ic} /></span><div><h3 style={{ fontSize: 18, marginBottom: 4 }}>{t}</h3><p style={{ color: 'var(--ink-soft)', fontSize: 15.5 }}>{d}</p></div></div>))}
        </div>
      </section>

      <section className="band">
        <div className="wrap" style={{ display: 'grid', gap: 36 }}>
          <div className="sec-head" style={{ marginBottom: 0 }}><span className="eyebrow">Questions</span><h2>Payments FAQ</h2></div>
          <FAQ items={[
            ['Does TravoCloud hold or touch the money?', 'No. Travellers pay through your own gateway account and the gateway settles directly to your bank. TravoCloud shows you what was paid and when it should arrive.'],
            ['Which gateways can I use?', 'Razorpay, CCAvenue, PayU, Cashfree, PayPal and Stripe, or any other provider with a hosted payment page through the custom option. You can connect several and each invoice shows the ones that accept its currency.'],
            ['Can a traveller pay part now and the rest later?', 'Yes. Every invoice has an instalment plan. The payment link always offers the next instalment, and the traveller can choose to pay the full balance instead.'],
            ['What about bank transfers or cash?', 'Record them on the invoice in a few seconds. They count towards the balance like any other payment.'],
            ['Can I try it without real payments?', 'Yes. Every new workspace starts in demo mode, where the payment page completes payments without charging anyone. Switch to live when your gateway keys are ready.'],
          ]} />
        </div>
      </section>

      <ClosingBand title="Get paid on time, in any currency." sub="See TravoCloud Payments with your own invoices and gateway."><Link className="b o" to="/contact?intent=payments">Book a demo</Link><WaButton /></ClosingBand>
    </>
  );
}
