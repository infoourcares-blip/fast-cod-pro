# Fast Cod Pro Launch Checklist

## Already completed in code

- Embedded Shopify admin app shell
- Public legal pages
- Shopify privacy webhook handlers
- Merchant data cleanup on uninstall
- Orders Queue search, filters, and CSV export
- Theme app extension with COD launcher and popup
- Billing plans screen

## Must complete before App Store submission

- Get protected customer data / DraftOrder approval from Shopify
- Replace development tunnel URLs with production app domain URLs
- Add production database and secure environment management
- Run full QA on desktop and mobile themes
- Verify billing scenarios end-to-end
- Prepare real App Store assets and demo video
- Finalize Privacy Policy and Terms with business details

## Manual QA checklist

- Install app in fresh development store
- Enable theme block on live product template
- Confirm native buy buttons hide correctly
- Confirm COD popup opens and submits
- Check Orders Queue status changes
- Export CSV and validate rows
- Confirm uninstall removes shop data

## Current known blocker

- Automatic DraftOrder creation is blocked until Shopify approves DraftOrder access for this app.
