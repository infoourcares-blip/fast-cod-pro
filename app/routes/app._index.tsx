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
  const appUrl = (process.env.SHOPIFY_APP_URL?.trim() || new URL(request.url).origin).replace(/\/$/, "");
  const supportEmail =
    process.env.SUPPORT_EMAIL?.trim() ||
    summary.profile.supportEmail?.trim() ||
    "info.ourcares@gmail.com";
  const supportUrl = `${appUrl}/support`;
  const tutorialUrl =
    process.env.SUPPORT_TUTORIAL_URL?.trim() ||
    summary.profile.tutorialUrl?.trim() ||
    `${supportUrl}#tutorial`;
  const whatsappSupportUrl =
    process.env.SUPPORT_WHATSAPP_URL?.trim() ||
    "https://wa.me/919718127346?text=Hi%20Fast%20COD%20Pro%20support%2C%20I%20need%20help%20with%20my%20Shopify%20app.";
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

  return {
    shop,
    recentProducts,
    summary,
    supportLinks: {
      supportEmail,
      supportUrl,
      tutorialUrl,
      whatsappSupportUrl
    }
  };
};

export default function DashboardRoute() {
  const { shop, recentProducts, summary, supportLinks } = useLoaderData<typeof loader>();
  const latestSubmission = summary.profile.submissions[0] ?? null;
  const totalOrders = summary.stats.submissions;
  const monthlyOrders = summary.stats.monthlySubmissions;
  const shopHandle = shop?.myshopifyDomain?.replace(".myshopify.com", "") ?? "";
  const themeEditorUrl = shopHandle
    ? `https://admin.shopify.com/store/${shopHandle}/themes/current/editor?context=apps`
    : null;
  const { supportEmail, whatsappSupportUrl } = supportLinks;
  const supportSubject = encodeURIComponent(
    `Fast COD Pro support for ${shop?.myshopifyDomain ?? "merchant store"}`
  );
  const supportBody = encodeURIComponent(
    `Store: ${shop?.myshopifyDomain ?? ""}\nIssue:\nSteps to reproduce:\n`
  );
  const supportMailHref = `mailto:${supportEmail}?subject=${supportSubject}&body=${supportBody}`;

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
            <p>Send shoppers from the product page into secure Shopify Checkout for COD payment.</p>
            <div className="proHeroActions">
              <Link className="proButton" to="/app/builder">Customize checkout button</Link>
              {themeEditorUrl ? (
                <a className="proButton proButtonSecondary" href={themeEditorUrl} target="_top" rel="noreferrer">
                  Open Theme Editor
                </a>
              ) : null}
            </div>
            <div className="proBadgeGrid">
              {[
                "Product page checkout button",
                "Uses Shopify Checkout",
                "No offsite checkout",
                "Customer details collected by Shopify",
                "Theme app block",
                "Button color controls",
                "COD through Shopify payment settings",
                "App Store review compliant",
              ].map((badge) => (
                <span className="proFeatureBadge" key={badge}>{badge}</span>
              ))}
            </div>
          </div>
          <div className="proHeroPreview">
            <div className="proPhoneMock">
              <div className="proPhoneTop" />
              <div className="proPhoneCard">
                <strong>Fast COD Pro</strong>
                <span>Product added to cart</span>
                <span>Secure Shopify Checkout</span>
                <span>COD payment method</span>
                <button type="button">Continue to Checkout</button>
              </div>
            </div>
          </div>
        </section>

        {draftOrderWarning ? (
          <section className="proNotice proNoticeWarn">
            <div className="proCardHeader">
              <div>
                <span className="proEyebrow">Action needed</span>
                <h2>Legacy submission warning</h2>
                <p>This warning came from the old order creation flow. The storefront now uses Shopify Checkout.</p>
              </div>
            </div>
            <div className="proCodeLine">{draftOrderWarning}</div>
          </section>
        ) : null}

        <section className="proStatsGrid">
          <article className="proStatCard">
            <span>Captured requests</span>
            <strong>{totalOrders}</strong>
            <small>Legacy queue records</small>
          </article>
          <article className="proStatCard">
            <span>This month</span>
            <strong>{monthlyOrders}</strong>
            <small>Legacy queue count</small>
          </article>
          <article className="proStatCard">
            <span>Button settings</span>
            <strong>{summary.stats.activeFormFields}</strong>
            <small>Checkout button configured</small>
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
              <Link className="proCheckItem proCheckDone" to="/app/builder">Customize checkout button</Link>
              <Link className="proCheckItem proCheckDone" to="/app/builder">Use Shopify-hosted checkout fields</Link>
              {themeEditorUrl ? (
                <a className="proCheckItem" href={themeEditorUrl} target="_top" rel="noreferrer">Enable theme app block</a>
              ) : (
                <span className="proCheckItem">Enable theme app block</span>
              )}
              <a className="proCheckItem" href="/checkout" target="_top" rel="noreferrer">Test Shopify Checkout flow</a>
            </div>
          </section>

          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Storefront status</h2>
                <p>Theme embed, app proxy, and Shopify Checkout readiness.</p>
              </div>
            </div>
            <div className="proHealthList">
              <div><span className="proDot" />Theme App Embed <strong>Ready</strong></div>
              <div><span className="proDot" />Shopify Checkout <strong>Required</strong></div>
              <div><span className="proDot" />App proxy config <strong>Active</strong></div>
              <div><span className="proDot" />Order creation API <strong>Disabled</strong></div>
            </div>
          </section>
        </div>

        <div className="proGridThree">
          <Link className="proActionCard" to="/app/builder">
            <strong>Checkout button</strong>
            <span>Edit button label, colors, icon, animation, and theme placement.</span>
          </Link>
          <Link className="proActionCard" to="/app/submissions">
            <strong>Orders Queue</strong>
            <span>Review legacy captured requests before the Shopify Checkout update.</span>
          </Link>
          <Link className="proActionCard" to="/app/billing">
            <strong>Billing Plans</strong>
            <span>Manage the app plan for storefront checkout button features.</span>
          </Link>
        </div>

        <div className="proGridTwo">
          <section className="proCard">
            <div className="proCardHeader">
              <div>
                <h2>Recent Shopify products</h2>
                <p>These are the latest products available for the storefront checkout button.</p>
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
                <p>
                  Need help with setup, Shopify Checkout, or billing? Email us at{" "}
                  <a className="proInlineLink" href={supportMailHref}>
                    {supportEmail}
                  </a>
                  .
                </p>
              </div>
            </div>
            <div className="proButtonRow">
              <a className="proButton proButtonSecondary" href={supportMailHref} target="_top" rel="noreferrer">
                Contact support
              </a>
              {whatsappSupportUrl ? (
                <a className="proButton proButtonSecondary" href={whatsappSupportUrl} target="_blank" rel="noreferrer">
                  WhatsApp support
                </a>
              ) : null}
            </div>
          </section>
        </div>

        <section className="proCard">
          <div className="proCardHeader">
            <div>
              <h2>Live app status</h2>
              <p>Only Shopify Checkout compliant modules are listed here.</p>
            </div>
          </div>
          <div className="proGridThree">
            <article className="proMiniCard">
              <strong>{summary.stats.formFields}</strong>
              <span>Checkout button</span>
              <small>Theme app block</small>
            </article>
            <article className="proMiniCard">
              <strong>{monthlyOrders}</strong>
              <span>Legacy records</span>
              <small>No app-created orders</small>
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
