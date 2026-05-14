# Fast COD Pro Shopify Review Submission

## App setup

- App URL: `https://app.fastcodpro.com`
- Redirect URL: `https://app.fastcodpro.com/auth/callback`
- App proxy: `/apps/fast-cod-pro` -> `https://app.fastcodpro.com/proxy`
- Support URL: `https://app.fastcodpro.com/support`
- Privacy Policy URL: `https://app.fastcodpro.com/privacy`
- Terms of Service URL: `https://app.fastcodpro.com/terms`
- Data deletion URL: `https://app.fastcodpro.com/data-deletion`

## Requested scopes

- `read_products`: used to show product context in the embedded dashboard.
- `write_app_proxy`: used for storefront app proxy routes that load checkout button configuration.
- `write_orders`: used to create Shopify COD orders from the storefront popup.
- `write_customers`: used to attach phone-only customer contact details to COD orders when needed.
- `write_draft_orders`: fallback order creation permission for stores where direct order creation is unavailable.

Fast COD Pro creates Shopify orders with Cash on Delivery as a pending payment and redirects customers to Shopify's native order status page.

## Customer data handling

Fast COD Pro collects customer name, phone, address, pincode, city, and optional notes in a storefront COD popup. These values are saved to the Shopify order shipping/billing address, customer contact, order notes, and additional details. Payment is recorded as Cash on Delivery with pending payment status.

The app stores merchant configuration, app sessions, product context, and support-related data in the production PostgreSQL database. Data is deleted or redacted through uninstall and privacy compliance webhook handling.

## Reviewer test flow

1. Install Fast COD Pro on the provided test store.
2. Open the embedded app in Shopify admin.
3. Visit Dashboard, COD Form, Billing Plans, and Launch Readiness.
4. Open the theme editor and enable the Fast COD Pro theme app block on a product page template.
5. Visit a product page on the storefront.
6. Click the Fast COD Pro button.
7. Fill the COD popup form and place the order.
8. Confirm the shopper is redirected to Shopify's native order status page.
9. Confirm the Shopify order contains customer phone, shipping address, billing address, COD pending payment, and product line item.

## Pre-submission checks

- Rotate any exposed Shopify app secrets before submission.
- Confirm Railway `SCOPES` matches the app configuration.
- Set `SHOPIFY_BILLING_TEST=false` for live billing, or `true` only for a development review flow.
- Release the latest Shopify app configuration version.
- Reinstall the app in the test store after scope changes.
