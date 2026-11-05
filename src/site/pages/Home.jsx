import { Link } from 'react-router-dom';
import { I, Spark, Threads, useMeta } from '../SiteLayout';
import { HeroVisual, PaymentsVisual } from '../visuals';
import { SITE, waLink } from '../site.config';

const MODULES = [
  ['inbox', 'Enquiries & CRM', 'All channels in one inbox, lead scores and follow-up reminders', 'crm'],
  ['route', 'Quote studio', 'Day-by-day itineraries with live costing and multiple versions', 'quote'],
  ['rates', 'Rates & masters', 'Hotels, transport, guides, monuments, activities and restaurants with seasonal rates and policies', 'rates'],
  ['bell', 'Bookings & vouchers', 'Supplier requests, confirmations and vouchers on autopilot', 'bookings'],
  ['calendar', 'Dispatch & guides', 'Daily duty roster and a clash-free guide calendar', 'dispatch'],
  ['wallet', 'Invoices & payments', 'Full and part invoices in INR, EUR, USD, GBP and more, with payment tracking', 'finance'],
  ['mega', 'Marketing', 'Email newsletters, WhatsApp broadcasts and Facebook & Instagram posting', 'marketing'],
  ['user', 'Traveller dashboard', 'A branded trip page for clients with itinerary, visa info and documents', 'more'],
];

export function FAQ({ items }) {
  return <div className="faq">{items.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>;
}

export function ClosingBand({ title, sub, children }) {
  return (
    <section className="mk-inkband band">
      <Threads />
      <div className="wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20 }}>
        <h2>{title}</h2>
        {sub && <p className="lead" style={{ maxWidth: '52ch' }}>{sub}</p>}
        <div className="btns" style={{ justifyContent: 'center' }}>{children}</div>
      </div>
    </section>
  );
}

export function WaButton({ label = 'Talk to us on WhatsApp', className = 'b ghost-ink' }) {
  const wa = waLink();
  return wa ? <a className={className} href={wa} target="_blank" rel="noreferrer">{label}</a> : <Link className={className} to="/contact#form">Send us a message</Link>;
}

export default function Home() {
  useMeta('TravoCloud — Software for Indian Tour Operators & DMCs', 'Enquiries, AI itineraries with live costing, supplier bookings, vouchers and invoices in one workspace. Book a free demo.');
  return (
    <>
      <section className="mk-hero">
        <Threads />
        <div className="wrap">
          <div className="copy">
            <span className="eyebrow">Built for Indian tour operators and DMCs</span>
            <h1>Run every enquiry, quote, booking and <em>payment</em> from one place.</h1>
            <p className="lead">TravoCloud brings your WhatsApp and email enquiries, AI-built itineraries with live costing, supplier bookings, vouchers and invoices into one workspace, so your team spends less time copying and more time selling.</p>
            <div className="btns"><Link className="b o" to="/contact">Book a free demo <I n="arrow" /></Link><Link className="b ghost-ink" to="/contact?intent=trial">Start {SITE.trialDays}-day free trial</Link></div>
            <div className="mk-trust"><span><I n="check" />No credit card needed</span><span><I n="check" />Set up in a day</span><span><I n="check" />Data stored in India</span></div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">The problem</span><h2>Your business runs on WhatsApp threads and Excel sheets.</h2></div>
          <div className="grid3">
            {[['inbox', 'Enquiries everywhere', 'Leads arrive on WhatsApp, email, Instagram and phone, and some are never answered.'],
              ['clock', 'Quotes take hours', 'Rates sit in Excel sheets; every change means recalculating hotels, cars, guides and entries by hand.'],
              ['phone', 'Operations on the phone', 'Supplier confirmations, vouchers, guide schedules and payment follow-ups live in chats and memory.']].map(([ic, t, d]) => (
              <div className="card" key={t}><span className="ico"><I n={ic} /></span><h3>{t}</h3><p>{d}</p></div>))}
          </div>
        </div>
      </section>

      <section className="band" style={{ background: 'var(--paper-2)' }}>
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">How it works</span><h2>From first message to final invoice in four steps.</h2></div>
          <div className="steps">
            {[['Capture', 'Every enquiry from WhatsApp, email, website and Instagram becomes a file, with an AI summary.'],
              ['Quote', 'Build the itinerary from your own rates; seasons, room types, meal plans and vehicle rules are priced automatically.'],
              ['Confirm', 'One click sends booking requests to every supplier and raises the advance invoice.'],
              ['Deliver', 'Vouchers, driver and guide duties, and a travel dashboard for your client.']].map(([t, d]) => (
              <div className="step" key={t}><h3>{t}</h3><p>{d}</p></div>))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">Everything in one workspace</span><h2>Eight modules that work together.</h2><p>Start with enquiries and quotes. Switch on bookings, finance and marketing when you’re ready.</p></div>
          <div className="grid4">
            {MODULES.map(([ic, t, d, id], k) => (
              <Link className="card" key={t} to={`/product#${id}`}><span className={`ico ${k % 2 ? 't' : ''}`}><I n={ic} /></span><h3>{t}</h3><p>{d}</p><span className="more">See how →</span></Link>))}
          </div>
        </div>
      </section>

      <section className="band" style={{ background: 'var(--card)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="wrap mk-spot">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <span className="eyebrow">Live now · TravoCloud Payments</span>
            <h2 style={{ fontSize: 'clamp(28px,3.6vw,42px)', lineHeight: 1.12 }}>Collect every instalment, in every currency.</h2>
            <p className="lead" style={{ color: 'var(--ink-soft)' }}>Raise an invoice, split it into deposit and balance, and send one payment link. Travellers pay through your own gateway, the money lands in your bank, and every payout is matched to its bank credit.</p>
            <ul className="ticks">
              <li>Payment links in INR, USD, EUR, GBP, AUD, AED, SGD and CAD</li>
              <li>Works with Razorpay, CCAvenue, PayU, Cashfree, PayPal, Stripe or your own gateway</li>
              <li>A4 PDF invoices with your logo and a pay-online QR code</li>
            </ul>
            <div className="btns"><Link className="b o" to="/payments">Explore Payments</Link><Link className="b line" to="/login">Log in</Link></div>
          </div>
          <PaymentsVisual />
        </div>
      </section>

      <section className="mk-ai band">
        <div className="wrap" style={{ position: 'relative' }}>
          <div className="sec-head"><span className="eyebrow">AI that saves real hours</span><h2>An assistant that knows travel.</h2><p>Look for the sparkle: it marks every AI feature inside TravoCloud.</p></div>
          <div className="grid4">
            {[['Reads enquiries for you', 'Paste a message; name, dates, travellers and budget are filled in.'],
              ['Checks every quote', 'Flags a Taj Mahal visit on a Friday, a guide already booked, a group too big for the vehicle, or a margin below your minimum.'],
              ['Drafts replies', 'To clients and suppliers, in your tone.'],
              ['Answers questions', '“Who owes us money?” “Any departures this week?”']].map(([t, d]) => (
              <div className="card" key={t}><span className="ico"><I n="sparkle" /></span><h3>{t}</h3><p>{d}</p></div>))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">Who it’s for</span><h2>Made for the way Indian operators work.</h2></div>
          <div className="grid3">
            {[['map', 'Domestic operators', 'Quick family and group quotes, WhatsApp follow-ups, UPI payment links.'],
              ['globe', 'Inbound DMCs', 'FTO clients, foreign-currency quotes with buffers, multi-language guides, multiple quote versions.'],
              ['team', 'Outbound and multi-branch teams', 'Branches, roles and permissions, team notifications.']].map(([ic, t, d]) => (
              <div className="card" key={t}><span className="ico t"><I n={ic} /></span><h3>{t}</h3><p>{d}</p></div>))}
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: 'var(--paper-2)' }}>
        <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 'clamp(24px,3vw,32px)' }}>Plans from ₹2,499 a month.</h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: 17 }}>Founding offer: 40% off the annual Growth plan for the first 100 operators.</p>
          </div>
          <Link className="b o" to="/pricing">See pricing</Link>
        </div>
      </section>

      <section className="band">
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 36 }}>
          <div className="sec-head" style={{ marginBottom: 0 }}><span className="eyebrow">Questions</span><h2>Frequently asked</h2></div>
          <FAQ items={[
            ['Do I need to change how my team works?', 'No. Start with enquiries and quotes; add bookings, finance and marketing when you’re ready.'],
            ['Can you import my hotel and transport rates?', 'Yes. Send your Excel sheets and we set up your masters during onboarding.'],
            ['Does it work with WhatsApp?', 'Yes, through the official WhatsApp Business API, so messages are logged against each file.'],
            ['Is my data safe?', 'Your data is stored in India (Mumbai region). Each company’s records are isolated at the database level, so one operator can never see another’s data, and gateway keys are kept on the server, never in the browser.'],
            ['Can I try it first?', 'Yes. Book a demo or start a free trial.'],
          ]} />
        </div>
      </section>

      <ClosingBand title="Spend your time on travellers, not spreadsheets.">
        <Link className="b o" to="/contact">Book a free demo</Link><WaButton />
      </ClosingBand>
    </>
  );
}

export { Spark };
