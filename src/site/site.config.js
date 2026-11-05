// Website details to fill before launch. Empty values are hidden on the site (nothing is shown as a placeholder).
export const SITE = {
  name: 'TravoCloud',
  tagline: 'The operating system for Indian tour operators.',
  legalName: '',          // e.g. 'TravoCloud Technologies Pvt Ltd' (shown in the footer and legal pages)
  salesEmail: 'sales@travocloud.com',
  paymentsEmail: 'payments@travocloud.com',
  supportEmail: '',       // optional separate support address
  whatsapp: '',           // digits with country code, e.g. '919800000000' (enables the WhatsApp button)
  phoneDisplay: '+91 99581 80214',
  address: '253, Third Floor, Shahpur Jat, New Delhi - 110049 (India)',
  linkedin: '',           // full URL
  instagram: '',          // full URL
  trialDays: 14,
};

export const waLink = (msg = 'Hi, I’d like a demo of TravoCloud') =>
  SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(msg)}` : null;
