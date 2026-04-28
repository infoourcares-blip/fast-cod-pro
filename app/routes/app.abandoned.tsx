import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const leads = await prisma.codSubmission.findMany({
    where: {
      shop: session.shop,
      status: { in: ["pending_manual_review", "received"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return { leads };
};

export default function AbandonedRoute() {
  const { leads } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Abandoned Orders">
      <div className="proShell">
        <section className="proHero proHeroCompact">
          <div>
            <span className="proEyebrow">Lead recovery</span>
            <h1>Capture partial COD intent before shoppers disappear.</h1>
            <p>
              Save phone-first leads, recover them on WhatsApp, and turn unfinished COD journeys into orders.
            </p>
          </div>
          <Link className="proButton" to="/app/integrations">Connect recovery tools</Link>
        </section>

        <section className="proCard">
          <div className="proCardHeader">
            <div>
              <h2>Partial leads</h2>
              <p>Leads that need review or WhatsApp follow-up.</p>
            </div>
            <span className="proPill">{leads.length} leads</span>
          </div>
          <div className="proTable">
            <div className="proTableRow proTableHead">
              <span>Customer</span>
              <span>Product</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {leads.length ? (
              leads.map((lead) => (
                <div className="proTableRow" key={lead.id}>
                  <span>
                    <strong>{lead.customerName}</strong>
                    <small>{lead.phone}</small>
                  </span>
                  <span>{lead.productTitle}</span>
                  <span className="proStatusMuted">{lead.status.replaceAll("_", " ")}</span>
                  <a
                    className="proTextButton"
                    href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </div>
              ))
            ) : (
              <div className="proEmptyState">
                <strong>No abandoned leads yet</strong>
                <span>Once customers start filling the COD flow, recoverable leads will appear here.</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </s-page>
  );
}
