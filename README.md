# TravoCloud Payments

Multi-organisation payment collection for tour operators: invoices with instalment schedules, CCAvenue payment links in multiple currencies, and bank-credit reconciliation. Hosted at **payments.triploom.in**.

## Three interfaces

| Who | Where | What they do |
|---|---|---|
| Platform admin (TravoCloud) | `/admin` | Onboard organisations, add their users, suspend/reactivate, maintain reference FX rates |
| Operator team | `/o/<workspace>` e.g. `/o/himalayan-trails` | Dashboard, invoices, customers, payments, reconciliation, catalogue, settings |
| Traveller | `/p/<token>` | Public payment page: pay the next instalment or the full balance |

Each organisation's data is isolated by row-level security in Postgres: a user can only ever read or write rows of organisations they belong to. The platform admin sees the organisation list and totals, not the operators' invoices.

Roles inside an organisation: **Owner** (everything incl. gateway keys and team), **Accounts** (invoices, payments, reconciliation, catalogue), **Sales** (invoices and customers).

## Stack

- Frontend: React + Vite (this repo), deploy on Vercel
- Backend: Supabase project `triploom-payments` (ref `ptnavmtxxfkyuuuexigk`, Mumbai region)
  - Postgres tables, views (`invoice_summary`, `instalment_status`, `payment_details`) and RPCs (`create_invoice`, `get_public_invoice`, `demo_pay`, `list_gateways`, `save_gateway`, `delete_gateway`, `record_manual_payment`, `admin_org_overview`, `my_context`)
  - Edge function `admin-onboard`: create organisation + owner login, add members, suspend
  - Edge function `gateway`: starts payments and confirms them for Razorpay, CCAvenue, PayU, Cashfree, PayPal, Stripe and custom gateways
- Gateway credentials live in `gateway_accounts`, which has no browser access at all; only edge functions read it.

To pull the schema and functions into this repo with the Supabase CLI:
```
supabase link --project-ref ptnavmtxxfkyuuuexigk
supabase db pull
supabase functions download admin-onboard
supabase functions download gateway
```

## Run locally

```
npm install
cp .env.example .env     # already filled with the project URL and publishable key
npm run dev
```

## Deploy to payments.triploom.in

1. Push this folder to a GitHub repo and import it in Vercel (framework: Vite). `vercel.json` already routes all paths to the app.
2. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (values in `.env.example`).
3. In Vercel → Domains, add `payments.triploom.in`, then add the CNAME record it shows at your DNS provider.
4. In Supabase → Authentication → URL configuration, set Site URL to `https://payments.triploom.in`.
5. In Supabase → Edge Functions → Secrets, add `APP_URL=https://payments.triploom.in` (where gateways send travellers back).
6. In Supabase → Authentication → Providers → Email, turn off "Allow new users to sign up" (accounts are created by the admin console), and turn on leaked-password protection.

## Payment gateways (per organisation)

Owners connect one or more gateways in **Settings → Payment gateway**. Each invoice's payment page offers every enabled gateway that accepts its currency.

| Gateway | What the owner enters | How payment is confirmed |
|---|---|---|
| Razorpay | Key ID, Key secret, Webhook secret (optional) | Checkout signature check + payment fetch; webhook `payment.captured` as backup |
| CCAvenue | Merchant ID, Access code, Working key | Encrypted response decrypted with the working key |
| PayU | Merchant key, Merchant salt | Reverse SHA-512 hash check |
| Cashfree | App ID, Secret key | Order status fetched from Cashfree (`PAID`) |
| PayPal | Client ID, Client secret | Order captured on return (`COMPLETED`) |
| Stripe | Secret key | Checkout Session fetched (`payment_status = paid`) |
| Custom | Payment page URL with placeholders | Signed webhook (`X-TravoCloud-Signature`, HMAC-SHA256) or "Record payment" on the invoice |

All gateway calls go through the `gateway` edge function (`supabase/functions/gateway/index.ts`). Secrets live in `gateway_accounts`, which has no browser access.

Payment mode: **Demo** completes payments without charging (for demos); **Live** uses the connected gateways. Test vs Live is set per gateway.

Team members with Owner or Accounts roles can also **record a payment** on an invoice for money received outside the link (bank transfer, cash, cheque).

## Logos

Owners upload a logo in Settings → Company (platform admins can do it from the organisation page). It appears on the invoice, the payment page and the workspace sidebar. Files are stored in the public `org-logos` storage bucket.

## Not built yet (next phase)

- Outgoing email: invoice emails, reminders before/after due dates (needs a transactional email provider; "Send reminder" currently logs to the activity timeline)
- Settlement report import for automatic reconciliation
- Webhooks for Stripe, PayPal, Cashfree and PayU (today they confirm on return; Razorpay and custom already have webhooks)
- Editing a sent invoice, refunds, PDF invoices

## Failed payment attempts

Declined, failed and cancelled attempts are logged per invoice in `payment_failures` (readable by the organisation's team) and shown under **Failed payment attempts** on the invoice page, with a line in its activity timeline. Sources: CCAvenue, PayU and Cashfree responses; PayPal and Stripe returns and cancels; Razorpay Checkout failures (confirmed with the Razorpay API) and the `payment.failed` webhook; custom-gateway webhooks with a non-success status; gateway errors that stop a payment from starting; and declined demo payments. The custom webhook accepts `X-TravoCloud-Signature` (the older `X-TripLoom-Signature` header still works).
