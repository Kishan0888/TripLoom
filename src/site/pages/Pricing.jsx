import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../SiteLayout';
import { ClosingBand, FAQ, WaButton } from './Home';
import { SITE } from '../site.config';

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const PLANS = [
  { n: 'Starter', m: 2499, y: 24990, users: '2 users', best: 'Solo operators and new agencies', cta: 'Start free trial' },
  { n: 'Growth', m: 5999, y: 59990, users: '5 users', best: 'Growing domestic teams', cta: 'Start free trial', hot: true, founding: 35994 },
  { n: 'Pro', m: 11999, y: 119990, users: '15 users', best: 'Inbound DMCs and FTO business', cta: 'Start free trial' },
  { n: 'Enterprise', m: 25000, y: null, users: '40+ users', best: 'Multi-branch operators', cta: 'Talk to sales', from: true },
];
const ROWS = [
  ['Enquiries inbox and lead scores', 1, 1, 1, 1], ['Quote studio with AI checks', 1, 1, 1, 1], ['Invoices and payment tracking', 1, 1, 1, 1],
  ['WhatsApp Business integration', 0, 1, 1, 1], ['Packages and automation reminders', 0, 1, 1, 1], ['Marketing (email, WhatsApp broadcasts, social posting)', 0, 1, 1, 1],
  ['Bookings desk, vouchers and dispatch', 0, 0, 1, 1], ['Affiliate partner management', 0, 0, 1, 1], ['FTO clients and multi-currency', 0, 0, 1, 1],
  ['Traveller dashboard', 0, 1, 1, 1], ['Branches, roles and permissions', 0, 0, 0, 1], ['Tally export and API access', 0, 0, 0, 1],
  ['Onboarding and rate import', 'Self-serve', 'Guided', 'Guided', 'Dedicated manager'],
];

export default function Pricing() {
  useMeta('Pricing — Plans from ₹2,499/month | TripLooom', 'Simple monthly and annual plans for tour operators. Founding offer: 40% off annual Growth for the first 100 operators.');
  const [annual, setAnnual] = useState(true);
  return (
    <>
      <section className="band" style={{ paddingBottom: 40 }}>
        <div className="wrap">
          <div className="sec-head center" style={{ marginBottom: 28 }}>
            <span className="eyebrow">Pricing</span>
            <h1 style={{ fontSize: 'clamp(34px,5vw,56px)', lineHeight: 1.05, fontWeight: 700 }}>Simple plans that grow with your team.</h1>
            <p>All prices per month, excluding GST. Pay annually and get 2 months free.</p>
            <div className="toggle" role="group" aria-label="Billing period">
              <button className={!annual ? 'on' : ''} onClick={() => setAnnual(false)}>Monthly</button>
              <button className={annual ? 'on' : ''} onClick={() => setAnnual(true)}>Annually <span style={{ color: 'var(--teal-d)' }}>· 2 months free</span></button>
            </div>
          </div>
          <div className="offer">
            <span style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 18 }}>Founding 100</span>
            <span style={{ flex: 1, minWidth: 220 }}>40% off the annual Growth plan: <b>₹35,994 for the first year</b> (about ₹3,000 a month). Only for the first 100 operators.</span>
            <Link className="b o sm" to="/contact?intent=trial">Claim the offer</Link>
          </div>
          <div className="plans">
            {PLANS.map((p) => (
              <div className={`plan ${p.hot ? 'hot' : ''}`} key={p.n}>
                {p.hot && <span className="badge">Most popular</span>}
                <h3 style={{ fontSize: 20 }}>{p.n}</h3>
                <div className="price">{p.from && <small>From </small>}{annual && p.y ? inr(p.y / 12) : inr(p.m)}<small> /month</small></div>
                <span className="muted" style={{ fontSize: 14 }}>{p.from ? 'Custom annual contract' : annual ? `${inr(p.y)} billed yearly` : 'Billed monthly'}</span>
                {p.founding && annual && <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)' }}>Founding: {inr(p.founding)} for year one</span>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 15 }}><b>{p.users}</b><span className="muted">{p.best}</span></div>
                <Link className={`b ${p.hot ? 'o' : 'line'}`} to={p.from ? '/contact' : '/contact?intent=trial'}>{p.cta}</Link>
              </div>
            ))}
          </div>
          <p className="muted" style={{ textAlign: 'center', marginTop: 20, fontSize: 14.5 }}>Every plan starts with a {SITE.trialDays}-day free trial with full Pro features. No card needed.</p>
        </div>
      </section>

      <section className="band" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="sec-head"><h2 style={{ fontSize: 'clamp(24px,3vw,32px)' }}>What’s included</h2></div>
          <div className="mk-tw"><table className="cmp">
            <thead><tr><th>Feature</th>{PLANS.map((p) => <th key={p.n}>{p.n}</th>)}</tr></thead>
            <tbody>{ROWS.map(([f, ...v]) => <tr key={f}><td>{f}</td>{v.map((x, k) => <td key={k}>{x === 1 ? <span className="yes" aria-label="Included">✓</span> : x === 0 ? <span className="no" aria-label="Not included">—</span> : <span style={{ fontSize: 14 }}>{x}</span>}</td>)}</tr>)}</tbody>
          </table></div>
          <div className="grid3" style={{ marginTop: 28 }}>
            <div className="card"><h3>Extra users</h3><p>Add more users to any plan. Ask us for the price.</p></div>
            <div className="card"><h3>Extra AI credits</h3><p>Top up when your team uses AI heavily. Ask us for the price.</p></div>
            <div className="card"><h3>Messaging costs</h3><p>WhatsApp and email sending costs are billed by Meta and your email tool at their rates.</p></div>
          </div>
          <div className="card" style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap', background: 'var(--ink)', color: 'var(--on-ink)', borderColor: 'var(--ink)' }}>
            <div style={{ flex: 1, minWidth: 240 }}><h3>Only need payments?</h3><p style={{ color: 'var(--on-ink-2)' }}>TripLooom Payments is available on its own for operators who just want invoices, payment links and reconciliation.</p></div>
            <Link className="b o" to="/payments">See TripLooom Payments</Link>
          </div>
        </div>
      </section>

      <section className="band" style={{ background: 'var(--paper-2)' }}>
        <div className="wrap" style={{ display: 'grid', gap: 36 }}>
          <div className="sec-head" style={{ marginBottom: 0 }}><h2>Pricing FAQ</h2></div>
          <FAQ items={[
            ['Is there a free trial?', `Yes, ${SITE.trialDays} days with full Pro features. No card needed.`],
            ['Can I change plans later?', 'Yes, upgrade or downgrade anytime; the difference is adjusted on your next bill.'],
            ['How do I pay?', 'UPI, cards, net banking or bank transfer. GST invoice provided.'],
            ['What happens to my data if I cancel?', 'You can export your clients, files and invoices before closing the account.'],
          ]} />
        </div>
      </section>
      <ClosingBand title="Not sure which plan fits?"><Link className="b o" to="/contact">Book a free demo</Link><WaButton label="Chat on WhatsApp" /></ClosingBand>
    </>
  );
}
