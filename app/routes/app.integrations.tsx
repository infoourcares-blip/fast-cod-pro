import { Form } from "react-router";

const events = ["ViewContent", "InitiateCheckout", "Purchase"];

export default function IntegrationsRoute() {
  return (
    <s-page heading="Integrations">
      <div className="proShell">
        <section className="proHero proHeroCompact">
          <div>
            <span className="proEyebrow">Pixels and sheets</span>
            <h1>Connect tracking and order sync without extra setup pain.</h1>
            <p>
              Add pixels, Google tags, and a Google Sheets webhook. Events are structured for storefront and server-side tracking.
            </p>
          </div>
          <button type="button" className="proButton">Test events</button>
        </section>

        <div className="proGridTwo">
          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Multi-pixel tracking</h2>
                <p>Fire high-value COD funnel events from one place.</p>
              </div>
            </div>
            <Form className="proForm">
              <label className="proField">
                <span>Meta Pixel ID</span>
                <input name="metaPixel" placeholder="1234567890" />
              </label>
              <label className="proField">
                <span>Meta CAPI token</span>
                <input name="metaCapi" placeholder="Paste access token" type="password" />
              </label>
              <label className="proField">
                <span>TikTok Pixel ID</span>
                <input name="tiktokPixel" placeholder="CXXXXXXXXXXXX" />
              </label>
              <label className="proField">
                <span>Google tag / GA4 ID</span>
                <input name="googleTag" placeholder="G-XXXXXXXXXX" />
              </label>
              <button type="button" className="proButton">Save tracking</button>
            </Form>
          </section>

          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Google Sheets sync</h2>
                <p>Log every COD order in real time through webhook or API.</p>
              </div>
            </div>
            <Form className="proForm">
              <label className="proField">
                <span>Webhook URL</span>
                <input name="sheetWebhook" placeholder="https://script.google.com/macros/s/..." />
              </label>
              <label className="proCheck">
                <input type="checkbox" defaultChecked />
                <span>Sync successful Shopify orders only</span>
              </label>
              <label className="proCheck">
                <input type="checkbox" />
                <span>Also sync abandoned leads</span>
              </label>
              <button type="button" className="proButton">Connect Google Sheets</button>
            </Form>
          </section>
        </div>

        <section className="proCard">
          <div className="proCardHeader">
            <div>
              <h2>Event health</h2>
              <p>Review-ready events for conversion reporting.</p>
            </div>
          </div>
          <div className="proEventGrid">
            {events.map((event) => (
              <article className="proMiniCard" key={event}>
                <span className="proDot" />
                <strong>{event}</strong>
                <small>Ready for browser pixel and server payload</small>
              </article>
            ))}
          </div>
        </section>
      </div>
    </s-page>
  );
}
