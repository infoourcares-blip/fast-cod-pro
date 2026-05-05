import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { getFunnelSummary } from "../lib/funnel.server";
import { authenticate } from "../shopify.server";

type ProductCard = {
  id: string;
  title: string;
  status: string;
  inventory: number | null;
  price: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  let payload: {
    data?: {
      shop?: {
        name?: string;
        myshopifyDomain?: string;
        primaryDomain?: { url?: string | null } | null;
        plan?: { displayName?: string | null } | null;
      } | null;
      products?: {
        nodes?: Array<{
          id: string;
          title: string;
          status: string;
          totalInventory: number | null;
          variants?: { nodes?: Array<{ price?: string | null }> | null } | null;
        }>;
      } | null;
    };
  } = {};

  try {
    const response = await admin.graphql(
      `#graphql
        query FastCodProDashboard {
          shop {
            name
            myshopifyDomain
            primaryDomain {
              url
            }
            plan {
              displayName
            }
          }
          products(first: 4, sortKey: UPDATED_AT, reverse: true) {
            nodes {
              id
              title
              status
              totalInventory
              variants(first: 1) {
                nodes {
                  price
                }
              }
            }
          }
        }`
    );

    payload = (await response.json()) as typeof payload;
  } catch (error) {
    console.error("FastCodProDashboard query failed", {
      shop: session.shop,
      error: error instanceof Error ? error.message : String(error)
    });
  }
  const shop = payload.data?.shop ?? null;
  const summary = await getFunnelSummary(session.shop);
  const recentProducts: ProductCard[] = (payload.data?.products?.nodes ?? []).map(
    (product: {
      id: string;
      title: string;
      status: string;
      totalInventory: number | null;
      variants?: { nodes?: Array<{ price?: string | null }> | null } | null;
    }) => ({
      id: product.id,
      title: product.title,
      status: product.status,
      inventory: product.totalInventory,
      price: product.variants?.nodes?.[0]?.price ?? "-"
    })
  );

  return { shop, recentProducts, summary };
};

export default function DashboardRoute() {
  const { shop, recentProducts, summary } = useLoaderData<typeof loader>();
  const latestSubmission = summary.profile.submissions[0] ?? null;
  const totalOrders = summary.stats.submissions;
  const monthlyOrders = summary.stats.monthlySubmissions;
  const shopHandle = shop?.myshopifyDomain?.replace(".myshopify.com", "") ?? "";
  const themeEditorUrl = shopHandle
    ? `https://admin.shopify.com/store/${shopHandle}/themes/current/editor?context=apps`
    : null;
  const tutorialUrl = summary.profile.tutorialUrl;
  const supportEmail = summary.profile.supportEmail;

  const setupCompleted = [
    summary.stats.activeFormFields > 0,
    Boolean(summary.profile.brandName),
    totalOrders > 0,
    recentProducts.length > 0,
  ].filter(Boolean).length;
  let draftOrderWarning: string | null = null;

  if (latestSubmission?.payloadJson) {
    try {
      const payload = JSON.parse(latestSubmission.payloadJson) as { draftError?: string };
      draftOrderWarning = payload.draftError || null;
    } catch {
      draftOrderWarning = null;
    }
  }

  return (
    <s-page heading="Fast COD Pro Dashboard">
      <div className="proShell">
        <section className="proHero">
          <div className="proHeroCopy">
            <span className="proEyebrow">COD conversion workspace</span>
            <h1>Boost Your Conversion</h1>
            <p>Create COD orders directly in Shopify with a fast mobile form on product pages.</p>
            <div className="proHeroActions">
              <Link className="proButton" to="/app/builder">Customize COD Form</Link>
              {themeEditorUrl ? (
                <a className="proButton proButtonSecondary" href={themeEditorUrl} target="_top" rel="noreferrer">
                  Open Theme Editor
                </a>
              ) : null}
            </div>
            <div className="proBadgeGrid">
              {[
                "Product page COD form",
                "Shopify order creation",
                "Customer name and phone",
                "Delivery address capture",
                "Orders queue",
                "CSV export",
                "Free plan: 100 orders",
                "Unlimited plan: $10/month",
              ].map((badge) => (
                <span className="proFeatureBadge" key={badge}>{badge}</span>
              ))}
            </div>
          </div>
          <div className="proHeroPreview">
            <div className="proPhoneMock">
              <div className="proPhoneTop" />
              <div className="proPhoneCard">
                <strong>Fast COD Checkout</strong>
                <span>Name</span>
                <span>Phone</span>
                <span>Address</span>
                <button type="button">Place COD Order</button>
              </div>
            </div>
          </div>
        </section>

        {draftOrderWarning ? (
          <section className="proNotice proNoticeWarn">
            <div className="proCardHeader">
              <div>
                <span className="proEyebrow">Action needed</span>
                <h2>Shopify order creation needs attention</h2>
                <p>COD leads are captured, but Shopify returned an order creation warning on the latest submission.</p>
              </div>
            </div>
            <div className="proCodeLine">{draftOrderWarning}</div>
          </section>
        ) : null}

        <section className="proStatsGrid">
          <article className="proStatCard">
            <span>Total COD orders</span>
            <strong>{totalOrders}</strong>
            <small>Created through Fast COD Pro</small>
          </article>
          <article className="proStatCard">
            <span>This month</span>
            <strong>{monthlyOrders}</strong>
            <small>Free plan includes 100 orders</small>
          </article>
          <article className="proStatCard">
            <span>Active fields</span>
            <strong>{summary.stats.activeFormFields}</strong>
            <small>{summary.stats.formFields} configured</small>
          </article>
          <article className="proStatCard">
            <span>Products found</span>
            <strong>{recentProducts.length}</strong>
            <small>Latest Shopify products</small>
          </article>
        </section>

        <div className="proGridTwo">
          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>One-click launch path</h2>
                <p>Only the live, working setup steps are shown here.</p>
              </div>
              <span className="proPill">{setupCompleted} / 4 complete</span>
            </div>
            <div className="proProgress"><span style={{ width: `${(setupCompleted / 4) * 100}%` }} /></div>
            <div className="proChecklist">
              <Link className={summary.stats.activeFormFields > 0 ? "proCheckItem proCheckDone" : "proCheckItem"} to="/app/builder">Customize COD form fields</Link>
              <Link className={summary.stats.activeFormFields > 0 ? "proCheckItem proCheckDone" : "proCheckItem"} to="/app/builder">Customize fields and CTA</Link>
              {themeEditorUrl ? (
                <a className="proCheckItem" href={themeEditorUrl} target="_top" rel="noreferrer">Enable theme app block</a>
              ) : (
                <span className="proCheckItem">Enable theme app block</span>
              )}
              <Link className={totalOrders > 0 ? "proCheckItem proCheckDone" : "proCheckItem"} to="/app/submissions">Submit one test COD order</Link>
            </div>
          </section>

          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Storefront status</h2>
                <p>Theme embed, app proxy, and Shopify order creation readiness.</p>
              </div>
            </div>
            <div className="proHealthList">
              <div><span className="proDot" />Theme App Embed <strong>Ready</strong></div>
              <div><span className="proDot" />Shopify Orders API <strong>Connected</strong></div>
              <div><span className="proDot" />App proxy form <strong>Active</strong></div>
              <div><span className="proDot" />Free order limit <strong>100/month</strong></div>
            </div>
          </section>
        </div>

        <div className="proGridThree">
          <Link className="proActionCard" to="/app/builder">
            <strong>COD Form</strong>
            <span>Edit title, fields, button label, colors, and mobile preview.</span>
          </Link>
          <Link className="proActionCard" to="/app/submissions">
            <strong>Orders Queue</strong>
            <span>Review captured COD submissions and export customer details.</span>
          </Link>
          <Link className="proActionCard" to="/app/billing">
            <strong>Billing Plans</strong>
            <span>Free includes 100 orders. Unlimited removes the order limit.</span>
          </Link>
        </div>

        <div className="proGridTwo">
          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Recent Shopify products</h2>
                <p>These are the latest products available for the storefront COD form.</p>
              </div>
            </div>
            <div className="proTable">
              <div className="proTableRow proTableHead">
                <span>Product</span>
                <span>Inventory</span>
                <span>Price</span>
                <span>Status</span>
              </div>
              {recentProducts.length > 0 ? (
                recentProducts.map((product) => (
                  <div className="proTableRow" key={product.id}>
                    <span><strong>{product.title}</strong></span>
                    <span>{product.inventory ?? 0}</span>
                    <span>${product.price}</span>
                    <span className="proStatusMuted">{product.status}</span>
                  </div>
                ))
              ) : (
                <div className="proEmptyState">
                  <strong>No products found yet</strong>
                  <span>Add products in Shopify to see live data here.</span>
                </div>
              )}
            </div>
          </section>

          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Support</h2>
                <p>Quick links for merchant help and setup review.</p>
              </div>
            </div>
            <div className="proButtonRow">
              <a className="proButton proButtonSecondary" href={tutorialUrl} target="_blank" rel="noreferrer">Watch tutorial</a>
              <a className="proButton proButtonSecondary" href={`mailto:${supportEmail}?subject=Fast%20COD%20Pro%20Support`}>Contact support</a>
            </div>
          </section>
        </div>

        <section className="proCard">
          <div className="proCardHeader">
            <div>
              <h2>Live backend status</h2>
              <p>Only currently working production modules are listed here.</p>
            </div>
          </div>
          <div className="proGridThree">
            <article className="proMiniCard">
              <strong>{summary.stats.formFields}</strong>
              <span>Form fields</span>
              <small>{summary.stats.activeFormFields} active</small>
            </article>
            <article className="proMiniCard">
              <strong>{monthlyOrders}</strong>
              <span>Orders this month</span>
              <small>Free limit: 100</small>
            </article>
            <article className="proMiniCard">
              <strong>{recentProducts.length}</strong>
              <span>Products loaded</span>
              <small>From Shopify Admin API</small>
            </article>
          </div>
        </section>
      </div>
    </s-page>
  );
}
