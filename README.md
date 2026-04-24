# Fast Cod Pro

Fast Cod Pro is a real Shopify embedded app starter built on Shopify's official React Router template and customized for COD-heavy merchants.

It now includes:

- Shopify embedded app authentication and App Bridge
- Prisma-backed session storage
- A custom Fast Cod Pro merchant dashboard
- Dedicated pages for offers, fraud controls, and automations
- Public legal pages for privacy, terms, support, and data deletion
- Shopify privacy webhook handlers and uninstall cleanup
- Orders Queue with search, filters, export, and status updates
- Shopify App Store-ready positioning and product structure

## Stack

- React Router 7
- `@shopify/shopify-app-react-router`
- Shopify App Bridge
- Prisma with PostgreSQL session storage
- Vite + TypeScript

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables and fill them with your Shopify app credentials:

```bash
cp .env.example .env
```

3. Set `DATABASE_URL` to a PostgreSQL database, then generate Prisma client and run local development:

```bash
npx prisma generate
npm run dev
```

## What you need in Shopify

- A Shopify Partner account
- A development store
- A public or custom app created in Shopify Partner Dashboard
- App API key and secret copied into `.env`

When you run `npm run dev`, Shopify CLI will connect the app, create a tunnel, and open the embedded install flow.

## Fast Cod Pro product direction

Fast Cod Pro is positioned as an advanced revenue app for COD-first stores:

- Custom COD forms and funnel controls
- One-click upsells and bundles
- OTP and risk verification logic
- Campaign attribution and order automations
- Merchant analytics for conversion and AOV growth

## Recommended next product steps

1. Get Shopify approval for protected customer data / DraftOrder access.
2. Replace development tunnel URLs with a production domain.
3. Move from local SQLite to a managed production database.
4. Run end-to-end QA on storefront themes and mobile devices.
5. Finalize App Store assets using the docs in `/docs`.

## Public pages

- Privacy Policy: `/privacy`
- Terms of Service: `/terms`
- Support: `/support`
- Data Deletion: `/data-deletion`

## Launch docs

- App Store listing copy: [`docs/APP_STORE_LISTING.md`](docs/APP_STORE_LISTING.md)
- Launch checklist: [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md)
- Support playbook: [`docs/SUPPORT_PLAYBOOK.md`](docs/SUPPORT_PLAYBOOK.md)
