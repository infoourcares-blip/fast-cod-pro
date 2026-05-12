import { useLoaderData } from "react-router";

export const loader = async () => {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || "info.ourcares@gmail.com";
  const whatsappUrl =
    process.env.SUPPORT_WHATSAPP_URL?.trim() ||
    "https://wa.me/919718127346?text=Hi%20Fast%20COD%20Pro%20support%2C%20I%20need%20help%20with%20my%20Shopify%20app.";
  const tutorialUrl = process.env.SUPPORT_TUTORIAL_URL?.trim() || "";

  return { supportEmail, whatsappUrl, tutorialUrl };
};

export default function SupportRoute() {
  const { supportEmail, whatsappUrl, tutorialUrl } = useLoaderData<typeof loader>();
  const supportSubject = "Fast COD Pro support request";
  const supportBody = encodeURIComponent(
    "Store URL:\nProduct page URL:\nIssue:\nSteps to reproduce:\n"
  );
  const mailHref = `mailto:${supportEmail}?subject=${encodeURIComponent(supportSubject)}&body=${supportBody}`;

  return (
    <main className="legalPage">
      <div className="legalShell">
        <p className="legalEyebrow">Fast COD Pro</p>
        <h1 className="legalTitle">Support</h1>
        <p className="legalLead">
          Need help with onboarding, storefront setup, COD order creation, billing, or exports?
          Use the support options below and include your store URL so we can help quickly.
        </p>

        <div className="legalActions">
          <a className="legalButton legalButtonPrimary" href={mailHref}>
            Email support
          </a>
          {tutorialUrl ? (
            <a className="legalButton legalButtonSecondary" href={tutorialUrl} target="_blank" rel="noreferrer">
              Watch tutorial
            </a>
          ) : null}
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

        <section className="legalSection" id="tutorial">
          <h2>Video tutorial</h2>
          {tutorialUrl ? (
            <p>
              Watch the setup walkthrough here:{" "}
              <a href={tutorialUrl} target="_blank" rel="noreferrer">
                Open tutorial
              </a>
              .
            </p>
          ) : (
            <div className="legalNotice">
              Tutorial video is being added. For now, use the setup checklist below or email support with your store URL.
            </div>
          )}
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
            <li>The product page URL where the COD form is installed.</li>
            <li>A screenshot or short screen recording of the issue.</li>
            <li>Order number or customer phone number if the issue is about an order.</li>
          </ul>
        </section>

        <section className="legalSection">
          <h2>Setup checklist</h2>
          <ul className="legalList">
            <li>Install the app and keep the app embedded in the store admin.</li>
            <li>Enable the Fast COD Pro theme block on the product template.</li>
            <li>Submit one test COD order from a product page.</li>
            <li>Confirm the order appears in the store admin Orders page.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
