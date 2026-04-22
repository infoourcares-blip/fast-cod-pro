export default function SupportRoute() {
  return (
    <main className="legalPage">
      <div className="legalShell">
        <p className="legalEyebrow">Fast Cod Pro</p>
        <h1 className="legalTitle">Support</h1>
        <p className="legalLead">
          Need help with onboarding, storefront setup, COD form behavior, billing, or exports? Use
          the resources below to get your store configured quickly.
        </p>

        <section className="legalSection">
          <h2>Primary support contact</h2>
          <p>
            Email: <a href="mailto:info.ourcares@gmail.com">info.ourcares@gmail.com</a>
          </p>
        </section>

        <section className="legalSection">
          <h2>Setup checklist</h2>
          <ul className="legalList">
            <li>Install the app in a development or live store.</li>
            <li>Open the Form Designer and confirm your required COD fields.</li>
            <li>Enable the theme app block in the product template.</li>
            <li>Test the launcher button and popup on desktop and mobile.</li>
            <li>Verify submissions inside Orders Queue and CSV export.</li>
          </ul>
        </section>

        <section className="legalSection">
          <h2>Response expectations</h2>
          <p>
            Typical support requests should include the store URL, screenshots, browser details,
            and the exact page where the issue occurred.
          </p>
        </section>
      </div>
    </main>
  );
}
