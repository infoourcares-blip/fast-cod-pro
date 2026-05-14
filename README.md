# Fast COD Pro

Fast COD Pro is a real Shopify embedded app built on Shopify's official React Router template and customized for COD-heavy merchants.

It now includes:

- Shopify embedded app authentication and App Bridge
- Prisma-backed session storage
- A custom Fast COD Pro merchant dashboard
- Product-page COD popup button settings
- Public legal pages for privacy, terms, support, and data deletion
- Shopify privacy webhook handlers and uninstall cleanup
- Legacy Orders Queue for old captured submissions
- Shopify COD order creation and native order status redirect for new storefront orders
- Simple Shopify Billing plans: Free and Unlimited

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

## Fast COD Pro product direction

Fast COD Pro is positioned as a simple conversion app for COD-first stores:

- Product-page COD launcher button
- Customer name, phone, address, and COD details collected in a storefront popup
- Shopify order creation with Cash on Delivery as a pending payment
- Native Shopify order status page redirect after order creation
- Theme controls for button label, color, icon, animation, and corner radius
- Free and Unlimited plans for storefront button controls

## Recommended next product steps

1. Keep the final order record and customer confirmation inside Shopify's native order/status surfaces.
2. Keep production URLs pointed at `https://app.fastcodpro.com`.
3. Rotate any exposed Shopify app secret before final submission.
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
