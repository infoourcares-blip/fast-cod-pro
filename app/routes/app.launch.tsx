import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getFunnelSummary } from "../lib/funnel.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const summary = await getFunnelSummary(session.shop);
  const latestSubmission = summary.profile.submissions[0] ?? null;

  let orderWarning: string | null = null;
  if (latestSubmission?.payloadJson) {
    try {
      const payload = JSON.parse(latestSubmission.payloadJson) as { draftError?: string };
      orderWarning = payload.draftError || null;
    } catch {
      orderWarning = null;
    }
  }

  const checklist = [
    {
      title: "Legal pages published",
      status: "done",
      detail: "Privacy Policy, Terms of Service, Support, and Data Deletion pages are now available.",
    },
    {
      title: "Privacy webhooks connected",
      status: "done",
      detail: "customers/data_request, customers/redact, shop/redact, and app/uninstalled handlers are implemented.",
    },
    {
      title: "Merchant data cleanup on uninstall",
      status: "done",
      detail: "Sessions and Fast COD Pro merchant data are purged when the app is removed.",
    },
    {
      title: "COD order flow tested",
      status: "pending",
      detail: "Run one product page test and confirm the popup creates a Shopify COD order and opens the native order status page.",
    },
    {
      title: "App listing assets prepared",
      status: "pending",
      detail: "Prepare final App Store screenshots, app icon, demo video, and listing copy before submitting.",
    },
    {
      title: "Native Shopify order page verified",
      status: "done",
      detail: "The storefront redirects customers to Shopify's native order status page after the COD order is created.",
    },
    {
      title: "Production billing validation",
      status: "pending",
      detail: "Test plan approval, charge acceptance, downgrade, cancellation, and failed billing scenarios in a production-like store.",
    },
    {
      title: "Store review QA",
      status: "pending",
      detail: "Run final install, onboarding, mobile storefront, export, settings, and uninstall QA before submitting to the App Store.",
    },
  ];

  return {
    summary,
    checklist,
    orderWarning,
  };
};

export default function LaunchRoute() {
  const { checklist, orderWarning } = useLoaderData<typeof loader>();
  const completed = checklist.filter((item) => item.status === "done").length;

  return (
    <s-page heading="Launch Readiness">
      <div className="shell">
        <section className="launchHero">
          <div>
            <p className="eyebrow">App Store readiness</p>
            <h2 className="launchHeroTitle">Fast COD Pro launch checklist</h2>
            <p className="sectionIntro">
              This page tracks what is already complete inside the app, what still needs merchant
              QA, and what Shopify approvals are still blocking full production release.
            </p>
          </div>
          <div className="launchHeroScore">
            <div className="launchHeroScoreValue">{completed}/{checklist.length}</div>
            <div className="launchHeroScoreLabel">steps completed</div>
          </div>
        </section>

        {orderWarning ? (
          <section className="warningCard">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Critical blocker</p>
                <h3 className="panelTitle">Latest order test needs attention</h3>
                <p className="panelText">
                  The latest COD order test returned a Shopify warning. Resolve it before submitting
                  a new App Store review build.
                </p>
              </div>
            </div>
            <div className="warningDetail">{orderWarning}</div>
          </section>
        ) : null}

        <section className="launchChecklist">
          {checklist.map((item) => (
            <article key={item.title} className={`launchItem launchItem-${item.status}`}>
              <div className={`launchItemStatus launchItemStatus-${item.status}`}>
                {item.status === "done" ? "Done" : item.status === "blocked" ? "Blocked" : "Pending"}
              </div>
              <div>
                <h3 className="launchItemTitle">{item.title}</h3>
                <p className="launchItemText">{item.detail}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="tableCard">
          <div className="panelHeader">
            <div>
              <h3 className="panelTitle">Public pages ready for listing</h3>
              <p className="sectionIntro">Use these URLs in your App Store listing and support materials.</p>
            </div>
          </div>
          <div className="launchLinks">
            <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
            <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a>
            <a href="/support" target="_blank" rel="noreferrer">Support</a>
            <a href="/data-deletion" target="_blank" rel="noreferrer">Data Deletion</a>
          </div>
        </section>
      </div>
    </s-page>
  );
}
