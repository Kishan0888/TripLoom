import { Link, useSearchParams } from 'react-router-dom';
import { DemoForm } from '../DemoForm';
import { I, useMeta } from '../SiteLayout';
import { SITE, waLink } from '../site.config';

export default function Contact() {
  useMeta('Book a Demo | TravoCloud', 'Talk to our team and see TravoCloud with your own rates. We reply on WhatsApp within one working hour.');
  const [sp] = useSearchParams();
  const intent = ['trial', 'payments'].includes(sp.get('intent')) ? sp.get('intent') : 'demo';
  const wa = waLink();

  return (
    <>
      <section className="band">
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 48, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <span className="eyebrow">About TravoCloud</span>
            <h1 style={{ fontSize: 'clamp(32px,4.4vw,52px)', lineHeight: 1.07, fontWeight: 700 }}>Built with tour operators, for tour operators.</h1>
            <p className="lead" style={{ color: 'var(--ink-soft)' }}>We spoke to operators across India who were running million-rupee groups on WhatsApp threads and Excel sheets. TravoCloud started from their lists of what goes wrong (missed enquiries, slow quotes, unconfirmed suppliers, unpaid balances) and fixes them in one workspace. We’re an Indian team, and we answer on WhatsApp.</p>
            <div className="grid3" style={{ gap: 12 }}>
              {[['user', 'Operator-first'], ['wallet', 'Honest pricing'], ['shield', 'Your data stays yours']].map(([ic, t]) => (
                <div className="card" key={t} style={{ padding: 16, gap: 8 }}><span className="ico t" style={{ width: 38, height: 38 }}><I n={ic} /></span><b>{t}</b></div>))}
            </div>
            <div className="card" style={{ gap: 12 }}>
              <h3>Contact</h3>
              {SITE.salesEmail && <div className="mk-crow"><b>Sales</b><a href={`mailto:${SITE.salesEmail}`}>{SITE.salesEmail}</a></div>}
              {SITE.paymentsEmail && <div className="mk-crow"><b>Payments</b><a href={`mailto:${SITE.paymentsEmail}`}>{SITE.paymentsEmail}</a></div>}
              {SITE.supportEmail && <div className="mk-crow"><b>Support</b><a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a></div>}
              {SITE.phoneDisplay && <div className="mk-crow"><b>Phone</b><span><a href={`tel:${SITE.phoneDisplay.replace(/\s/g, '')}`}>{SITE.phoneDisplay}</a><span className="muted"> · Mon–Sat, 10:00–19:00 IST</span></span></div>}
              {SITE.address && <div className="mk-crow"><b>Office</b><span>{SITE.address}</span></div>}
              <p style={{ color: 'var(--ink-soft)' }}>Existing customer? <Link to="/login" style={{ fontWeight: 600, color: 'var(--orange-d)' }}>Log in</Link></p>
              {wa && <a className="b teal sm" style={{ alignSelf: 'flex-start' }} href={wa} target="_blank" rel="noreferrer">Chat on WhatsApp</a>}
            </div>
          </div>

          <div id="form" style={{ scrollMarginTop: 90 }}>
            <div className="form">
              <div><h2 style={{ fontSize: 26 }}>{intent === 'trial' ? `Start your ${SITE.trialDays}-day free trial` : intent === 'payments' ? 'See TravoCloud Payments' : 'Book a demo'}</h2>
                <p style={{ color: 'var(--ink-soft)', marginTop: 6 }}>{intent === 'trial' ? 'Tell us about your team and we’ll set up your workspace.' : 'A 30-minute walkthrough with your own rates and workflow.'}</p></div>
              <DemoForm intent={intent} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
