export default function PrivacyRoute() {
  return (
    <main className="legalPage">
      <div className="legalShell">
        <p className="legalEyebrow">Fast COD Pro</p>
        <h1 className="legalTitle">Privacy Policy</h1>
        <p className="legalLead">
          Fast COD Pro helps Shopify merchants run COD order forms, create Shopify Orders,
          and manage COD submissions. This page describes what data we process, why we process it,
          and how merchants can request deletion or support.
        </p>

        <section className="legalSection">
          <h2>Data we process</h2>
          <p>
            We process merchant account data needed to authenticate the app and storefront order
            data submitted through COD forms, including name, phone number, address, email,
            product selection, and operational notes.
          </p>
        </section>

        <section className="legalSection">
          <h2>Why we process this data</h2>
          <p>
            We use this data to display app settings, create Shopify Orders, store COD
            submissions, export order data, and support merchants using Fast COD Pro.
          </p>
        </section>

        <section className="legalSection">
          <h2>How data is stored</h2>
          <p>
            The production app stores merchant configuration, sessions, and COD submissions in a
            managed PostgreSQL database with restricted access. Access should be limited to
            authorized operators for support, troubleshooting, and compliance requests.
          </p>
        </section>

        <section className="legalSection">
          <h2>Data deletion and redaction</h2>
          <p>
            Fast COD Pro supports Shopify privacy webhooks for customer data requests, customer
            redaction, and shop redaction. When a merchant uninstalls the app, merchant-owned app
            data is deleted.
          </p>
        </section>

        <section className="legalSection">
          <h2>Contact</h2>
          <p>
            For support, privacy, or deletion requests contact{" "}
            <a href="mailto:info.ourcares@gmail.com">info.ourcares@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
