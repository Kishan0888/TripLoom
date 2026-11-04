# TripLoom Payments

Multi-organisation payment collection for tour operators: invoices with instalment schedules, CCAvenue payment links in multiple currencies, and bank-credit reconciliation. Hosted at **payments.triploom.in**.

## Three interfaces

| Who | Where | What they do |
|---|---|---|
| Platform admin (TripLoom) | `/admin` | Onboard organisations, add their users, suspend/reactivate, maintain reference FX rates |
| Operator team | `/o/<workspace>` e.g. `/o/himalayan-trails` | Dashboard, invoices, customers, payments, reconciliation, catalogue, settings |
| Traveller | `/p/<token>` | Public payment page: pay the next instalment or the full balance |

Each organisation's data is isolated by row-level security in Postgres: a user can only ever read or write rows of organisations they belong to. The platform admin sees the organisation list and totals, not the operators' invoices.

Roles inside an organisation: **Owner** (everything incl. gateway keys and team), **Accounts** (invoices, payments, reconciliation, catalogue), **Sales** (invoices and customers).

## Stack

- Frontend: React + Vite (this repo), deploy on Vercel
- Backend: Supabase project `triploom-payments` (ref `ptnavmtxxfkyuuuexigk`, Mumbai region)
  - Postgres tables, views (`invoice_summary`, `instalment_status`, `payment_details`) and RPCs (`create_invoice`, `get_public_invoice`, `demo_pay`, `get_gateway_config`, `save_gateway_config`, `admin_org_overview`, `my_context`)
  - Edge function `admin-onboard`: create organisation + owner login, add members, suspend
  - Edge function `ccavenue`: `/initiate` encrypts the order for CCAvenue's hosted page; `/response` decrypts the result, records the payment and redirects the traveller back to `/p/<token>?status=…`
- CCAvenue working keys live in `gateway_configs`, which has no browser access at all; only edge functions read it.

To pull the schema and functions into this repo with the Supabase CLI:
```
supabase link --project-ref ptnavmtxxfkyuuuexigk
supabase db pull
supabase functions download admin-onboard
supabase functions download ccavenue
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
5. In Supabase → Edge Functions → Secrets, add `APP_URL=https://payments.triploom.in` (where CCAvenue sends travellers back).
6. In Supabase → Authentication → Providers → Email, turn off "Allow new users to sign up" (accounts are created by the admin console), and turn on leaked-password protection.

## Going live with CCAvenue (per operator)

1. Operator owner opens Settings → Payment gateway, enters Merchant ID, Access code and Working key, picks **Test**, saves.
2. In the CCAvenue dashboard, register the redirect/cancel URL shown on that screen and whitelist `payments.triploom.in`.
3. Run a test payment from a payment link, then switch to **Live**.

While an organisation is in **Demo** mode, the payment page completes payments without charging anyone (useful for client demos).

## Not built yet (next phase)

- Outgoing email: invoice emails, reminders before/after due dates (needs a transactional email provider; "Send reminder" currently logs to the activity timeline)
- CCAvenue settlement report import for automatic reconciliation
- Editing a sent invoice, refunds, PDF invoices
