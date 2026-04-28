# Fast Cod Pro App Store Listing

## One-line value proposition

Fast Cod Pro helps COD-first Shopify stores replace checkout friction with a fast COD launcher, popup form, order queue, exports, automations, and fraud controls.

## Short description

Launch a branded cash-on-delivery flow with popup COD forms, queue management, exports, offers, fraud rules, and merchant automations.

## Full description

Fast Cod Pro is built for merchants who want a cleaner cash-on-delivery buying experience than the standard checkout. Add a storefront COD launcher button, collect delivery details in a focused popup, save order intent into an operational queue, and manage the full workflow from inside Shopify admin.

### Core features

- COD launcher button and popup checkout experience
- Form Designer with customizable fields
- Orders Queue with search, filters, CSV export, and status management
- Fraud Prevention rules and merchant automation controls
- Sales Booster / offer management
- Embedded admin dashboard with onboarding and launch-readiness sections
- Billing plans ready for Shopify Billing API integration

### Best-fit merchants

- COD-first stores
- stores selling on Meta, TikTok, or other paid traffic channels
- merchants who need a lightweight COD lead and confirmation workflow
- teams that want CSV export and manual review when automatic draft order creation is unavailable

## Required listing assets to prepare

- App icon: 1200 x 1200 PNG
- Desktop admin screenshots
- Mobile storefront COD popup screenshots
- Short demo video or GIF
- Support email and legal page URLs
- Shopify review test store credentials and steps
- Explanation for DraftOrder/customer data use in the app review form

## Production URLs

- App URL: `https://app.fastcodpro.com`
- Redirect URL: `https://app.fastcodpro.com/auth/callback`
- App proxy: `/apps/fast-cod-pro` -> `https://app.fastcodpro.com/proxy`
- Privacy Policy: `https://app.fastcodpro.com/privacy`
- Terms of Service: `https://app.fastcodpro.com/terms`
- Support: `https://app.fastcodpro.com/support`
- Data deletion: `https://app.fastcodpro.com/data-deletion`

## Shopify review notes

Fast Cod Pro uses `read_products` to show recent products in the merchant dashboard, `write_app_proxy` for storefront COD form proxy routes, and `write_draft_orders` to create draft orders from COD submissions. Customer data collected by the COD form is stored so merchants can review, confirm, export, or delete submissions.

## Reviewer Test Instructions

1. Install Fast Cod Pro on the provided development store.
2. Open the embedded app from Shopify admin and confirm the dashboard loads.
3. Open Form Designer and verify the COD form fields are configurable.
4. Open the theme editor, enable the Fast Cod Pro theme app block on a product template, and save.
5. Visit a product page, open the COD popup, and submit a test COD request with sample customer details.
6. Return to the app and verify the submission appears in Orders Queue.
7. If DraftOrder access is not approved for the review store, the submission is saved with manual review status and the merchant can still process it from Orders Queue.

## Suggested screenshots

1. Dashboard overview
2. Form Designer
3. Storefront COD launcher and popup
4. Orders Queue with search/filter/export
5. Fraud Prevention and Automation pages
