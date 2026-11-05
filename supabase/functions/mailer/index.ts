// TravoCloud mailer
//   send_invoice  { invoice_id, kind: "invoice" | "reminder", origin }  member of the invoice's organisation
//   test_smtp     { org_id }                                             organisation owner (emails the caller)
//   test_platform {}                                                    platform admin (emails the caller)
//   notify_lead   { id }                                                public; emails a just-submitted website request to sales, once
// Organisation emails go out through that organisation's own SMTP mailbox. Supabase blocks ports 25 and 587, so 465 (SSL) or 2525 is used.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import nodemailer from "npm:nodemailer@6.9.14";
import { invoiceEmail, reminderEmail, testEmail, leadEmail } from "./emails.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const DEFAULT_APP = Deno.env.get("APP_URL") ?? "https://triploom-ochre.vercel.app";

function safeOrigin(o?: string | null) {
  try {
    const u = new URL(String(o)); const h = u.hostname;
    if ((u.protocol === "https:" && (h.endsWith(".vercel.app") || /(^|\.)travocloud\.[a-z.]+$/.test(h) || h.endsWith("triploom.in"))) || h === "localhost" || h === "127.0.0.1") return u.origin;
  } catch { /* fall through */ }
  return DEFAULT_APP;
}
const istToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

type Smtp = { host: string; port: number; username: string; password: string | null; from_name?: string | null; from_email: string; reply_to?: string | null };
function transport(c: Smtp) {
  return nodemailer.createTransport({
    host: c.host, port: c.port, secure: c.port === 465, requireTLS: c.port !== 465,
    auth: { user: c.username, pass: c.password ?? "" },
    connectionTimeout: 12000, greetingTimeout: 12000, socketTimeout: 20000,
  });
}
// Turns raw SMTP errors into something an operator can act on.
function friendly(e: unknown) {
  const m = String((e as any)?.message ?? e);
  if (/Invalid login|535|auth/i.test(m)) return "The mailbox rejected the username or password. For Gmail or Google Workspace, use an app password.";
  if (/ENOTFOUND|getaddrinfo|dns/i.test(m)) return "The SMTP server name could not be found. Check the host.";
  if (/ETIMEDOUT|timeout|ECONNREFUSED|ECONNRESET/i.test(m)) return "Could not connect to the SMTP server. Check the host and use port 465 (SSL) or 2525.";
  if (/certificate|SSL|TLS|wrong version/i.test(m)) return "Secure connection failed. Port 465 needs SSL; try 2525 if your provider supports it.";
  if (/sender|from address|not owned|553|550/i.test(m)) return `The mailbox refused to send from this address: ${m.slice(0, 160)}`;
  return m.slice(0, 220);
}

async function caller(req: Request) {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data } = await db.auth.getUser(jwt);
  return data?.user ?? null;
}
async function roleIn(orgId: string, userId: string) {
  const { data } = await db.from("org_members").select("role, organizations!inner(status)").eq("org_id", orgId).eq("user_id", userId).maybeSingle();
  return data && (data as any).organizations?.status === "active" ? (data as any).role as string : null;
}

/* ---------- invoice and reminder emails ---------- */
async function sendInvoice(req: Request, body: any) {
  const user = await caller(req);
  if (!user) return json({ error: "Please sign in again." }, 401);
  const kind = body.kind === "reminder" ? "reminder" : "invoice";
  const { data: inv } = await db.from("invoice_summary").select("*").eq("id", body.invoice_id).maybeSingle();
  if (!inv) return json({ error: "Invoice not found." }, 404);
  if (!(await roleIn(inv.org_id, user.id))) return json({ error: "You don’t have access to this invoice." }, 403);
  if (inv.status !== "sent") return json({ error: "Only sent invoices can be emailed." }, 400);
  if (kind === "reminder" && Number(inv.due) <= 0.005) return json({ error: "This invoice is paid in full." }, 400);

  const [{ data: org }, { data: smtp }, { data: cust }, { data: inst }] = await Promise.all([
    db.from("organizations").select("*").eq("id", inv.org_id).single(),
    db.from("smtp_configs").select("*").eq("org_id", inv.org_id).maybeSingle(),
    db.from("customers").select("name,email").eq("id", inv.customer_id).single(),
    db.from("instalment_status").select("*").eq("invoice_id", inv.id).order("position"),
  ]);
  if (!smtp || !smtp.enabled) return json({ sent: false, reason: "not_configured" });
  if (!cust?.email) return json({ sent: false, reason: "no_email", error: "This customer has no email address." });

  // avoid accidental double sends from repeated clicks
  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { count } = await db.from("email_log").select("id", { count: "exact", head: true }).eq("invoice_id", inv.id).eq("kind", kind).eq("status", "sent").gte("created_at", since);
  if ((count ?? 0) > 0) return json({ sent: false, reason: "recent", error: `This ${kind} was emailed less than 2 minutes ago.` });

  const next = (inst ?? []).find((s: any) => s.status !== "paid");
  const payUrl = `${safeOrigin(body.origin)}/p/${inv.public_token}`;
  const mail = kind === "reminder" ? reminderEmail(org, inv, cust.name, next, payUrl, istToday()) : invoiceEmail(org, inv, cust.name, next, payUrl);
  try {
    await transport(smtp).sendMail({
      from: { name: smtp.from_name || org.name, address: smtp.from_email }, to: { name: cust.name, address: cust.email },
      replyTo: smtp.reply_to || smtp.from_email, subject: mail.subject, html: mail.html, text: mail.text,
    });
  } catch (e) {
    const err = friendly(e);
    await Promise.all([
      db.from("email_log").insert({ org_id: inv.org_id, invoice_id: inv.id, kind, to_email: cust.email, status: "failed", error: err, actor: user.id }),
      db.from("activity").insert({ org_id: inv.org_id, invoice_id: inv.id, text: `${kind === "reminder" ? "Reminder" : "Invoice"} email to ${cust.email} failed: ${err}`, actor: user.id }),
      db.from("smtp_configs").update({ last_error: err }).eq("org_id", inv.org_id),
    ]);
    return json({ sent: false, reason: "failed", error: err });
  }
  await Promise.all([
    db.from("email_log").insert({ org_id: inv.org_id, invoice_id: inv.id, kind, to_email: cust.email, status: "sent", actor: user.id }),
    db.from("activity").insert({ org_id: inv.org_id, invoice_id: inv.id, text: `${kind === "reminder" ? "Payment reminder" : "Invoice"} emailed to ${cust.email}`, actor: user.id }),
    db.from("smtp_configs").update({ last_error: null, verified_at: smtp.verified_at ?? new Date().toISOString() }).eq("org_id", inv.org_id),
  ]);
  return json({ sent: true, to: cust.email });
}

/* ---------- test emails ---------- */
async function testSmtp(req: Request, body: any) {
  const user = await caller(req);
  if (!user) return json({ error: "Please sign in again." }, 401);
  if ((await roleIn(body.org_id, user.id)) !== "owner") return json({ error: "Only the organisation owner can test email settings." }, 403);
  const [{ data: org }, { data: smtp }] = await Promise.all([
    db.from("organizations").select("*").eq("id", body.org_id).single(),
    db.from("smtp_configs").select("*").eq("org_id", body.org_id).maybeSingle(),
  ]);
  if (!smtp) return json({ error: "Save your email settings first." }, 400);
  const mail = testEmail(org);
  try {
    await transport(smtp).sendMail({ from: { name: smtp.from_name || org.name, address: smtp.from_email }, to: user.email, replyTo: smtp.reply_to || smtp.from_email, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (e) {
    const err = friendly(e);
    await db.from("smtp_configs").update({ last_error: err, verified_at: null }).eq("org_id", body.org_id);
    return json({ ok: false, error: err });
  }
  await Promise.all([
    db.from("smtp_configs").update({ last_error: null, verified_at: new Date().toISOString() }).eq("org_id", body.org_id),
    db.from("email_log").insert({ org_id: body.org_id, kind: "test", to_email: user.email, status: "sent", actor: user.id }),
  ]);
  return json({ ok: true, to: user.email });
}

async function testPlatform(req: Request) {
  const user = await caller(req);
  if (!user) return json({ error: "Please sign in again." }, 401);
  const { data: pa } = await db.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!pa) return json({ error: "Platform admins only." }, 403);
  const { data: c } = await db.from("platform_mail").select("*").eq("id", 1).single();
  if (!c?.host || !c?.from_email) return json({ error: "Save the mailbox settings first." }, 400);
  try {
    await transport(c).sendMail({ from: { name: c.from_name || "TravoCloud Website", address: c.from_email }, to: c.lead_email,
      subject: "Test: website demo requests will arrive here", text: "This mailbox will receive demo requests from the TravoCloud website." });
  } catch (e) {
    const err = friendly(e);
    await db.from("platform_mail").update({ last_error: err, verified_at: null }).eq("id", 1);
    return json({ ok: false, error: err });
  }
  await db.from("platform_mail").update({ last_error: null, verified_at: new Date().toISOString() }).eq("id", 1);
  return json({ ok: true, to: c.lead_email });
}

/* ---------- website demo requests → sales ---------- */
async function notifyLead(body: any) {
  if (!/^[0-9a-f-]{36}$/i.test(String(body.id ?? ""))) return json({ ok: true });
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: r } = await db.from("demo_requests").select("*").eq("id", body.id).is("notified_at", null).gte("created_at", since).maybeSingle();
  if (!r) return json({ ok: true });
  const { data: c } = await db.from("platform_mail").select("*").eq("id", 1).single();
  if (!c?.enabled || !c.host || !c.from_email) return json({ ok: true, delivered: false });
  const mail = leadEmail(r);
  try {
    await transport(c).sendMail({ from: { name: c.from_name || "TravoCloud Website", address: c.from_email }, to: c.lead_email,
      replyTo: { name: r.full_name, address: r.email }, subject: mail.subject, html: mail.html, text: mail.text });
    await db.from("demo_requests").update({ notified_at: new Date().toISOString() }).eq("id", r.id);
    return json({ ok: true, delivered: true });
  } catch (e) {
    await db.from("platform_mail").update({ last_error: friendly(e) }).eq("id", 1);
    return json({ ok: true, delivered: false });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Not found" }, 404);
  try {
    const body = await req.json();
    if (body.action === "send_invoice") return await sendInvoice(req, body);
    if (body.action === "test_smtp") return await testSmtp(req, body);
    if (body.action === "test_platform") return await testPlatform(req);
    if (body.action === "notify_lead") return await notifyLead(body);
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
