# Fast COD Pro App Store Listing

## One-line value proposition

Fast COD Pro helps COD-first Shopify stores add a branded product-page button that sends shoppers to secure Shopify Checkout.

## Short description

Launch a configurable storefront checkout button for cash-on-delivery stores while keeping customer details, payment selection, and order creation inside Shopify Checkout.

## Full description

Fast COD Pro is built for merchants who want a cleaner product-page path into Shopify Checkout. Add a branded checkout button, customize label, color, icon, and animation, then send shoppers directly to Shopify Checkout where Shopify-hosted fields collect customer and payment details.

### Core features

- Product-page checkout button
- Redirects shoppers to Shopify Checkout
- No offsite checkout and no Admin API order creation
- Button label, color, icon, animation, and corner controls
- Embedded admin dashboard with onboarding and launch-readiness sections
- Billing plans through Shopify Billing

### Best-fit merchants

- COD-first stores that use Shopify Checkout
- merchants who want a prominent product-page checkout CTA
- teams that need theme-level button controls without replacing Shopify Checkout

## Shopify review notes

Fast COD Pro uses `read_products` to show product context and `write_app_proxy` to load storefront button configuration. The app does not request `write_orders`, does not create Shopify Orders or Draft Orders, and does not collect customer address/payment details on the product page. Shoppers complete the order in Shopify Checkout.

## Reviewer Test Instructions

1. Install Fast COD Pro on the provided development store.
2. Open the embedded app from Shopify admin and confirm the dashboard loads.
3. Open Checkout Button and verify button label, colors, icon, and animation are configurable.
4. Open the theme editor, enable the Fast COD Pro theme app block on a product template, and save.
5. Visit a product page and click the Fast COD Pro button.
6. Confirm the product is added to cart and Shopify Checkout opens.
7. Enter customer details and select COD/manual payment only inside Shopify Checkout.

## Suggested screenshots

1. Dashboard overview
2. Checkout Button settings
3. Storefront checkout button
4. Shopify Checkout redirect
5. Billing plans

## Suggested pricing copy

- Free: Start with the storefront checkout button.
- Unlimited: $10/month for advanced storefront checkout button controls, or $102/year with 15% annual savings.
