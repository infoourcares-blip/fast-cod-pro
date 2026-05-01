# Fast Cod Pro Shopify Review Submission

## App setup

- App URL: `https://app.fastcodpro.com`
- Redirect URL: `https://app.fastcodpro.com/auth/callback`
- App proxy: `/apps/fast-cod-pro` -> `https://app.fastcodpro.com/proxy`
- Support URL: `https://app.fastcodpro.com/support`
- Privacy Policy URL: `https://app.fastcodpro.com/privacy`
- Terms of Service URL: `https://app.fastcodpro.com/terms`
- Data deletion URL: `https://app.fastcodpro.com/data-deletion`

## Requested scopes

- `read_products`: used to show product context in the embedded dashboard and product-related COD setup.
- `write_app_proxy`: used for storefront app proxy routes that load COD form configuration and accept COD submissions.
- `write_orders`: used to create Shopify Orders directly when a customer submits the COD form. Orders are created with payment pending, COD tags, product line item, customer phone, delivery address, and merchant notes.

## Customer data handling

Fast Cod Pro collects customer name, phone, email, address, city, notes, selected product, variant, quantity, and COD submission status when a customer submits the storefront COD form. This data is used only to help the merchant review, confirm, export, and follow up on COD requests.

The app stores merchant configuration, app sessions, and COD submissions in the production PostgreSQL database. Data is deleted or redacted through uninstall and privacy compliance webhook handling.

## Compliance webhooks

The app handles:

- `customers/data_request`
- `customers/redact`
- `shop/redact`
- `app/uninstalled`
- `app/scopes_update`

## Reviewer test flow

1. Install Fast Cod Pro on the provided test store.
2. Open the embedded app in Shopify admin.
3. Visit Dashboard, Form Designer, Orders Queue, Billing Plans, and Launch Readiness.
4. Open the theme editor and enable the Fast Cod Pro theme app block on a product page template.
5. Visit a product page on the storefront.
6. Open the COD popup and submit a test COD request.
7. Confirm the customer sees the Fast Cod Pro thank-you page.
8. Return to Shopify Admin > Orders and confirm the COD order appears with payment pending, customer details, delivery address, product, and COD tags.
9. Return to Fast Cod Pro > Orders Queue and confirm the submission appears.

## Test customer data

- Name: Test Customer
- Phone: 9999999999
- Email: test.customer@example.com
- Address: 123 Review Street
- City: Mumbai
- Notes: Shopify review test order

## Pre-submission checks

- Rotate any exposed Shopify app secrets before submission.
- Remove old `SCOPES` values from Railway if present. The app now requests `read_products,write_orders,write_app_proxy` from `shopify.app.toml`.
- Set `SHOPIFY_BILLING_TEST=false` for live billing, or `true` only for a development review flow.
- Release the latest Shopify app configuration version.
- Reinstall the app in the test store after scope or secret changes.
