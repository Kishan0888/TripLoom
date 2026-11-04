import { Link } from 'react-router-dom';
import { I, Spark, useMeta } from '../SiteLayout';
import { ModuleVisual } from '../visuals';
import { ClosingBand } from './Home';

const MODS = [
  ['crm', 'Enquiries & CRM', 'Never miss a lead again', 'Every enquiry, from every channel, lands in one inbox and becomes a file your whole team can see.',
    ['WhatsApp, email, website and Instagram in one inbox', 'AI pulls out dates, travellers and budget', 'Lead score and next best action', 'List or drag-and-drop board'], [1]],
  ['quote', 'Quote studio', 'Quotes in minutes, priced to the rupee', 'Build day by day from your own contracted rates. TripLooom does the arithmetic and checks the plan before it goes out.',
    ['Day-by-day builder from your own rates', 'Multiple versions side by side', 'Prices in the client’s currency with an exchange buffer', 'AI checks closures, guide clashes, vehicle size and margin'], [3]],
  ['rates', 'Rates & masters', 'Your contracts, finally in one place', 'Every hotel, vehicle, guide and entry ticket with its seasons, supplements and policies.',
    ['Hotels: room types × seasons, meal plans, extra beds, weekend and gala supplements', 'Cancellation slabs and guarantee policies', 'Transport per km, transfers and local packages', 'Guides, monuments, activities and restaurants'], []],
  ['partners', 'Affiliate partners', 'Manage every ground partner', 'Keep rate cards, contracts and payment terms for every local partner in one record.',
    ['Rate cards with conditional charges', 'Contract dates and renewal alerts', 'Payment terms and service levels', 'Booking history per partner'], []],
  ['bookings', 'Bookings & vouchers', 'Confirm once, book everything', 'When the client says yes, every supplier request goes out together and the desk tracks each reply.',
    ['One click creates every supplier request', 'Paste a supplier reply; status and confirmation number update', 'Vouchers and reminders run on your rules (for example, 90 days before)'], [1]],
  ['dispatch', 'Dispatch & guides', 'The day, organised', 'See who is where, every day, without phoning around.',
    ['Daily duty roster for drivers, guides and airport teams', 'Guide calendar that shows leave and double bookings', 'Duty slips on WhatsApp'], []],
  ['finance', 'Finance', 'Know who owes what', 'Invoices, part payments and supplier payables, with profit per file. Powered by TripLooom Payments.',
    ['Full and part invoices in INR, EUR, USD, GBP and more', 'Payments, ageing and reminders', 'Supplier payables and profit per file'], []],
  ['marketing', 'Marketing', 'Bring travellers back', 'Stay in touch with past and future travellers from the same place you sell to them.',
    ['Email newsletters via Brevo, Mailchimp or Zoho', 'WhatsApp broadcasts with approved templates', 'Schedule Facebook and Instagram posts', 'Automated follow-up journeys'], []],
];

export default function Product() {
  useMeta('Features — Quotes, Bookings, Finance & Marketing | TripLooom', 'See every module: quote studio, rate masters, bookings desk, dispatch, finance and marketing for tour operators.');
  return (
    <>
      <section className="band" style={{ paddingBottom: 48 }}>
        <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 900 }}>
          <span className="eyebrow">Product</span>
          <h1 style={{ fontSize: 'clamp(34px,5vw,58px)', lineHeight: 1.05, fontWeight: 700 }}>One workspace for the whole tour, from first enquiry to final invoice.</h1>
          <p className="lead" style={{ color: 'var(--ink-soft)' }}>See how TripLooom handles each part of your day.</p>
          <div className="btns"><Link className="b o" to="/contact">Book a free demo</Link><Link className="b line" to="/login">Log in</Link></div>
        </div>
      </section>
      <nav className="tabs" aria-label="Modules"><div className="wrap">{MODS.map(([id, n]) => <a key={id} href={`#${id}`}>{n}</a>)}</div></nav>
      <section>
        <div className="wrap">
          {MODS.map(([id, name, h, copy, bullets, ai]) => (
            <div className="mod" id={id} key={id}>
              <div className="copy">
                <span className="tag">{name}</span>
                <h3>{h}</h3>
                <p className="lead" style={{ color: 'var(--ink-soft)', fontSize: 17 }}>{copy}</p>
                <ul className="ticks">{bullets.map((b, k) => <li key={b}>{b}{ai.includes(k) && <>&nbsp;<Spark /></>}</li>)}</ul>
                {id === 'finance' && <Link to="/payments" style={{ fontWeight: 600, color: 'var(--orange-d)' }}>See TripLooom Payments →</Link>}
              </div>
              <div className="mod-vis"><ModuleVisual kind={id} /></div>
            </div>
          ))}
        </div>
      </section>
      <section className="band tight" id="more" style={{ background: 'var(--paper-2)' }}>
        <div className="wrap">
          <div className="sec-head" style={{ marginBottom: 28 }}><span className="eyebrow">Also included</span><h2 style={{ fontSize: 'clamp(24px,3vw,32px)' }}>The things that make a team work.</h2></div>
          <div className="grid4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
            {[['user', 'Traveller dashboard with OTP login'], ['bell', 'Team notifications and @mentions'], ['team', 'Branches, roles and permissions'], ['chart', 'Reports and AI insights'], ['globe', 'Travel news on your home screen']].map(([ic, t]) => (
              <div className="card" key={t} style={{ flexDirection: 'row', alignItems: 'center', padding: 18 }}><span className="ico t"><I n={ic} /></span><b style={{ fontSize: 15.5 }}>{t}</b></div>))}
          </div>
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span className="eyebrow">Works with</span>
            <div className="chips">{['WhatsApp Business', 'Gmail', 'Razorpay', 'CCAvenue', 'PayPal', 'Stripe', 'Brevo', 'Mailchimp', 'Zoho Campaigns', 'Facebook', 'Instagram', 'Tally'].map((x) => <span className="chip" key={x}>{x}</span>)}</div>
          </div>
        </div>
      </section>
      <ClosingBand title="See it with your own rates."><Link className="b o" to="/contact">Book a free demo</Link></ClosingBand>
    </>
  );
}
