import { useLoaderData } from "react-router";

export const loader = async () => {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || "info.ourcares@gmail.com";
  const whatsappUrl =
    process.env.SUPPORT_WHATSAPP_URL?.trim() ||
    "https://wa.me/919718127346?text=Hi%20Fast%20COD%20Pro%20support%2C%20I%20need%20help%20with%20my%20Shopify%20app.";

  return { supportEmail, whatsappUrl };
};

export default function SupportRoute() {
  const { supportEmail, whatsappUrl } = useLoaderData<typeof loader>();
  const mailHref = `mailto:${supportEmail}`;

  return (
    <main className="legalPage">
      <div className="legalShell">
        <p className="legalEyebrow">Fast COD Pro</p>
        <h1 className="legalTitle">Support</h1>
        <p className="legalLead">
          Need help with onboarding, storefront setup, COD orders, billing, or exports?
          Use the support options below and include your store URL so we can help quickly.
        </p>

        <div className="legalActions">
          <a className="legalButton legalButtonPrimary" href={mailHref}>
            Email support
          </a>
          {whatsappUrl ? (
            <a className="legalButton legalButtonSecondary" href={whatsappUrl} target="_blank" rel="noreferrer">
              WhatsApp support
            </a>
          ) : null}
        </div>

        <section className="legalSection">
          <h2>Primary support contact</h2>
          <p>
            Email: <a href={mailHref}>{supportEmail}</a>
          </p>
        </section>

        <section className="legalSection" id="whatsapp">
          <h2>WhatsApp support</h2>
          {whatsappUrl ? (
            <p>
              WhatsApp support is available here:{" "}
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                Open WhatsApp chat
              </a>
            </p>
          ) : (
            <div className="legalNotice">
              WhatsApp support is being connected. For now, email us and include your store URL,
              product page URL, screenshot, and the issue you are seeing.
            </div>
          )}
        </section>

        <section className="legalSection">
          <h2>What to include</h2>
          <ul className="legalList">
            <li>Your store myshopify.com URL.</li>
            <li>The product page URL where the COD button is installed.</li>
            <li>A screenshot or short screen recording of the issue.</li>
            <li>Order number or customer phone number if the issue is about an order.</li>
          </ul>
        </section>

        <section className="legalSection">
          <h2>Setup checklist</h2>
          <ul className="legalList">
            <li>Install the app and keep the app embedded in the store admin.</li>
            <li>Enable the Fast COD Pro theme block on the product template.</li>
            <li>Run one test from a product page and confirm the Shopify order status page opens.</li>
            <li>Confirm the order appears in the store admin Orders page.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
