import { Link } from 'react-router-dom';
import { useMeta } from '../SiteLayout';
import { ClosingBand, FAQ, WaButton } from './Home';
import { useDemo } from '../DemoForm';
import { SITE } from '../site.config';

const PLANS = [
  { n: 'Starter', tag: 'For solo operators and new agencies', users: 'Up to 3 users',
    lead: 'Everything you need to answer enquiries fast and get paid online.',
    f: ['Enquiries inbox with lead scores', 'Quote studio with AI checks', 'Invoices with instalment plans', 'Payment links through one gateway', 'A4 PDF invoices with your logo', 'Email support'] },
  { n: 'Business', tag: 'For growing tour operators and DMCs', users: 'Up to 15 users', hot: true,
    lead: 'Run sales, bookings and collections for a busy team in one place.',
    f: ['Everything in Starter', 'WhatsApp Business integration', 'Bookings desk, vouchers and dispatch', 'Multi-currency invoices and multiple gateways', 'Invoices and reminders from your own email', 'Marketing: email and WhatsApp broadcasts', 'Traveller dashboard', 'Guided onboarding and rate import'] },
  { n: 'Enterprise', tag: 'For multi-branch operators', users: 'Custom number of users',
    lead: 'Controls, integrations and support for larger organisations.',
    f: ['Everything in Business', 'Branches, roles and permissions', 'Affiliate partner management', 'Tally export and API access', 'Custom integrations', 'Dedicated account manager', 'Priority support'] },
];
const ROWS = [
  ['Enquiries inbox and lead scores', 1, 1, 1], ['Quote studio with AI checks', 1, 1, 1], ['Invoices, instalment plans and payment links', 1, 1, 1],
  ['A4 PDF invoices with your logo', 1, 1, 1], ['Bank reconciliation', 1, 1, 1], ['Multiple payment gateways and currencies', 0, 1, 1],
  ['Invoices and reminders sent from your own email', 0, 1, 1], ['WhatsApp Business integration', 0, 1, 1], ['Bookings desk, vouchers and dispatch', 0, 1, 1],
  ['Marketing (email, WhatsApp broadcasts, social posting)', 0, 1, 1], ['Traveller dashboard', 0, 1, 1], ['Affiliate partner management', 0, 0, 1],
  ['Branches, roles and permissions', 0, 0, 1], ['Tally export and API access', 0, 0, 1],
  ['Onboarding', 'Self-serve', 'Guided, with rate import', 'Dedicated manager'], ['Support', 'Email', 'Email and WhatsApp', 'Priority'],
];

export default function Pricing() {
  useMeta('Pricing — Plans for every tour operator | TravoCloud', 'Starter, Business and Enterprise plans for Indian tour operators and DMCs. Book a demo and get a quote for your team.');
  const openDemo = useDemo();
  return (
    <>
      <section className="band" style={{ paddingBottom: 40 }}>
        <div className="wrap">
          <div className="sec-head center" style={{ marginBottom: 40 }}>
            <span className="eyebrow">Pricing</span>
            <h1 style={{ fontSize: 'clamp(34px,5vw,56px)', lineHeight: 1.05, fontWeight: 700 }}>Simple plans that grow with your team.</h1>
            <p>Every plan is priced for your team size and the modules you use. Book a demo and we’ll share a clear quote within one working day.</p>
          </div>
          <div className="plans three">
            {PLANS.map((p) => (
              <div className={`plan ${p.hot ? 'hot' : ''}`} key={p.n}>
                {p.hot && <span className="badge">Most popular</span>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <h3 style={{ fontSize: 24 }}>{p.n}</h3>
                  <span className="tag">{p.tag}</span>
                </div>
                <p className={p.hot ? 'muted' : ''} style={{ fontSize: 15, color: p.hot ? undefined : 'var(--ink-soft)' }}>{p.lead}</p>
                <b style={{ fontSize: 15 }}>{p.users}</b>
                <ul>{p.f.map((x) => <li key={x}>{x}</li>)}</ul>
                <button type="button" className={`b ${p.hot ? 'o' : 'line'}`} style={{ marginTop: 'auto' }} onClick={() => openDemo({ plan: p.n })}>Book a demo</button>
              </div>
            ))}
          </div>
          <p className="muted" style={{ textAlign: 'center', marginTop: 24, fontSize: 14.5 }}>Every plan starts with a {SITE.trialDays}-day free trial. No card needed. Prices exclude GST.</p>
        </div>
      </section>

      <section className="band" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="sec-head"><h2 style={{ fontSize: 'clamp(24px,3vw,32px)' }}>Compare plans</h2></div>
          <div className="mk-tw"><table className="cmp">
            <thead><tr><th>Feature</th>{PLANS.map((p) => <th key={p.n}>{p.n}</th>)}</tr></thead>
            <tbody>{ROWS.map(([f, ...v]) => <tr key={f}><td>{f}</td>{v.map((x, k) => <td key={k}>{x === 1 ? <span className="yes" aria-label="Included">✓</span> : x === 0 ? <span className="no" aria-label="Not included">—</span> : <span style={{ fontSize: 14 }}>{x}</span>}</td>)}</tr>)}</tbody>
          </table></div>
          <div className="grid3" style={{ marginTop: 28 }}>
            <div className="card"><h3>Extra users</h3><p>Add people to any plan as your team grows.</p></div>
            <div className="card"><h3>Extra AI credits</h3><p>Top up when your team uses AI heavily.</p></div>
            <div className="card"><h3>Messaging costs</h3><p>WhatsApp and email sending costs are billed by Meta and your email tool at their rates.</p></div>
          </div>
          <div className="card" style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap', background: 'var(--ink)', color: 'var(--on-ink)', borderColor: 'var(--ink)' }}>
            <div style={{ flex: 1, minWidth: 240 }}><h3>Only need payments?</h3><p style={{ color: 'var(--on-ink-2)' }}>TravoCloud Payments is available on its own for operators who just want invoices, payment links and reconciliation.</p></div>
            <Link className="b o" to="/payments">See TravoCloud Payments</Link>
          </div>
        </div>
      </section>

      <section className="band" style={{ background: 'var(--paper-2)' }}>
        <div className="wrap" style={{ display: 'grid', gap: 36 }}>
          <div className="sec-head" style={{ marginBottom: 0 }}><h2>Pricing FAQ</h2></div>
          <FAQ items={[
            ['How much does TravoCloud cost?', 'It depends on your team size and the modules you need. Book a demo and we’ll send a written quote within one working day.'],
            ['Is there a free trial?', `Yes, ${SITE.trialDays} days with full features. No card needed.`],
            ['Can I change plans later?', 'Yes, upgrade or downgrade anytime; the difference is adjusted on your next bill.'],
            ['How do I pay?', 'UPI, cards, net banking or bank transfer. GST invoice provided.'],
            ['What happens to my data if I cancel?', 'You can export your clients, files and invoices before closing the account.'],
          ]} />
        </div>
      </section>
      <ClosingBand title="Not sure which plan fits?">
        <button type="button" className="b o" onClick={() => openDemo()}>Book a demo</button><WaButton label="Chat on WhatsApp" />
      </ClosingBand>
    </>
  );
}
