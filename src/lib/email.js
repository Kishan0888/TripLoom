import { callFunction } from './supabase';

// Emails an invoice or a payment reminder through the organisation's own SMTP mailbox.
// Never throws: returns { sent, to, reason, error } so callers can show a helpful message.
export async function emailInvoice(invoiceId, kind = 'invoice') {
  try {
    return await callFunction('mailer', { action: 'send_invoice', invoice_id: invoiceId, kind, origin: window.location.origin });
  } catch (e) {
    return { sent: false, reason: 'failed', error: e.message };
  }
}

// One-line message for a toast after an email attempt.
export function emailToast(res, what = 'Invoice') {
  if (res.sent) return `${what} emailed to ${res.to}`;
  if (res.reason === 'not_configured') return `${what} not emailed: set up your mailbox in Settings → Email.`;
  return `${what} not emailed: ${res.error || 'please try again.'}`;
}

// Common mailbox settings. Supabase blocks ports 25 and 587, so only 465 (SSL) and 2525 are offered.
export const SMTP_PRESETS = [
  { id: 'gmail', name: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 465, hint: 'Use an app password (Google Account → Security → 2-Step Verification → App passwords), not your normal password.' },
  { id: 'zoho-in', name: 'Zoho Mail (India)', host: 'smtp.zoho.in', port: 465, hint: 'Use your Zoho email and password, or an app-specific password if 2FA is on.' },
  { id: 'zoho', name: 'Zoho Mail (global)', host: 'smtp.zoho.com', port: 465, hint: 'Use your Zoho email and password, or an app-specific password if 2FA is on.' },
  { id: 'hostinger', name: 'Hostinger', host: 'smtp.hostinger.com', port: 465, hint: 'Use the full email address and its mailbox password.' },
  { id: 'godaddy', name: 'GoDaddy (Professional Email)', host: 'smtpout.secureserver.net', port: 465, hint: 'Use the full email address and its mailbox password.' },
  { id: 'brevo', name: 'Brevo', host: 'smtp-relay.brevo.com', port: 2525, hint: 'Use your Brevo SMTP login and SMTP key (Brevo → SMTP & API).' },
  { id: 'other', name: 'Other provider', host: '', port: 465, hint: 'Ask your email provider for SMTP over SSL on port 465, or port 2525.' },
];
