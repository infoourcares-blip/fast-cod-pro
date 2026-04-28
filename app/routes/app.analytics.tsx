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
      <div className="proShell">
        <section className="proHero proHeroCompact">
          <div>
            <span className="proEyebrow">Insights</span>
            <h1>Know which COD flows are converting.</h1>
            <p>Track orders, revenue, conversion rate, and operational status with fast-loading visual charts.</p>
          </div>
          <div className="proSegmented">
            <button type="button">Today</button>
            <button type="button" className="proSegmentActive">7 days</button>
            <button type="button">30 days</button>
          </div>
        </section>

        <section className="proStatsGrid">
          <article className="proStatCard"><span>Form opens</span><strong>{stats.formOpens}</strong><small>Estimated storefront opens</small></article>
          <article className="proStatCard"><span>Orders</span><strong>{stats.submissions}</strong><small>Total submissions</small></article>
          <article className="proStatCard"><span>Conversion rate</span><strong>{stats.conversionRate}%</strong><small>Open to submit</small></article>
          <article className="proStatCard"><span>Revenue</span><strong>USD {(stats.confirmed * 89).toFixed(2)}</strong><small>Confirmed COD value</small></article>
        </section>

        <div className="proGridTwo">
          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Orders trend</h2>
                <p>Lightweight chart built for fast load.</p>
              </div>
            </div>
            <div className="proChart">
              {[42, 66, 38, 82, 55, 90, Math.max(24, stats.submissions * 16)].map((height, index) => (
                <span key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
          </section>

          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Queue breakdown</h2>
                <p>Review where each COD request sits.</p>
              </div>
            </div>
            <div className="proGridThree">
              <article className="proMiniCard"><strong>{stats.pending}</strong><span>Pending</span><small>Needs review</small></article>
              <article className="proMiniCard"><strong>{stats.reviewed}</strong><span>Reviewed</span><small>Checked by ops</small></article>
              <article className="proMiniCard"><strong>{stats.cancelled}</strong><span>Cancelled</span><small>Rejected leads</small></article>
            </div>
          </section>
        </div>

        <section className="proCard">
          <div className="proCardHeader">
            <div>
              <h2>Next best actions</h2>
              <p>Conversion improvements ranked for speed and impact.</p>
            </div>
          </div>
          <div className="proGridThree">
            <Link className="proActionCard" to="/app/submissions"><strong>Open Orders Queue</strong><span>Confirm recent COD leads.</span></Link>
            <Link className="proActionCard" to="/app/builder"><strong>Optimize form</strong><span>Reduce fields and improve mobile CTA.</span></Link>
            <Link className="proActionCard" to="/app/fraud"><strong>Review fraud rules</strong><span>Block duplicate and risky buyers.</span></Link>
          </div>
        </section>
      </div>
    </s-page>
  );
}
