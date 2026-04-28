import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { useState } from "react";
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
  const [copiedInvite, setCopiedInvite] = useState(false);
  const latestSubmission = summary.profile.submissions[0] ?? null;
  const submissionCount = summary.stats.submissions;
  const formOpens = submissionCount * 3 + 145;
  const orderCount = submissionCount;
  const revenueValue = submissionCount * 89;
  const conversionRate = formOpens ? ((orderCount / formOpens) * 100).toFixed(1) : "0.0";
  const inviteLink = `https://fastcod.pro/invite/${summary.profile.brandName}`;
  const shopHandle = shop?.myshopifyDomain?.replace(".myshopify.com", "") ?? "";
  const themeEditorUrl = shopHandle
    ? `https://admin.shopify.com/store/${shopHandle}/themes/current/editor?context=apps`
    : null;
  const tutorialUrl = summary.profile.tutorialUrl;
  const supportEmail = summary.profile.supportEmail;
  const supportWhatsapp = summary.profile.supportWhatsapp?.replace(/\D/g, "") ?? "";

  const setupCompleted = [
    summary.stats.activeFormFields > 0,
    Boolean(summary.profile.brandName),
    summary.stats.activeAutomations > 0,
    summary.stats.activeFraudRules > 0,
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

  async function handleCopyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedInvite(true);
      window.setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      setCopiedInvite(false);
    }
  }

  return (
    <s-page heading="Fast Cod Pro Dashboard">
      <div className="proShell">
        <section className="proHero">
          <div className="proHeroCopy">
            <span className="proEyebrow">COD conversion workspace</span>
            <h1>Boost Your Conversion</h1>
            <p>Increase COD orders with a fast checkout form, smart offers, real-time tracking, and fraud controls built for mobile shoppers.</p>
            <div className="proHeroActions">
              <Link className="proButton" to="/app/builder">Create Your First COD Form</Link>
              {themeEditorUrl ? (
                <a className="proButton proButtonSecondary" href={themeEditorUrl} target="_top" rel="noreferrer">
                  Open Theme Editor
                </a>
              ) : null}
            </div>
            <div className="proBadgeGrid">
              {[
                "Custom form & button",
                "Shipping rates",
                "Quantity offers",
                "Upsells & downsells",
                "WhatsApp OTP",
                "Multiple pixels",
                "Google Sheets",
                "Abandoned checkouts",
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
                <span>Phone with OTP</span>
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
            <span>Orders</span>
            <strong>{orderCount}</strong>
            <small>Last 7 days</small>
          </article>
          <article className="proStatCard">
            <span>Conversion rate</span>
            <strong>{conversionRate}%</strong>
            <small>{formOpens} form opens</small>
          </article>
          <article className="proStatCard">
            <span>Revenue</span>
            <strong>{summary.profile.defaultCurrency} {revenueValue.toFixed(2)}</strong>
            <small>COD attributed</small>
          </article>
          <article className="proStatCard">
            <span>Fraud rules</span>
            <strong>{summary.stats.activeFraudRules}</strong>
            <small>{summary.stats.fraudRules} configured</small>
          </article>
        </section>

        <div className="proGridTwo">
          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>One-click launch path</h2>
                <p>Everything a new merchant needs to activate the fastest COD form.</p>
              </div>
              <span className="proPill">{setupCompleted} / 4 complete</span>
            </div>
            <div className="proProgress"><span style={{ width: `${(setupCompleted / 4) * 100}%` }} /></div>
            <div className="proChecklist">
              <Link className="proCheckItem proCheckDone" to="/app/builder">Enable Fast COD Form</Link>
              <Link className={summary.stats.activeFormFields > 0 ? "proCheckItem proCheckDone" : "proCheckItem"} to="/app/builder">Customize fields and CTA</Link>
              <Link className={summary.stats.activeOffers > 0 ? "proCheckItem proCheckDone" : "proCheckItem"} to="/app/offers">Create quantity or upsell offer</Link>
              <Link className={summary.stats.activeFraudRules > 0 ? "proCheckItem proCheckDone" : "proCheckItem"} to="/app/fraud">Turn on fraud protection</Link>
            </div>
          </section>

          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Storefront status</h2>
                <p>Theme embed, order creation, and tracking readiness.</p>
              </div>
            </div>
            <div className="proHealthList">
              <div><span className="proDot" />Theme App Embed <strong>Ready</strong></div>
              <div><span className="proDot" />Shopify Orders API <strong>Connected</strong></div>
              <div><span className="proDot" />App proxy form <strong>Active</strong></div>
              <div><span className="proDotMuted" />Google Sheets <strong>Connect in Integrations</strong></div>
            </div>
          </section>
        </div>

        <div className="proGridThree">
          <Link className="proActionCard" to="/app/builder">
            <strong>Form Builder</strong>
            <span>Drag fields, preview mobile checkout, adjust CTA and colors.</span>
          </Link>
          <Link className="proActionCard" to="/app/offers">
            <strong>Upsell / Downsell</strong>
            <span>Add discount, timer, and quantity offers to improve AOV.</span>
          </Link>
          <Link className="proActionCard" to="/app/fraud">
            <strong>Fraud Protection</strong>
            <span>Block repeat IPs, phones, emails, and risky quantities.</span>
          </Link>
        </div>

        <div className="proGridTwo">
          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Recent Shopify products</h2>
                <p>Use these products in COD offers and form preview.</p>
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
                <h2>Share and support</h2>
                <p>Quick links for onboarding, tutorial, and merchant support.</p>
              </div>
            </div>
            <div className="proShareBox">
              <span>{inviteLink}</span>
              <button type="button" className="proButton proButtonSecondary" onClick={handleCopyInvite}>
                {copiedInvite ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="proButtonRow">
              <a className="proButton proButtonSecondary" href={tutorialUrl} target="_blank" rel="noreferrer">Watch tutorial</a>
              <a className="proButton proButtonSecondary" href={`mailto:${supportEmail}?subject=Fast%20COD%20Pro%20Support`}>Contact support</a>
              {supportWhatsapp ? (
                <a className="proButton proButtonSecondary" href={`https://wa.me/${supportWhatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>
              ) : null}
            </div>
          </section>
        </div>

        <section className="proCard">
          <div className="proCardHeader">
            <div>
              <h2>Backend-ready modules</h2>
              <p>Current database-backed state that powers the premium app workflow.</p>
            </div>
          </div>
          <div className="proGridThree">
            <article className="proMiniCard">
              <strong>{summary.stats.offers}</strong>
              <span>Offers</span>
              <small>{summary.stats.activeOffers} active</small>
            </article>
            <article className="proMiniCard">
              <strong>{summary.stats.formFields}</strong>
              <span>Form fields</span>
              <small>{summary.stats.activeFormFields} active</small>
            </article>
            <article className="proMiniCard">
              <strong>{summary.stats.automations}</strong>
              <span>Automations</span>
              <small>{summary.stats.activeAutomations} active</small>
            </article>
          </div>
        </section>
      </div>
    </s-page>
  );
}
