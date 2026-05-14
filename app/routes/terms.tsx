export default function TermsRoute() {
  return (
    <main className="legalPage">
      <div className="legalShell">
        <p className="legalEyebrow">Fast COD Pro</p>
        <h1 className="legalTitle">Terms of Service</h1>
        <p className="legalLead">
          These terms govern the use of Fast COD Pro by Shopify merchants who install the app and
          use it to add a storefront COD popup that creates Shopify order records.
        </p>

        <section className="legalSection">
          <h2>Use of the app</h2>
          <p>
            Merchants may use Fast COD Pro only in connection with lawful business operations and
            must ensure the app is configured in compliance with local consumer protection and
            privacy laws.
          </p>
        </section>

        <section className="legalSection">
          <h2>Merchant responsibilities</h2>
          <p>
            Merchants are responsible for enabling COD/manual payment operations in Shopify,
            reviewing order details before fulfillment, and checking storefront button settings
            before production use.
          </p>
        </section>

        <section className="legalSection">
          <h2>Billing</h2>
          <p>
            Paid plans use Shopify Billing APIs where available. Merchants are responsible for
            reviewing plan pricing and included storefront button features before approving charges.
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
