// Email templates (plain HTML tables with inline styles so they render in Gmail, Outlook and phone mail apps).

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const SYM: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£", AUD: "A$", AED: "AED ", SGD: "S$", CAD: "C$" };
export function money(v: unknown, cur: string) {
  const n = Number(v) || 0;
  return (SYM[cur] ?? `${cur} `) + n.toLocaleString(cur === "INR" ? "en-IN" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fd(s: string | null | undefined) {
  if (!s) return "";
  const d = new Date(String(s).slice(0, 10) + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

type Org = { name: string; email?: string | null; phone?: string | null; address?: string | null; logo_url?: string | null };
type Inv = { number: string; trip: string; currency: string; total: number; paid: number; due: number; travel_date?: string | null; pax?: number; notes?: string | null };
type Inst = { label: string; due_date: string; amount: number; remaining: number; status: string };

function shell(org: Org, preheader: string, inner: string) {
  const head = org.logo_url
    ? `<img src="${esc(org.logo_url)}" alt="${esc(org.name)}" style="max-height:48px;max-width:220px;display:block;border:0">`
    : `<div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#1b275c">${esc(org.name)}</div>`;
  const contact = [org.email, org.phone].filter(Boolean).map(esc).join(" · ");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(preheader)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f8">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:12px;border:1px solid #e3e5ec">
<tr><td style="padding:24px 28px;border-bottom:3px solid #1b275c">${head}</td></tr>
<tr><td style="padding:28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a1d29">${inner}</td></tr>
<tr><td style="padding:18px 28px;background:#f7f8fb;border-top:1px solid #e3e5ec;border-radius:0 0 12px 12px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.5;color:#6b7187">
<b style="color:#1a1d29">${esc(org.name)}</b>${contact ? `<br>${contact}` : ""}${org.address ? `<br>${esc(org.address)}` : ""}
<br><span style="color:#9aa0b4">Sent with TravoCloud Payments</span></td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 10px"><tr><td style="background:#26357a;border-radius:8px">
<a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">${esc(label)}</a></td></tr></table>`;
}

function summary(inv: Inv, next?: Inst) {
  const row = (k: string, v: string, strong = false) =>
    `<tr><td style="padding:7px 0;color:#6b7187;font-size:14px">${k}</td><td align="right" style="padding:7px 0;font-size:14px;${strong ? "font-weight:700;color:#1a1d29" : ""}">${v}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-top:1px solid #e3e5ec;border-bottom:1px solid #e3e5ec">
${row("Invoice", esc(inv.number))}
${row("Trip", esc(inv.trip))}
${inv.travel_date ? row("Travel date", fd(inv.travel_date)) : ""}
${row("Invoice total", money(inv.total, inv.currency))}
${Number(inv.paid) > 0 ? row("Paid so far", money(inv.paid, inv.currency)) : ""}
${row("Balance due", money(Math.max(0, inv.due), inv.currency), true)}
${next ? row(`Next: ${esc(next.label)}`, `${money(next.remaining, inv.currency)} · due ${fd(next.due_date)}`, true) : ""}
</table>`;
}

export function invoiceEmail(org: Org, inv: Inv, customerName: string, next: Inst | undefined, payUrl: string) {
  const first = esc((customerName || "").split(" ")[0] || "there");
  const subject = `Invoice ${inv.number} from ${org.name}`;
  const inner = `<p style="margin:0 0 12px">Dear ${first},</p>
<p style="margin:0">Thank you for booking with ${esc(org.name)}. Your invoice for <b>${esc(inv.trip)}</b> is ready.${next ? ` The next payment is <b>${money(next.remaining, inv.currency)}</b>, due on <b>${fd(next.due_date)}</b>.` : ""}</p>
${summary(inv, next)}
${inv.notes ? `<p style="margin:0 0 6px;color:#4a5068;font-size:14px">${esc(inv.notes)}</p>` : ""}
${button(payUrl, "View invoice and pay")}
<p style="margin:0;font-size:13px;color:#6b7187">You can pay the next instalment or the full balance securely online. <a href="${esc(payUrl)}/invoice" style="color:#26357a">Download the invoice (PDF)</a>.</p>`;
  const text = `Dear ${(customerName || "").split(" ")[0] || "there"},

Your invoice ${inv.number} for ${inv.trip} from ${org.name} is ready.
Invoice total: ${money(inv.total, inv.currency)}
Balance due: ${money(Math.max(0, inv.due), inv.currency)}${next ? `\nNext payment: ${money(next.remaining, inv.currency)} due ${fd(next.due_date)} (${next.label})` : ""}

View and pay: ${payUrl}
Download the invoice (PDF): ${payUrl}/invoice

${org.name}${org.email ? `\n${org.email}` : ""}${org.phone ? `\n${org.phone}` : ""}`;
  return { subject, html: shell(org, `Invoice ${inv.number}: ${money(Math.max(0, inv.due), inv.currency)} due`, inner), text };
}

export function reminderEmail(org: Org, inv: Inv, customerName: string, next: Inst | undefined, payUrl: string, today: string) {
  const first = esc((customerName || "").split(" ")[0] || "there");
  const overdue = next && next.due_date < today;
  const amount = next ? next.remaining : Math.max(0, inv.due);
  const subject = overdue
    ? `Payment overdue: ${inv.number} · ${money(amount, inv.currency)}`
    : `Payment reminder: ${inv.number} · ${money(amount, inv.currency)}${next ? ` due ${fd(next.due_date)}` : ""}`;
  const line = next
    ? (overdue
      ? `the <b>${esc(next.label.toLowerCase())}</b> of <b>${money(amount, inv.currency)}</b> for <b>${esc(inv.trip)}</b> was due on <b>${fd(next.due_date)}</b> and is still unpaid.`
      : `the <b>${esc(next.label.toLowerCase())}</b> of <b>${money(amount, inv.currency)}</b> for <b>${esc(inv.trip)}</b> is due on <b>${fd(next.due_date)}</b>.`)
    : `a balance of <b>${money(amount, inv.currency)}</b> for <b>${esc(inv.trip)}</b> is still due.`;
  const inner = `<p style="margin:0 0 12px">Dear ${first},</p>
<p style="margin:0">This is a friendly reminder that ${line} If you have already paid, please ignore this email.</p>
${summary(inv, next)}
${button(payUrl, "Pay now")}
<p style="margin:0;font-size:13px;color:#6b7187">Questions? Just reply to this email. <a href="${esc(payUrl)}/invoice" style="color:#26357a">Download the invoice (PDF)</a>.</p>`;
  const text = `Dear ${(customerName || "").split(" ")[0] || "there"},

This is a friendly reminder about invoice ${inv.number} for ${inv.trip}.
${next ? `${next.label}: ${money(amount, inv.currency)} ${overdue ? "was due" : "due"} ${fd(next.due_date)}` : `Balance due: ${money(amount, inv.currency)}`}
If you have already paid, please ignore this email.

Pay now: ${payUrl}

${org.name}${org.email ? `\n${org.email}` : ""}${org.phone ? `\n${org.phone}` : ""}`;
  return { subject, html: shell(org, subject, inner), text };
}

export function testEmail(org: Org) {
  const subject = `Test email from ${org.name} on TravoCloud`;
  const inner = `<p style="margin:0 0 12px">Your email settings work.</p>
<p style="margin:0">Invoices and payment reminders from ${esc(org.name)} will now be sent from this mailbox, so customers see your name and can reply to you directly.</p>`;
  return { subject, html: shell(org, subject, inner), text: `Your email settings work. Invoices and reminders from ${org.name} will be sent from this mailbox.` };
}

export function leadEmail(r: Record<string, any>) {
  const rows: [string, unknown][] = [["Name", r.full_name], ["Company", r.company], ["Email", r.email], ["Mobile / WhatsApp", r.phone], ["City", r.city],
    ["Business type", r.business_type], ["Team size", r.team_size], ["Plan of interest", r.plan], ["Software used today", r.current_software],
    ["Preferred demo time", r.preferred_time ? new Date(r.preferred_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST" : null],
    ["Message", r.message], ["Source", { demo: "Book a demo", trial: "Free trial request", payments: "Payments demo", pricing: "Pricing page" }[r.intent as string] ?? r.intent]];
  const filled = rows.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "");
  const subject = `New demo request: ${r.full_name} · ${r.company}${r.plan ? ` (${r.plan})` : ""}`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f3ec;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e2dccd;border-radius:12px">
<tr><td style="padding:20px 24px;background:#0f2a33;border-radius:12px 12px 0 0;color:#f6f3ec;font-size:18px;font-weight:700">New demo request</td></tr>
<tr><td style="padding:20px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${filled.map(([k, v]) => `<tr><td style="padding:8px 0;color:#6a7a80;font-size:13.5px;width:160px;vertical-align:top">${esc(k)}</td><td style="padding:8px 0;font-size:14.5px;color:#0f2a33">${esc(v)}</td></tr>`).join("")}
</table><p style="margin:16px 0 0;font-size:13px;color:#6a7a80">Reply to this email to answer ${esc(r.full_name)} directly.</p></td></tr></table></body></html>`;
  const text = filled.map(([k, v]) => `${k}: ${v}`).join("\n");
  return { subject, html, text };
}
