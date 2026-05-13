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

Fast COD Pro does not request `write_orders` and does not create Shopify Orders, Draft Orders, or transactions through the Admin API.

## Customer data handling

Fast COD Pro no longer collects customer name, phone, address, or payment details on the product page. The storefront button adds the selected product to the cart and redirects the shopper to Shopify Checkout, where Shopify-hosted fields collect customer and payment details.

The app stores merchant configuration, app sessions, product context, and support-related data in the production PostgreSQL database. Data is deleted or redacted through uninstall and privacy compliance webhook handling.

## Reviewer test flow

1. Install Fast COD Pro on the provided test store.
2. Open the embedded app in Shopify admin.
3. Visit Dashboard, Checkout Button, Billing Plans, and Launch Readiness.
4. Open the theme editor and enable the Fast COD Pro theme app block on a product page template.
5. Visit a product page on the storefront.
6. Click the Fast COD Pro button.
7. Confirm the product is added to cart and the shopper is redirected to Shopify Checkout.
8. Complete customer details and COD/manual payment selection only inside Shopify Checkout.

## Pre-submission checks

- Rotate any exposed Shopify app secrets before submission.
- Remove old `SCOPES` values from Railway if present. The app now requests `read_products,write_app_proxy`.
- Set `SHOPIFY_BILLING_TEST=false` for live billing, or `true` only for a development review flow.
- Release the latest Shopify app configuration version.
- Reinstall the app in the test store after scope changes.
