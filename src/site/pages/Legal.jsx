import { Link } from 'react-router-dom';
import { useMeta } from '../SiteLayout';
import { SITE } from '../site.config';

const COMPANY = () => SITE.legalName || 'TravoCloud';
const CONTACT = () => SITE.supportEmail || SITE.salesEmail;
const UPDATED = '4 November 2026';

function Shell({ title, children }) {
  return (
    <section className="band">
      <div className="wrap"><article className="legal">
        <span className="eyebrow">Legal</span>
        <h1 style={{ marginTop: 12 }}>{title}</h1>
        <p className="muted">Last updated {UPDATED}</p>
        <div className="draft">This is a working draft for launch and should be reviewed by a lawyer before it is relied on.</div>
        {children}
        <h2>Contact</h2>
        <p>Questions about this policy can be sent {CONTACT() ? <>to <a href={`mailto:${CONTACT()}`}>{CONTACT()}</a></> : <>through our <Link to="/contact#form">contact form</Link></>}.</p>
      </article></div>
    </section>
  );
}

export function Privacy() {
  useMeta('Privacy Policy | TravoCloud', 'How TravoCloud collects, uses and protects personal data.');
  return (
    <Shell title="Privacy Policy">
      <p>This policy explains how {COMPANY()} (“TravoCloud”, “we”) collects, uses and protects personal data when you visit our website or use the TravoCloud software, including TravoCloud Payments. We follow India’s Digital Personal Data Protection Act, 2023 (DPDP Act).</p>
      <h2>Who is responsible for your data</h2>
      <p>For data about our customers (tour operators and their staff) and website visitors, TravoCloud is the data fiduciary. For data that our customers enter about their own travellers (names, contact details, trips, invoices and payments), the tour operator is the data fiduciary and TravoCloud processes that data on their behalf and on their instructions.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, work email, phone number, company name, role and login credentials.</li>
        <li>Demo and trial requests: the details you submit through our forms.</li>
        <li>Business data our customers store in TravoCloud: customers and travellers, enquiries, quotes, invoices, payment records and bank-credit references.</li>
        <li>Payment gateway credentials that customers connect, stored on our servers and never shown in the browser after saving.</li>
        <li>Technical data: device, browser, IP address and usage logs needed to run and secure the service.</li>
      </ul>
      <p>We do not collect or store card numbers, UPI PINs or bank passwords. Payments are entered directly on the payment gateway’s own page.</p>
      <h2>Why we use it</h2>
      <ul>
        <li>To provide, maintain and secure the service and support our customers.</li>
        <li>To process and record payments made through our customers’ connected gateways.</li>
        <li>To respond to demo requests and contact you on WhatsApp and email where you have agreed to this.</li>
        <li>To meet legal, tax and accounting obligations.</li>
      </ul>
      <h2>Sharing</h2>
      <p>We share data only with service providers we need to run TravoCloud: cloud hosting and database providers, the payment gateways our customers choose (such as Razorpay, CCAvenue, PayU, Cashfree, PayPal and Stripe), and messaging providers such as Meta’s WhatsApp Business Platform and email services. We do not sell personal data.</p>
      <h2>Where data is stored and how it is protected</h2>
      <p>Our database is hosted in India (Mumbai region). Each customer’s records are isolated at the database level, access is limited by role, connections are encrypted, and gateway secrets are kept server-side.</p>
      <h2>How long we keep data</h2>
      <p>We keep account and business data for as long as the account is active and as required by law (for example, tax and accounting records). Customers can export their data before closing an account; after closure we delete or anonymise it within a reasonable period unless we must keep it by law.</p>
      <h2>Your rights</h2>
      <p>Under the DPDP Act you can ask to access, correct or erase your personal data, withdraw consent, and nominate another person to exercise your rights. Travellers should contact the tour operator that holds their booking first; we will help that operator respond. You may also raise a complaint with the Data Protection Board of India.</p>
      <h2>Cookies</h2>
      <p>We use cookies and local storage needed to keep you signed in. If we add analytics cookies, we will ask for your consent first.</p>
      <h2>Changes</h2>
      <p>We may update this policy and will show the date of the latest version at the top of this page.</p>
    </Shell>
  );
}

export function Terms() {
  useMeta('Terms of Service | TravoCloud', 'The terms for using the TravoCloud website and software.');
  return (
    <Shell title="Terms of Service">
      <p>These terms govern your use of the TravoCloud website and software, including TravoCloud Payments, provided by {COMPANY()}. By creating an account or using the service you agree to them on behalf of yourself and the business you represent.</p>
      <h2>The service</h2>
      <p>TravoCloud is software for tour operators to manage enquiries, quotes, bookings, invoices, payment links and reconciliation. We may improve or change features over time; we will tell you in advance about changes that materially reduce what your plan includes.</p>
      <h2>Accounts and access</h2>
      <ul>
        <li>You are responsible for your users, their roles and keeping login details confidential.</li>
        <li>You must give accurate information and keep it up to date.</li>
        <li>Tell us promptly if you suspect unauthorised access.</li>
      </ul>
      <h2>Subscriptions and payment</h2>
      <p>Paid plans are billed monthly or annually in advance, in Indian rupees, plus GST. Prices are listed on our <Link to="/pricing">pricing page</Link>. Plans renew automatically unless cancelled before the renewal date. Refunds are covered by our <Link to="/refunds">Refund &amp; Cancellation Policy</Link>.</p>
      <h2>Payment gateways</h2>
      <p>TravoCloud Payments connects to payment gateway accounts that you own. Your agreement with each gateway (including its fees, settlement times, chargebacks and refunds to your customers) is between you and that gateway. TravoCloud does not hold, receive or transfer your funds and is not responsible for a gateway’s decisions, downtime or settlement delays. You are responsible for the accuracy of the invoices you send and for refunds to your own travellers.</p>
      <h2>Your data</h2>
      <p>You own the data you put into TravoCloud. You give us permission to host and process it only to provide the service, as described in our <Link to="/privacy">Privacy Policy</Link>. You must have the right to share any traveller data you enter.</p>
      <h2>Acceptable use</h2>
      <ul>
        <li>No unlawful, fraudulent or misleading invoices or payment requests.</li>
        <li>No spam; WhatsApp and email messaging must follow Meta’s and your email provider’s rules.</li>
        <li>No attempts to access other customers’ data, probe for vulnerabilities without permission, or disrupt the service.</li>
      </ul>
      <h2>Availability and support</h2>
      <p>We work to keep TravoCloud available and to fix problems quickly, but the service is provided “as is” and may occasionally be interrupted for maintenance or reasons beyond our control.</p>
      <h2>Liability</h2>
      <p>To the extent permitted by law, we are not liable for indirect or consequential losses, lost profits or lost data, and our total liability for any claim is limited to the fees you paid us in the 12 months before the claim.</p>
      <h2>Suspension and termination</h2>
      <p>You can cancel at any time. We may suspend or close accounts that breach these terms or fail to pay, after notice where reasonable. You can export your data before closure.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India, and courts in New Delhi have jurisdiction.</p>
    </Shell>
  );
}

export function Refunds() {
  useMeta('Refund & Cancellation Policy | TravoCloud', 'How cancellations and refunds work for TravoCloud subscriptions.');
  return (
    <Shell title="Refund & Cancellation Policy">
      <p>This policy covers payments made to {COMPANY()} for TravoCloud subscriptions. It does not cover payments that travellers make to tour operators through TravoCloud Payments; those are governed by each operator’s own booking and refund terms.</p>
      <h2>Free trial</h2>
      <p>New workspaces start with a {SITE.trialDays}-day free trial. No payment is taken during the trial and nothing is charged if you do not choose a plan.</p>
      <h2>Cancelling a subscription</h2>
      <ul>
        <li>You can cancel at any time from your account or by contacting us.</li>
        <li>Monthly plans: cancellation takes effect at the end of the current billing month. You keep access until then.</li>
        <li>Annual plans: cancellation stops the next renewal. You keep access until the end of the paid year.</li>
      </ul>
      <h2>Refunds</h2>
      <ul>
        <li>Annual plans cancelled within 7 days of the first payment receive a full refund.</li>
        <li>Otherwise, subscription fees already paid are not refunded for the remaining period, except where required by law or where we fail to provide the service as described.</li>
        <li>Founding-offer and discounted plans follow the same rules.</li>
        <li>If you were charged in error, tell us within 30 days and we will refund the incorrect amount.</li>
      </ul>
      <h2>How refunds are paid</h2>
      <p>Approved refunds are returned to the original payment method within 7–10 working days of approval. Timing after that depends on your bank or card issuer.</p>
      <h2>Payments to tour operators</h2>
      <p>If you are a traveller who paid a tour operator through a TravoCloud payment link, please contact that operator about cancellations and refunds. TravoCloud does not hold those funds.</p>
    </Shell>
  );
}
