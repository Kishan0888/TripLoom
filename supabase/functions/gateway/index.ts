// TravoCloud Payments: one server function for every payment gateway.
//   POST /gateway/initiate            start a payment for an invoice (returns what the payment page should do next)
//   POST /gateway/verify/razorpay     confirm a Razorpay Checkout payment (signature check)
//   ANY  /gateway/return/<provider>   where the gateway sends the traveller back; verifies with the gateway, records, redirects
//   POST /gateway/webhook/<provider>  server-to-server confirmations (razorpay, custom)
//   POST /gateway/fail/razorpay       Razorpay Checkout reported a failed attempt; verified with Razorpay, then logged
// Attempts that do not complete (declined, failed, cancelled) are written to public.payment_failures for the invoice.
// Credentials are read from public.gateway_accounts with the service role; browsers never see secrets.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { createHash, createHmac, createCipheriv, createDecipheriv, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const db = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const FN = `${SUPABASE_URL}/functions/v1/gateway`;
const DEFAULT_APP = Deno.env.get("APP_URL") ?? "https://payments.triploom.in";

// Only send travellers back to our own app (production domain, Vercel previews, local dev).
function safeOrigin(o?: string | null) {
  if (!o) return DEFAULT_APP;
  try {
    const u = new URL(o); const h = u.hostname;
    if ((u.protocol === "https:" && (h === "payments.triploom.in" || h.endsWith(".triploom.in") || /(^|\.)travocloud\.[a-z.]+$/.test(h) || h.endsWith(".vercel.app"))) || h === "localhost" || h === "127.0.0.1") return u.origin;
  } catch { /* fall through */ }
  return DEFAULT_APP;
}
const hmacHex = (key: string, data: string) => createHmac("sha256", key).update(data).digest("hex");
const sha512 = (s: string) => createHash("sha512").update(s).digest("hex");
function eqHex(a: string, b: string) {
  try { const A = Buffer.from(a, "hex"), B = Buffer.from(b, "hex"); return A.length > 0 && A.length === B.length && timingSafeEqual(A, B); } catch { return false; }
}
const minor = (amt: number) => Math.round(amt * 100);
const basic = (u: string, p: string) => "Basic " + btoa(`${u}:${p}`);

// CCAvenue AES-128-CBC with md5(working key) and fixed IV 0..15, hex encoded
const IV = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
const ccKey = (wk: string) => createHash("md5").update(wk).digest();
const ccEncrypt = (t: string, wk: string) => { const c = createCipheriv("aes-128-cbc", ccKey(wk), IV); return c.update(t, "utf8", "hex") + c.final("hex"); };
const ccDecrypt = (h: string, wk: string) => { const d = createDecipheriv("aes-128-cbc", ccKey(wk), IV); return d.update(h, "hex", "utf8") + d.final("utf8"); };

type Ctx = { order: any; acct: any; token: string };
async function loadOrder(orderId: string | null | undefined): Promise<Ctx | null> {
  if (!orderId) return null;
  const { data: order } = await db.from("gateway_orders").select("*").eq("order_id", orderId).maybeSingle();
  if (!order) return null;
  const [{ data: acct }, { data: inv }] = await Promise.all([
    db.from("gateway_accounts").select("*").eq("id", order.gateway_id).maybeSingle(),
    db.from("invoices").select("public_token").eq("id", order.invoice_id).single(),
  ]);
  return { order, acct, token: inv?.public_token };
}
const backUrl = (ctx: Ctx, status: string) => `${safeOrigin(ctx.order.return_origin)}/p/${ctx.token}?status=${status}`;
const back = (ctx: Ctx, status: string) => Response.redirect(backUrl(ctx, status), 303);
async function mark(ctx: Ctx, status: string, response: unknown) {
  await db.from("gateway_orders").update({ status, response }).eq("order_id", ctx.order.order_id);
}
async function record(ctx: Ctx, amount: number, tracking: string | null, method: string, raw: unknown) {
  const { error } = await db.rpc("server_record_gateway_payment", {
    p_invoice: ctx.order.invoice_id, p_amount: amount, p_order: ctx.order.order_id, p_tracking: tracking,
    p_method: method, p_raw: raw, p_gateway: ctx.order.provider, p_gateway_id: ctx.order.gateway_id,
  });
  if (error) throw new Error(error.message);
}

// Writes a failed or cancelled attempt to the invoice's log. Never throws: logging must not block the traveller.
async function logFail(ctx: Ctx, status: "failed" | "cancelled", reason: string | null | undefined, method?: string | null, ref?: string | null, raw?: unknown, key?: string) {
  try {
    const { error } = await db.rpc("server_log_payment_failure", {
      p_invoice: ctx.order.invoice_id, p_provider: ctx.order.provider, p_gateway_id: ctx.order.gateway_id ?? null, p_order: ctx.order.order_id,
      p_ref: ref ?? null, p_amount: ctx.order.amount ?? null, p_currency: ctx.order.currency ?? null, p_status: status,
      p_reason: reason ? String(reason).slice(0, 300) : null, p_method: method ?? null, p_raw: raw ?? null,
      p_key: key ?? `${ctx.order.provider}:${ctx.order.order_id}:${status}`,
    });
    if (error) console.error("logFail", error.message);
  } catch (e) { console.error("logFail", e); }
}

/* ======================= start a payment ======================= */
async function initiate(req: Request) {
  const { token, mode, gateway_id, origin } = await req.json();
  const { data: inv } = await db.from("invoice_summary").select("*").eq("public_token", token).eq("status", "sent").maybeSingle();
  if (!inv) return json({ error: "This payment link is not valid." }, 404);
  const { data: org } = await db.from("organizations").select("*").eq("id", inv.org_id).single();
  if (org.status !== "active") return json({ error: "This payment link is not active." }, 400);
  if (org.payment_mode === "demo") return json({ demo: true });
  const { data: acct } = await db.from("gateway_accounts").select("*").eq("id", gateway_id).eq("org_id", inv.org_id).eq("enabled", true).maybeSingle();
  if (!acct || !acct.currencies.includes(inv.currency)) return json({ error: "This payment option isn’t available for this invoice." }, 400);
  const amount = Number(mode === "full" ? inv.due : (inv.next_due_amount ?? inv.due));
  if (!(amount > 0)) return json({ error: "Nothing is due on this invoice." }, 400);

  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => b.toString(16).padStart(2, "0")).join("");
  const orderId = ("TL" + Date.now().toString(36) + rnd).toUpperCase();
  const ret = `${FN}/return/${acct.provider}?o=${orderId}`;
  const appBack = `${safeOrigin(origin)}/p/${token}`;
  const pub = acct.public_config || {}, sec = acct.secret_config || {};
  const live = acct.environment === "live";
  const { data: cust } = await db.from("customers").select("name,email,phone").eq("id", inv.customer_id).single();
  const desc = `${org.name} · ${inv.number}`.slice(0, 120);
  await db.from("gateway_orders").insert({ order_id: orderId, org_id: inv.org_id, invoice_id: inv.id, amount, currency: inv.currency, provider: acct.provider, gateway_id: acct.id, return_origin: safeOrigin(origin) });
  const setRef = (ref: string) => db.from("gateway_orders").update({ gateway_ref: ref }).eq("order_id", orderId);
  const startCtx = { order: { order_id: orderId, invoice_id: inv.id, provider: acct.provider, gateway_id: acct.id, amount, currency: inv.currency } } as Ctx;
  const startFail = async (msg: string, raw: unknown) => {
    await db.from("gateway_orders").update({ status: "failed", response: raw }).eq("order_id", orderId);
    await logFail(startCtx, "failed", `Payment could not start. ${msg}`, null, null, raw, `${acct.provider}:${orderId}:start`);
    return json({ error: msg }, 400);
  };

  switch (acct.provider) {
    case "ccavenue": {
      const p = new URLSearchParams({ merchant_id: pub.merchant_id, order_id: orderId, currency: inv.currency, amount: amount.toFixed(2),
        redirect_url: ret, cancel_url: ret, language: "EN", billing_name: cust.name ?? "", billing_email: cust.email ?? "", billing_tel: cust.phone ?? "", merchant_param1: inv.number });
      return json({ type: "form", action: `https://${live ? "secure" : "test"}.ccavenue.com/transaction/transaction.do?command=initiateTransaction`,
        fields: { encRequest: ccEncrypt(p.toString(), sec.working_key), access_code: pub.access_code } });
    }
    case "razorpay": {
      const r = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: basic(pub.key_id, sec.key_secret), "Content-Type": "application/json" },
        body: JSON.stringify({ amount: minor(amount), currency: inv.currency, receipt: orderId, notes: { tl_order: orderId, invoice: inv.number } }) });
      const j = await r.json();
      if (!r.ok) return await startFail(`Razorpay: ${j.error?.description ?? "could not create the order"}`, j);
      await setRef(j.id);
      return json({ type: "razorpay", key_id: pub.key_id, rzp_order_id: j.id, amount: j.amount, currency: j.currency, name: org.name, description: inv.number,
        image: org.logo_url ?? undefined, prefill: { name: cust.name, email: cust.email, contact: cust.phone ?? "" }, order: orderId });
    }
    case "payu": {
      const firstname = (cust.name || "Customer").split(" ")[0], amt = amount.toFixed(2), productinfo = inv.number;
      const hash = sha512([pub.merchant_key, orderId, amt, productinfo, firstname, cust.email, orderId, "", "", "", "", "", "", "", "", "", sec.salt].join("|"));
      return json({ type: "form", action: live ? "https://secure.payu.in/_payment" : "https://test.payu.in/_payment",
        fields: { key: pub.merchant_key, txnid: orderId, amount: amt, productinfo, firstname, email: cust.email, phone: (cust.phone ?? "").replace(/\D/g, "").slice(-10) || "9999999999",
          surl: ret, furl: ret, udf1: orderId, hash } });
    }
    case "cashfree": {
      const base = live ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
      const phone = (cust.phone ?? "").replace(/\D/g, "").slice(-10);
      const r = await fetch(`${base}/orders`, { method: "POST",
        headers: { "x-client-id": pub.app_id, "x-client-secret": sec.secret_key, "x-api-version": "2023-08-01", "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, order_amount: Number(amount.toFixed(2)), order_currency: inv.currency, order_note: inv.number,
          customer_details: { customer_id: String(inv.customer_id).replace(/-/g, "").slice(0, 40), customer_name: cust.name, customer_email: cust.email, customer_phone: phone.length === 10 ? phone : "9999999999" },
          order_meta: { return_url: ret } }) });
      const j = await r.json();
      if (!r.ok) return await startFail(`Cashfree: ${j.message ?? "could not create the order"}`, j);
      await setRef(j.cf_order_id ? String(j.cf_order_id) : orderId);
      return json({ type: "cashfree", mode: live ? "production" : "sandbox", payment_session_id: j.payment_session_id });
    }
    case "paypal": {
      const base = live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
      const t = await fetch(`${base}/v1/oauth2/token`, { method: "POST", headers: { Authorization: basic(pub.client_id, sec.client_secret), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
      const tj = await t.json();
      if (!t.ok) return await startFail("PayPal: the client ID or secret was rejected.", tj);
      const r = await fetch(`${base}/v2/checkout/orders`, { method: "POST", headers: { Authorization: `Bearer ${tj.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "CAPTURE",
          purchase_units: [{ reference_id: orderId, invoice_id: orderId, description: desc, amount: { currency_code: inv.currency, value: amount.toFixed(2) } }],
          application_context: { brand_name: org.name.slice(0, 120), user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING", return_url: ret, cancel_url: `${ret}&cancel=1` } }) });
      const j = await r.json();
      if (!r.ok) return await startFail(`PayPal: ${j.details?.[0]?.description ?? j.message ?? "could not create the order"}`, j);
      await setRef(j.id);
      const link = (j.links || []).find((l: any) => l.rel === "approve" || l.rel === "payer-action");
      return json({ type: "redirect", url: link.href });
    }
    case "stripe": {
      const b = new URLSearchParams();
      b.set("mode", "payment"); b.set("client_reference_id", orderId); b.set("customer_email", cust.email);
      b.set("success_url", `${ret}&session_id={CHECKOUT_SESSION_ID}`); b.set("cancel_url", `${ret}&cancel=1`);
      b.set("line_items[0][quantity]", "1"); b.set("line_items[0][price_data][currency]", inv.currency.toLowerCase());
      b.set("line_items[0][price_data][unit_amount]", String(minor(amount))); b.set("line_items[0][price_data][product_data][name]", desc);
      b.set("metadata[tl_order]", orderId); b.set("payment_intent_data[metadata][tl_order]", orderId);
      const r = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${sec.secret_key}`, "Content-Type": "application/x-www-form-urlencoded" }, body: b });
      const j = await r.json();
      if (!r.ok) return await startFail(`Stripe: ${j.error?.message ?? "could not start checkout"}`, j);
      await setRef(j.id);
      return json({ type: "redirect", url: j.url });
    }
    case "custom": {
      const vals: Record<string, string> = { amount: amount.toFixed(2), currency: inv.currency, reference: orderId, invoice: inv.number,
        email: cust.email ?? "", name: cust.name ?? "", return_url: `${appBack}?status=pending` };
      const url = String(pub.payment_url || "").replace(/\{(\w+)\}/g, (m, k) => (k in vals ? encodeURIComponent(vals[k]) : m));
      if (!/^https:\/\//.test(url)) return json({ error: "This payment option is not set up correctly. Please contact the operator." }, 400);
      return json({ type: "redirect", url });
    }
  }
  return json({ error: "Unsupported gateway" }, 400);
}

/* ======================= Razorpay Checkout confirmation ======================= */
async function verifyRazorpay(req: Request) {
  const b = await req.json();
  const ctx = await loadOrder(b.order);
  if (!ctx || ctx.order.provider !== "razorpay" || ctx.order.gateway_ref !== b.razorpay_order_id) return json({ error: "Unknown order" }, 400);
  const pub = ctx.acct.public_config, sec = ctx.acct.secret_config;
  if (!eqHex(hmacHex(sec.key_secret, `${b.razorpay_order_id}|${b.razorpay_payment_id}`), String(b.razorpay_signature))) {
    await mark(ctx, "failed", { reason: "signature mismatch" });
    await logFail(ctx, "failed", "The payment response could not be verified (signature mismatch)", null, String(b.razorpay_payment_id ?? ""), null, `rzp:${b.razorpay_payment_id}:verify`);
    return json({ error: "We couldn’t verify this payment. You have not been charged twice; please contact the operator." }, 400);
  }
  const auth = basic(pub.key_id, sec.key_secret);
  let pay = await (await fetch(`https://api.razorpay.com/v1/payments/${b.razorpay_payment_id}`, { headers: { Authorization: auth } })).json();
  if (pay.status === "authorized") {
    pay = await (await fetch(`https://api.razorpay.com/v1/payments/${pay.id}/capture`, { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ amount: pay.amount, currency: pay.currency }) })).json();
  }
  if (pay.status !== "captured") {
    await mark(ctx, "failed", pay);
    await logFail(ctx, "failed", pay.error_description || pay.error_reason || `Payment status: ${pay.status ?? "unknown"}`, rzpMethod(pay), pay.id ?? null, pay, `rzp:${pay.id ?? b.razorpay_payment_id}`);
    return json({ error: "The payment was not completed." }, 400);
  }
  await record(ctx, pay.amount / 100, pay.id, rzpMethod(pay), pay);
  return json({ ok: true, redirect: backUrl(ctx, "success") });
}
async function failRazorpay(req: Request) {
  const b = await req.json();
  const ctx = await loadOrder(b.order);
  if (!ctx || ctx.order.provider !== "razorpay" || !b.payment_id) return json({ ok: true });
  const pub = ctx.acct?.public_config || {}, sec = ctx.acct?.secret_config || {};
  const r = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(String(b.payment_id))}`, { headers: { Authorization: basic(pub.key_id, sec.key_secret) } });
  const pay = await r.json();
  if (!r.ok || pay.order_id !== ctx.order.gateway_ref || pay.status !== "failed") return json({ ok: true });
  await logFail(ctx, "failed", pay.error_description || pay.error_reason || "Payment failed", rzpMethod(pay), pay.id, pay, `rzp:${pay.id}`);
  return json({ ok: true });
}
function rzpMethod(p: any) {
  if (p.method === "card") return `${p.card?.network ?? "Card"} ••${p.card?.last4 ?? ""}`.trim();
  if (p.method === "upi") return `UPI${p.vpa ? " · " + p.vpa : ""}`;
  if (p.method === "netbanking") return `Net banking${p.bank ? " · " + p.bank : ""}`;
  if (p.method === "wallet") return `Wallet${p.wallet ? " · " + p.wallet : ""}`;
  return p.method ?? "Razorpay";
}

/* ======================= traveller returns from the gateway ======================= */
async function handleReturn(provider: string, req: Request, url: URL) {
  let form: Record<string, string> = {};
  if (req.method === "POST" && (req.headers.get("content-type") || "").includes("form")) {
    form = Object.fromEntries(Array.from((await req.formData()).entries()).map(([k, v]) => [k, String(v)]));
  }
  const ctx = await loadOrder(url.searchParams.get("o") || form.orderNo || form.txnid);
  if (!ctx || ctx.order.provider !== provider) return Response.redirect(DEFAULT_APP, 303);
  if (ctx.order.status === "paid") return back(ctx, "success");
  const pub = ctx.acct?.public_config || {}, sec = ctx.acct?.secret_config || {};
  const live = ctx.acct?.environment === "live";
  if (url.searchParams.get("cancel")) {
    let status: "failed" | "cancelled" = "cancelled", reason = "The customer cancelled on the payment page", ref: string | null = null, raw: unknown = null;
    if (provider === "stripe" && ctx.order.gateway_ref) {
      try {
        const s = await (await fetch(`https://api.stripe.com/v1/checkout/sessions/${ctx.order.gateway_ref}?expand[]=payment_intent`, { headers: { Authorization: `Bearer ${sec.secret_key}` } })).json();
        const e = s.payment_intent?.last_payment_error;
        if (e) { status = "failed"; reason = e.message || e.decline_code || e.code; ref = s.payment_intent.id; raw = e; }
      } catch { /* keep as cancelled */ }
    }
    await mark(ctx, "cancelled", raw);
    await logFail(ctx, status, reason, null, ref, raw, `${provider}:${ctx.order.order_id}:cancel`);
    return back(ctx, status === "failed" ? "failed" : "cancelled");
  }

  switch (provider) {
    case "ccavenue": {
      let f: Record<string, string>;
      try { f = Object.fromEntries(new URLSearchParams(ccDecrypt(form.encResp ?? "", sec.working_key))); }
      catch {
        await mark(ctx, "invalid", form);
        await logFail(ctx, "failed", "The gateway response could not be verified", null, null, null, `ccavenue:${ctx.order.order_id}:invalid`);
        return back(ctx, "failed");
      }
      await mark(ctx, (f.order_status ?? "failure").toLowerCase(), f);
      if (f.order_status === "Success" && f.order_id === ctx.order.order_id) {
        await record(ctx, Number(f.amount ?? ctx.order.amount), f.tracking_id ?? null, [f.card_name, f.payment_mode].filter(Boolean).join(" · ") || "CCAvenue", f);
        return back(ctx, "success");
      }
      await logFail(ctx, f.order_status === "Aborted" ? "cancelled" : "failed",
        f.failure_message || f.status_message || (f.order_status === "Aborted" ? "The customer cancelled on the payment page" : `Payment status: ${f.order_status ?? "unknown"}`),
        [f.card_name, f.payment_mode].filter(Boolean).join(" · ") || null, f.tracking_id || null, f, `ccavenue:${ctx.order.order_id}`);
      return back(ctx, f.order_status === "Aborted" ? "cancelled" : "failed");
    }
    case "payu": {
      const f = form;
      const parts = [sec.salt, f.status, "", "", "", "", "", f.udf5 ?? "", f.udf4 ?? "", f.udf3 ?? "", f.udf2 ?? "", f.udf1 ?? "", f.email, f.firstname, f.productinfo, f.amount, f.txnid, pub.merchant_key];
      const expected = sha512((f.additionalCharges ? f.additionalCharges + "|" : "") + parts.join("|"));
      if (!eqHex(expected, f.hash ?? "") || f.txnid !== ctx.order.order_id) {
        await mark(ctx, "invalid", f);
        await logFail(ctx, "failed", "The gateway response could not be verified", null, null, null, `payu:${ctx.order.order_id}:invalid`);
        return back(ctx, "failed");
      }
      await mark(ctx, f.status, f);
      if (f.status === "success") { await record(ctx, Number(f.amount), f.mihpayid ?? null, [f.mode, f.bankcode].filter(Boolean).join(" · ") || "PayU", f); return back(ctx, "success"); }
      const payuMsg = [f.error_Message, f.field9].find((x) => x && !/^(no error|e000)$/i.test(String(x).trim()));
      await logFail(ctx, f.unmappedstatus === "userCancelled" ? "cancelled" : "failed",
        payuMsg || (f.unmappedstatus === "userCancelled" ? "The customer cancelled on the payment page" : `Payment status: ${f.unmappedstatus || f.status || "unknown"}`),
        [f.mode, f.bankcode].filter(Boolean).join(" · ") || null, f.mihpayid || null, f, `payu:${f.mihpayid || ctx.order.order_id}`);
      return back(ctx, f.unmappedstatus === "userCancelled" ? "cancelled" : "failed");
    }
    case "cashfree": {
      const base = live ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
      const h = { "x-client-id": pub.app_id, "x-client-secret": sec.secret_key, "x-api-version": "2023-08-01" };
      const o = await (await fetch(`${base}/orders/${ctx.order.order_id}`, { headers: h })).json();
      if (o.order_status !== "PAID") {
        await mark(ctx, String(o.order_status ?? "failed").toLowerCase(), o);
        let p: any = null;
        try {
          const ps = await (await fetch(`${base}/orders/${ctx.order.order_id}/payments`, { headers: h })).json();
          if (Array.isArray(ps)) p = ps.filter((x: any) => x.payment_status !== "SUCCESS").sort((a: any, b: any) => String(b.payment_time ?? "").localeCompare(String(a.payment_time ?? "")))[0] ?? null;
        } catch { /* no attempt details */ }
        const dropped = !p || ["USER_DROPPED", "CANCELLED", "VOID"].includes(p.payment_status);
        const status = dropped ? "cancelled" : "failed";
        await logFail(ctx, status, p ? (p.payment_message || p.error_details?.error_description || `Payment status: ${p.payment_status}`) : "The customer left the payment page without paying",
          p?.payment_group ? `Cashfree · ${p.payment_group}` : null, p?.cf_payment_id ? String(p.cf_payment_id) : null, { order: o, payment: p },
          `cashfree:${p?.cf_payment_id ?? ctx.order.order_id}`);
        return back(ctx, status);
      }
      const ps = await (await fetch(`${base}/orders/${ctx.order.order_id}/payments`, { headers: h })).json();
      const p = Array.isArray(ps) ? ps.find((x: any) => x.payment_status === "SUCCESS") : null;
      await record(ctx, Number(o.order_amount), p?.cf_payment_id ? String(p.cf_payment_id) : null, p?.payment_group ? `Cashfree · ${p.payment_group}` : "Cashfree", { order: o, payment: p });
      return back(ctx, "success");
    }
    case "paypal": {
      const base = live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
      const tj = await (await fetch(`${base}/v1/oauth2/token`, { method: "POST", headers: { Authorization: basic(pub.client_id, sec.client_secret), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" })).json();
      const auth = { Authorization: `Bearer ${tj.access_token}`, "Content-Type": "application/json" };
      let j = await (await fetch(`${base}/v2/checkout/orders/${ctx.order.gateway_ref}/capture`, { method: "POST", headers: auth, body: "{}" })).json();
      if (j.status !== "COMPLETED") j = await (await fetch(`${base}/v2/checkout/orders/${ctx.order.gateway_ref}`, { headers: auth })).json();
      const cap = j.purchase_units?.[0]?.payments?.captures?.[0];
      if (j.status !== "COMPLETED" || !cap) {
        await mark(ctx, "failed", j);
        await logFail(ctx, "failed", j.details?.[0]?.description || j.details?.[0]?.issue || j.message || `Order status: ${j.status ?? "unknown"}`, "PayPal", ctx.order.gateway_ref, j);
        return back(ctx, "failed");
      }
      await record(ctx, Number(cap.amount.value), cap.id, "PayPal", j);
      return back(ctx, "success");
    }
    case "stripe": {
      const s = await (await fetch(`https://api.stripe.com/v1/checkout/sessions/${ctx.order.gateway_ref}`, { headers: { Authorization: `Bearer ${sec.secret_key}` } })).json();
      if (s.payment_status !== "paid") {
        await mark(ctx, "failed", s);
        await logFail(ctx, "failed", `Payment not completed (status: ${s.payment_status ?? "unknown"})`, "Stripe", s.payment_intent ?? null, s);
        return back(ctx, "failed");
      }
      await record(ctx, s.amount_total / 100, s.payment_intent ?? s.id, "Card · Stripe", s);
      return back(ctx, "success");
    }
    case "custom":
      return back(ctx, "pending");
  }
  return back(ctx, "failed");
}

/* ======================= server-to-server webhooks ======================= */
async function handleWebhook(provider: string, req: Request) {
  const raw = await req.text();
  if (provider === "razorpay") {
    const evt = JSON.parse(raw);
    const pay = evt.payload?.payment?.entity;
    if (!pay?.order_id || !["payment.captured", "order.paid", "payment.failed"].includes(evt.event)) return json({ ok: true });
    const { data: order } = await db.from("gateway_orders").select("order_id").eq("gateway_ref", pay.order_id).maybeSingle();
    const ctx = await loadOrder(order?.order_id);
    if (!ctx) return json({ ok: true });
    const secret = ctx.acct?.secret_config?.webhook_secret;
    if (!secret || !eqHex(hmacHex(secret, raw), req.headers.get("x-razorpay-signature") ?? "")) return json({ error: "Invalid signature" }, 401);
    if (evt.event === "payment.failed") {
      await logFail(ctx, "failed", pay.error_description || pay.error_reason || "Payment failed", rzpMethod(pay), pay.id, pay, `rzp:${pay.id}`);
      return json({ ok: true });
    }
    if (pay.status === "captured") await record(ctx, pay.amount / 100, pay.id, rzpMethod(pay), pay);
    return json({ ok: true });
  }
  if (provider === "custom") {
    const b = JSON.parse(raw);
    const ctx = await loadOrder(b.reference);
    if (!ctx || ctx.order.provider !== "custom") return json({ error: "Unknown reference" }, 404);
    const secret = ctx.acct?.secret_config?.webhook_secret;
    if (!secret || !eqHex(hmacHex(secret, raw), req.headers.get("x-travocloud-signature") ?? req.headers.get("x-triploom-signature") ?? "")) return json({ error: "Invalid signature" }, 401);
    if (String(b.status).toLowerCase() === "success") {
      await record(ctx, Number(b.amount ?? ctx.order.amount), b.transaction_id ?? null, b.method ?? ctx.acct.label, b);
    } else {
      const st = String(b.status ?? "failed").toLowerCase();
      await mark(ctx, st, b);
      const cancelled = ["cancelled", "canceled", "aborted", "user_cancelled"].includes(st);
      await logFail(ctx, cancelled ? "cancelled" : "failed", b.message || b.reason || b.error || `Payment status: ${b.status ?? "unknown"}`,
        b.method ?? ctx.acct?.label ?? null, b.transaction_id ?? null, b, `custom:${b.transaction_id ?? ctx.order.order_id}:${st}`);
    }
    return json({ ok: true });
  }
  return json({ error: "Not found" }, 404);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const [action, provider] = parts.slice(parts.indexOf("gateway") + 1);
  try {
    if (action === "initiate" && req.method === "POST") return await initiate(req);
    if (action === "verify" && provider === "razorpay") return await verifyRazorpay(req);
    if (action === "fail" && provider === "razorpay" && req.method === "POST") return await failRazorpay(req);
    if (action === "return") return await handleReturn(provider, req, url);
    if (action === "webhook" && req.method === "POST") return await handleWebhook(provider, req);
    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error(action, provider, err);
    if (action === "return") {
      const ctx = await loadOrder(url.searchParams.get("o")).catch(() => null);
      if (ctx) {
        await logFail(ctx, "failed", "The payment result could not be confirmed with the gateway. Check the gateway dashboard before following up.", null, null, { error: String((err as Error)?.message ?? err) }, `${ctx.order.provider}:${ctx.order.order_id}:error`);
        return back(ctx, "failed");
      }
    }
    return json({ error: String((err as Error).message ?? err) }, 500);
  }
});
