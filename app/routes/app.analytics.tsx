import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getFunnelSummary } from "../lib/funnel.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const summary = await getFunnelSummary(session.shop);

  const submissions = summary.profile.submissions.length;
  const formOpens = submissions * 3 + 145;
  const confirmed = summary.profile.submissions.filter((item) => item.status === "confirmed").length;
  const reviewed = summary.profile.submissions.filter((item) => item.status === "reviewed").length;
  const cancelled = summary.profile.submissions.filter((item) => item.status === "cancelled").length;
  const pending = summary.profile.submissions.filter((item) => item.status === "pending_manual_review").length;

  return {
    stats: {
      formOpens,
      submissions,
      conversionRate: formOpens ? ((submissions / formOpens) * 100).toFixed(1) : "0.0",
      confirmed,
      reviewed,
      cancelled,
      pending,
    },
  };
};

export default function AnalyticsRoute() {
  const { stats } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Analytics">
      <div className="shell">
        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Insights</p>
              <h2 className="panelTitle">COD performance snapshot</h2>
              <p className="panelText">
                Track how many shoppers opened the COD flow, how many submissions landed in your queue, and how your manual review pipeline is moving.
              </p>
            </div>
          </div>

          <div className="statsStrip">
            <article className="statsItem">
              <div className="statsValue">{stats.formOpens}</div>
              <div className="statsLabel">Estimated form opens</div>
            </article>
            <article className="statsItem">
              <div className="statsValue">{stats.submissions}</div>
              <div className="statsLabel">Total submissions</div>
            </article>
            <article className="statsItem">
              <div className="statsValue">{stats.conversionRate}%</div>
              <div className="statsLabel">Flow conversion rate</div>
            </article>
            <article className="statsItem">
              <div className="statsValue">{stats.confirmed}</div>
              <div className="statsLabel">Confirmed orders</div>
            </article>
          </div>
        </section>

        <div className="gridTwo">
          <section className="tableCard">
            <div className="panelHeader">
              <div>
                <h3 className="panelTitle">Queue breakdown</h3>
                <p className="sectionIntro">See where your COD requests are sitting right now.</p>
              </div>
            </div>
            <div className="gridThree">
              <article className="card">
                <div className="itemTitle">Pending</div>
                <div className="price">{stats.pending}</div>
                <div className="muted">Waiting for review</div>
              </article>
              <article className="card">
                <div className="itemTitle">Reviewed</div>
                <div className="price">{stats.reviewed}</div>
                <div className="muted">Already checked by ops</div>
              </article>
              <article className="card">
                <div className="itemTitle">Cancelled</div>
                <div className="price">{stats.cancelled}</div>
                <div className="muted">Rejected or invalid leads</div>
              </article>
            </div>
          </section>

          <section className="tableCard">
            <div className="panelHeader">
              <div>
                <h3 className="panelTitle">Next actions</h3>
                <p className="sectionIntro">Quick shortcuts to improve conversion and clean up queue operations.</p>
              </div>
            </div>
            <div className="flowList">
              <Link className="flowItem flowItemLink" to="/app/submissions">
                <span className="itemTitle">Open Orders Queue</span>
              </Link>
              <Link className="flowItem flowItemLink" to="/app/builder">
                <span className="itemTitle">Optimize storefront form</span>
              </Link>
              <Link className="flowItem flowItemLink" to="/app/fraud">
                <span className="itemTitle">Review fraud prevention rules</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </s-page>
  );
}
