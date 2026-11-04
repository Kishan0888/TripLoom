import { FUNCTIONS_URL } from './supabase';

const GW = `${FUNCTIONS_URL}/gateway`;

// What each gateway needs to take a payment. `secret` fields are stored server-side only.
export const PROVIDERS = {
  razorpay: {
    name: 'Razorpay', mark: 'Rz', color: '#2b6fe8',
    blurb: 'Cards, UPI, net banking and wallets. International cards in 100+ currencies.',
    where: 'Razorpay Dashboard → Account & Settings → API Keys (generate a key pair). For the webhook: Settings → Webhooks.',
    currencies: ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'AED', 'SGD', 'CAD'], fee: 2,
    fields: [
      { k: 'key_id', label: 'Key ID', ph: 'rzp_live_XXXXXXXXXXXX', required: true },
      { k: 'key_secret', label: 'Key secret', secret: true, required: true },
      { k: 'webhook_secret', label: 'Webhook secret', secret: true, hint: 'Optional but recommended: confirms payments even if the traveller closes the window.' },
    ],
    urls: [{ label: 'Webhook URL (event: payment.captured)', value: `${GW}/webhook/razorpay` }],
    envNote: 'Use rzp_test_ keys in Test and rzp_live_ keys in Live.',
  },
  ccavenue: {
    name: 'CCAvenue', mark: 'CCA', color: '#e06b1c',
    blurb: 'Cards, net banking, UPI and wallets. Multi-currency for international travellers.',
    where: 'CCAvenue M.A.R.S. dashboard → Settings → API Keys. You need all three: Merchant ID, Access Code and Working Key.',
    currencies: ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'AED', 'SGD', 'CAD'], fee: 3,
    fields: [
      { k: 'merchant_id', label: 'Merchant ID', ph: 'Numbers only, e.g. 2846193', required: true, pattern: /^\d+$/, patternMsg: 'Merchant ID is a number.' },
      { k: 'access_code', label: 'Access code', ph: 'e.g. AVKX52MK41AB83XKBA', required: true, pattern: /^[A-Z0-9]{10,}$/i, patternMsg: 'Access code is a letters-and-numbers code from CCAvenue, not an email.' },
      { k: 'working_key', label: 'Working key', secret: true, required: true },
    ],
    urls: [{ label: 'Redirect URL and cancel URL', value: `${GW}/return/ccavenue` }],
    envNote: 'Register the URL above and whitelist your payments domain with CCAvenue. Test keys work only in Test.',
  },
  payu: {
    name: 'PayU', mark: 'PayU', color: '#a5c400',
    blurb: 'Cards, UPI, net banking, EMI and wallets for Indian payments.',
    where: 'PayU Dashboard → Developers → API Keys: Merchant Key and Merchant Salt (v1).',
    currencies: ['INR'], fee: 2,
    fields: [
      { k: 'merchant_key', label: 'Merchant key', required: true },
      { k: 'salt', label: 'Merchant salt', secret: true, required: true },
    ],
    urls: [],
    envNote: 'Test keys go with Test, live keys with Live.',
  },
  cashfree: {
    name: 'Cashfree', mark: 'CF', color: '#6a3cc9',
    blurb: 'UPI, cards, net banking and pay later. Fast settlements in India.',
    where: 'Cashfree Merchant Dashboard → Payment Gateway → Developers → API Keys: App ID and Secret Key.',
    currencies: ['INR'], fee: 1.9,
    fields: [
      { k: 'app_id', label: 'App ID (client ID)', required: true },
      { k: 'secret_key', label: 'Secret key', secret: true, required: true },
    ],
    urls: [],
    envNote: 'Sandbox keys go with Test, production keys with Live.',
  },
  paypal: {
    name: 'PayPal', mark: 'PP', color: '#1f5fbf',
    blurb: 'PayPal balance and cards, trusted by travellers in the US, UK and Europe.',
    where: 'developer.paypal.com → Apps & Credentials → your app: Client ID and Secret (Sandbox or Live tab).',
    currencies: ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD'], fee: 4.4,
    fields: [
      { k: 'client_id', label: 'Client ID', required: true },
      { k: 'client_secret', label: 'Client secret', secret: true, required: true },
    ],
    urls: [],
    envNote: 'Sandbox credentials go with Test, Live credentials with Live. PayPal does not accept INR for international payments.',
  },
  stripe: {
    name: 'Stripe', mark: 'S', color: '#635bff',
    blurb: 'Cards, Apple Pay and Google Pay on a Stripe-hosted checkout page.',
    where: 'Stripe Dashboard → Developers → API keys: Secret key (sk_live_ or sk_test_).',
    currencies: ['USD', 'EUR', 'GBP', 'AUD', 'AED', 'SGD', 'CAD', 'INR'], fee: 3,
    fields: [
      { k: 'secret_key', label: 'Secret key', secret: true, required: true, ph: 'sk_live_…' },
    ],
    urls: [],
    envNote: 'Use sk_test_ keys in Test and sk_live_ keys in Live.',
  },
  custom: {
    name: 'Custom gateway', mark: '+', color: '#5b6476',
    blurb: 'Any other provider with a hosted payment page or payment link. Confirm payments by webhook or record them yourself.',
    where: 'Ask your provider for a payment page URL that accepts the amount and a reference.',
    currencies: ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'AED'], fee: 0,
    fields: [
      { k: 'payment_url', label: 'Payment page URL', required: true, ph: 'https://pay.example.com/checkout?amount={amount}&currency={currency}&ref={reference}',
        hint: 'Placeholders: {amount} {currency} {reference} {invoice} {name} {email} {return_url}', pattern: /^https:\/\//, patternMsg: 'The payment page URL must start with https://' },
    ],
    urls: [{ label: 'Webhook URL (POST JSON, signed)', value: `${GW}/webhook/custom` }],
    envNote: 'The traveller is sent to your provider. Payments are confirmed when your provider calls the webhook, or when you record them on the invoice.',
  },
};

export const PROVIDER_ORDER = ['razorpay', 'ccavenue', 'payu', 'cashfree', 'paypal', 'stripe', 'custom'];
export const GATEWAY_FN = GW;
export const providerName = (p) => PROVIDERS[p]?.name ?? (p === 'manual' ? 'Recorded manually' : p === 'demo' ? 'Demo' : p);

export function GatewayMark({ provider, size = 44 }) {
  const p = PROVIDERS[provider] || { mark: '?', color: '#888' };
  return (
    <span style={{ width: size, height: size, borderRadius: 10, background: p.color, color: '#fff', display: 'grid', placeItems: 'center',
      fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: p.mark.length > 2 ? 12 : 15, flex: 'none', letterSpacing: '-.02em' }}>{p.mark}</span>
  );
}

// Loads a third-party checkout script once.
export function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Could not load the payment window. Check your connection and try again.'));
    document.head.appendChild(s);
  });
}
