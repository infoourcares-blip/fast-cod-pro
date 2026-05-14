# Fast COD Pro Support Playbook

## Ask merchants for

- Shopify store URL
- exact product page URL
- screenshots or screen recording
- browser and device
- whether the issue appears in theme editor only or real storefront too

## First checks

- Is the theme app block enabled?
- Is the correct product selected in the theme block settings?
- Did the merchant hard refresh the storefront?
- Are native buy buttons still visible because of theme-specific selectors?
- Does the Fast COD Pro button open the COD popup?
- Does the popup create a Shopify order and redirect to the native order status page?

## Escalation notes

- If the button does not open the popup, inspect theme JS conflicts and selector timing.
- If the order does not show COD pending payment, inspect the app proxy submit response and Shopify order create payload.
- If styling is broken, test both theme editor preview and actual storefront page.
- If authentication fails after secret rotation, uninstall and reinstall the app in the affected store.
- If privacy compliance webhook delivery fails, confirm the app version was released with the `compliance_topics` subscription and inspect Dev Dashboard webhook logs.
