export default function DataDeletionRoute() {
  return (
    <main className="legalPage">
      <div className="legalShell">
        <p className="legalEyebrow">Fast Cod Pro</p>
        <h1 className="legalTitle">Data Deletion</h1>
        <p className="legalLead">
          Fast Cod Pro honors Shopify uninstall and privacy webhooks for merchant-owned shop data
          and customer data requests.
        </p>

        <section className="legalSection">
          <h2>Automatic deletion</h2>
          <p>
            When the app is uninstalled, stored sessions and merchant configuration records are
            removed from the app database.
          </p>
        </section>

        <section className="legalSection">
          <h2>Customer redaction</h2>
          <p>
            On customer redact requests, stored submission records tied to the requested email are
            anonymized to remove direct personal information while preserving operational history.
          </p>
        </section>

        <section className="legalSection">
          <h2>Manual requests</h2>
          <p>
            Contact <a href="mailto:info.ourcares@gmail.com">info.ourcares@gmail.com</a> if you
            need deletion support outside of Shopify privacy workflows.
          </p>
        </section>
      </div>
    </main>
  );
}
