export default function TermsRoute() {
  return (
    <main className="legalPage">
      <div className="legalShell">
        <p className="legalEyebrow">Fast Cod Pro</p>
        <h1 className="legalTitle">Terms of Service</h1>
        <p className="legalLead">
          These terms govern the use of Fast Cod Pro by Shopify merchants who install the app and
          use it to collect COD submissions, automate workflows, and manage conversion features.
        </p>

        <section className="legalSection">
          <h2>Use of the app</h2>
          <p>
            Merchants may use Fast Cod Pro only in connection with lawful business operations and
            must ensure the app is configured in compliance with local consumer protection and
            privacy laws.
          </p>
        </section>

        <section className="legalSection">
          <h2>Merchant responsibilities</h2>
          <p>
            Merchants are responsible for verifying COD orders, managing shipment and fulfillment,
            and reviewing fraud rules, automations, and messaging before using them in production.
          </p>
        </section>

        <section className="legalSection">
          <h2>Billing</h2>
          <p>
            Paid plans use Shopify Billing APIs where available. Merchants are responsible for
            reviewing plan pricing, usage limits, and order volume caps before approving charges.
          </p>
        </section>

        <section className="legalSection">
          <h2>Availability</h2>
          <p>
            We strive to keep the app available and stable, but we do not guarantee uninterrupted
            service during development, maintenance, Shopify platform outages, or merchant theme
            conflicts.
          </p>
        </section>

        <section className="legalSection">
          <h2>Support</h2>
          <p>
            For setup and technical support contact{" "}
            <a href="mailto:info.ourcares@gmail.com">info.ourcares@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
