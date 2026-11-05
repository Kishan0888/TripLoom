// Website details to fill before launch. Empty values are hidden on the site (nothing is shown as a placeholder).
export const SITE = {
  name: 'TravoCloud',
  tagline: 'The operating system for Indian tour operators.',
  legalName: '',          // e.g. 'TravoCloud Technologies Pvt Ltd' (shown in the footer and legal pages)
  salesEmail: '',         // e.g. 'hello@your-domain'
  supportEmail: '',       // e.g. 'support@your-domain'
  whatsapp: '',           // digits with country code, e.g. '919800000000' (enables the WhatsApp button)
  phoneDisplay: '',       // e.g. '+91 98000 00000'
  address: '',            // office address
  linkedin: '',           // full URL
  instagram: '',          // full URL
  trialDays: 14,
};

export const waLink = (msg = 'Hi, I’d like a demo of TravoCloud') =>
  SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(msg)}` : null;
