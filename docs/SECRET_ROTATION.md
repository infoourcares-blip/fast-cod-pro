# Shopify Secret Rotation

Use this before final App Store submission because setup screenshots exposed app secrets.

1. Open Shopify Dev Dashboard > Fast COD Pro > Settings > Credentials.
2. Create or reveal a fresh app secret.
3. Open Railway > fast-cod-pro > Variables.
4. Replace `SHOPIFY_API_SECRET` with the fresh secret.
5. Redeploy the Railway service.
6. Uninstall Fast COD Pro from the development store.
7. Reinstall Fast COD Pro and confirm the embedded dashboard opens.
8. Revoke the old exposed Shopify secrets only after the fresh secret is working.
9. Keep `SHOPIFY_API_KEY` unchanged unless Shopify issues a different Client ID.
