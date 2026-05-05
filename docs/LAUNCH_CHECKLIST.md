# Fast COD Pro Launch Checklist

## Already completed in code

- Embedded Shopify admin app shell
- Public legal pages
- Shopify privacy webhook handlers
- Compliance webhook subscription configured for `customers/data_request`, `customers/redact`, and `shop/redact`
- Merchant data cleanup on uninstall
- Orders Queue search, filters, and CSV export
- Theme app extension with COD launcher and popup
- Billing plans screen with Free 100 orders/month and Unlimited billing
- Production app domain configured at `https://app.fastcodpro.com`
- PostgreSQL production database configured
- Least-privilege scopes configured for current app features

## Must complete before App Store submission

- Get protected customer data handling approval from Shopify
- Rotate the Shopify app secret that was exposed during setup screenshots
- Run full QA on desktop and mobile themes
- Verify billing scenarios end-to-end
- Prepare real App Store assets and demo video
- Finalize Privacy Policy and Terms with business details
- Release the updated Shopify app configuration after the latest `shopify.app.toml` changes
- Fill Shopify review answers from `docs/SHOPIFY_REVIEW_SUBMISSION.md`

## Manual QA checklist

- Install app in fresh development store
- Enable theme block on live product template
- Confirm native buy buttons hide correctly
- Confirm COD popup opens and submits
- Check Orders Queue status changes
- Export CSV and validate rows
- Confirm uninstall removes shop data
- Confirm app works after reinstall with rotated production secret
- Trigger or inspect privacy compliance webhook delivery in Shopify Dev Dashboard
- Confirm `SHOPIFY_BILLING_TEST` is set correctly for the target release

## Current known blocker

- Rotate the exposed Shopify app secret before public App Store submission.
- Run one final storefront test after the latest deploy and confirm the Shopify order includes customer name, phone, shipping address, product, price, COD tags, and payment pending status.
