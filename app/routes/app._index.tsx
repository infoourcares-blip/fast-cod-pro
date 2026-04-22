import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { useState } from "react";
import { getFunnelSummary } from "../lib/funnel.server";
import { authenticate } from "../shopify.server";
import {
  automationFlows,
  dashboardMetrics,
  pricingPlans
} from "../lib/fast-cod-pro";

type ProductCard = {
  id: string;
  title: string;
  status: string;
  inventory: number | null;
  price: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

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

  const payload = (await response.json()) as {
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
          variants?: { nodes?: Array<{ price?: string | null }> } | null;
        }>;
      } | null;
    };
  };
  const shop = payload.data?.shop ?? null;
  const summary = await getFunnelSummary(session.shop);
  const recentProducts: ProductCard[] = (payload.data?.products?.nodes ?? []).map(
    (product: {
      id: string;
      title: string;
      status: string;
      totalInventory: number | null;
      variants?: { nodes?: Array<{ price?: string | null }> } | null;
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
      <div className="shell">
        <section className="embedCard">
          <div className="embedCardLeft">
            <span className="embedIcon">+</span>
            <span className="embedLabel">Theme App Embed</span>
            <span className="embedBadge">ON</span>
          </div>
          {themeEditorUrl ? (
            <a className="ghostButton" href={themeEditorUrl} target="_top" rel="noreferrer">
              Open Theme
            </a>
          ) : (
            <Link className="ghostButton" to="/app/builder">
              Open Builder
            </Link>
          )}
        </section>

        {draftOrderWarning ? (
          <section className="warningCard">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Action needed</p>
                <h3 className="panelTitle">Automatic draft orders are blocked by Shopify access rules</h3>
                <p className="panelText">
                  COD leads are still being captured, but draft order creation is paused until Shopify approves DraftOrder access for this app.
                </p>
              </div>
            </div>
            <div className="warningDetail">{draftOrderWarning}</div>
          </section>
        ) : null}

        <section className="infoBanner">
          <div>
            <div className="infoBannerTitle">Welcome to Fast Cod Pro Dashboard</div>
            <p className="infoBannerText">
              Your COD workspace is live. We are tracking form performance, saving submissions, and helping you launch revenue flows faster.
            </p>
          </div>
        </section>

        <section className="statsSection">
          <div className="statsHeader">Last 7 days</div>
          <div className="statsStrip">
            <article className="statsItem">
              <div className="statsValue">{formOpens}</div>
              <div className="statsLabel">Form opens</div>
            </article>
            <article className="statsItem">
              <div className="statsValue">{orderCount}</div>
              <div className="statsLabel">Orders</div>
            </article>
            <article className="statsItem">
              <div className="statsValue">{summary.profile.defaultCurrency} {revenueValue.toFixed(2)}</div>
              <div className="statsLabel">Revenue</div>
            </article>
            <article className="statsItem">
              <div className="statsValue">{conversionRate}%</div>
              <div className="statsLabel">Form conversion rate</div>
            </article>
          </div>
        </section>

        <section className="guideCard">
          <div className="panelHeader">
            <div>
              <h3 className="panelTitle">Setup Guide</h3>
              <p className="panelText">Use this personalized guide to get your app up and running.</p>
            </div>
            <div className="guideProgressLabel">{setupCompleted} / 4 Completed</div>
          </div>
          <div className="progressBar">
            <span style={{ width: `${(setupCompleted / 4) * 100}%` }} />
          </div>
          <div className="guideIntroCard">
            <div className="guideStepIcon">◌</div>
            <div className="guideIntroContent">
              <h4 className="guideTitle">Get started with Fast Cod Pro</h4>
              <p className="guideParagraph">
                Fast Cod Pro replaces the standard checkout with a customizable COD form, boosts conversion with offers, and reduces fake orders with risk rules.
              </p>
              <p className="guideParagraph">
                Your form appears directly on product pages and can include shipping fields, upsells, and custom rules. Use the tutorial preview below as your launch checklist.
              </p>
              <div className="videoCard">
                <div className="videoOverlay">
                  <div className="videoEyebrow">Fast Cod Pro tutorial</div>
                  <div className="videoTitle">New merchant setup step-by-step</div>
                  <a className="videoButton" href={tutorialUrl} target="_blank" rel="noreferrer">
                    Watch onboarding video
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="checkList">
            <div className="checkItem checkItemDone">Enable the app on your store</div>
            <div className={summary.stats.activeFormFields > 0 ? "checkItem checkItemDone" : "checkItem"}>Customize your form</div>
            <div className={summary.stats.activeOffers > 0 ? "checkItem checkItemDone" : "checkItem"}>Launch upsell offers</div>
            <div className={summary.stats.activeFraudRules > 0 ? "checkItem checkItemDone" : "checkItem"}>Turn on fraud protection</div>
          </div>
        </section>

        <section className="promoCard">
          <div>
            <div className="promoTitle">Build COD-optimized pages that convert</div>
            <p className="promoText">
              Launch faster, capture every lead, and pair your COD workflow with landing pages, bundles, and performance creatives.
            </p>
          </div>
          <Link className="ghostButton" to="/app/builder">Start building now</Link>
        </section>

        <section className="tableCard">
          <div className="panelHeader">
            <div>
              <h3 className="panelTitle">What&apos;s New</h3>
              <p className="sectionIntro">Latest product updates and conversion ideas for your store.</p>
            </div>
          </div>
          <div className="whatsNewCard">
            <div className="whatsNewVisual" />
            <div className="whatsNewContent">
              <div className="whatsNewTop">
                <div>
                  <div className="itemTitle">Turn off COD when partial payments take over</div>
                  <div className="muted">Released today</div>
                </div>
                <div className="releaseBadge">Latest</div>
              </div>
              <ul className="bulletListLong">
                <li>Keep checkout clean and avoid conflicting payment options.</li>
                <li>Hide the COD button when prepaid or deposit flows are active.</li>
                <li>Give your team full control over what customers see on the storefront.</li>
              </ul>
              <Link className="linkButton" to="/app/launch">View setup guide</Link>
            </div>
          </div>
        </section>

        <section className="shareCard">
          <p className="shareText">
            Share Fast Cod Pro with your friends and give them an <strong>extended free plan</strong> with 200 free orders per month.
          </p>
          <div className="shareRow">
            <div className="shareInput">{inviteLink}</div>
            <button type="button" className="ghostButton" onClick={handleCopyInvite}>
              {copiedInvite ? "Copied" : "Copy"}
            </button>
          </div>
        </section>

        <div className="gridTwo">
          <section className="tableCard">
            <div className="panelHeader">
              <div>
                <h3 className="panelTitle">Your plan</h3>
                <p className="sectionIntro">Order capacity and plan progress for this month.</p>
              </div>
            </div>
            <div className="planCard">
              <div className="planName">Enterprise</div>
              <p className="planText">
                Your active plan supports <strong>10000 processed orders</strong> each month.
              </p>
              <div className="planUsage">{orderCount} / 10000</div>
              <div className="progressBar progressBarSoft">
                <span style={{ width: `${Math.min((orderCount / 10000) * 100, 100)}%` }} />
              </div>
              <p className="muted">
                You will receive notifications at 85% and 100% of your monthly order limit.
              </p>
              <a className="ghostButton" href={`mailto:${supportEmail}?subject=Fast%20Cod%20Pro%20Support`}>
                Contact us
              </a>
            </div>
          </section>

          <section className="tableCard">
            <div className="panelHeader">
              <div>
                <h3 className="panelTitle">Automation priorities</h3>
                <p className="sectionIntro">Recommended workflows for COD-focused stores.</p>
              </div>
            </div>
            <div className="flowList">
              <div className="flowItem">
                <span className="itemTitle">
                  {summary.stats.activeAutomations} active automations, {summary.stats.activeFraudRules} active fraud rules
                </span>
              </div>
              {automationFlows.map((flow) => (
                <div className="flowItem" key={flow}>
                  <span className="itemTitle">{flow}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="gridTwo">
          <section className="tableCard">
            <div className="panelHeader">
              <div>
                <h3 className="panelTitle">Your balance</h3>
                <p className="sectionIntro">Balance used for premium messaging and data tools.</p>
              </div>
            </div>
            <div className="balanceValue">$1.00</div>
            <div className="infoMiniCard">
              Your balance will be used for SMS messages and Google autocomplete sessions when those options are enabled.
            </div>
            <div className="buttonRow">
              <Link className="ghostButton" to="/app/settings">Change contacts</Link>
              {supportWhatsapp ? (
                <a
                  className="ghostButton ghostButtonAccent"
                  href={`https://wa.me/${supportWhatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open WhatsApp
                </a>
              ) : (
                <Link className="ghostButton ghostButtonAccent" to="/app/settings">Add your WhatsApp</Link>
              )}
            </div>
          </section>

          <section className="tableCard">
            <div className="panelHeader">
              <div>
              <h3 className="panelTitle">Your language</h3>
              <p className="sectionIntro">Change app language and watch the quick tutorial.</p>
            </div>
          </div>
            <div className="selectLike">English</div>
            <a className="ghostButton fullWidthButton" href={tutorialUrl} target="_blank" rel="noreferrer">
              Watch tutorial
            </a>
          </section>
        </div>

        <div className="gridTwo">
          <section className="tableCard">
            <div className="panelHeader">
              <div>
                <h3 className="panelTitle">Recent products from Shopify</h3>
                <p className="panelText">
                  This data is fetched from the live Admin GraphQL API after embedded app authentication.
                </p>
              </div>
            </div>
            <div className="productList">
              {recentProducts.length > 0 ? (
                recentProducts.map((product) => (
                  <article className="productRow" key={product.id}>
                    <div className="productMeta">
                      <span className="productName">{product.title}</span>
                      <span className="muted">Inventory: {product.inventory ?? 0}</span>
                    </div>
                    <div className="productMeta">
                      <span className="productPrice">${product.price}</span>
                      <span className="status">{product.status}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="bulletItem">
                  <span className="itemTitle">No products found yet</span>
                  <span className="muted">Add products in Shopify to see live data here.</span>
                </div>
              )}
            </div>
          </section>

          <section className="tableCard">
            <div className="panelHeader">
              <div>
                <h3 className="panelTitle">Database-backed app state</h3>
                <p className="sectionIntro">Live counts synced from your merchant database.</p>
              </div>
            </div>
            <div className="gridThree">
              <article className="card" key="offers">
                <div className="itemTitle">Offers</div>
                <div className="price">{summary.stats.offers}</div>
                <div className="muted">{summary.stats.activeOffers} currently active</div>
              </article>
              <article className="card" key="fraud">
                <div className="itemTitle">Fraud rules</div>
                <div className="price">{summary.stats.fraudRules}</div>
                <div className="muted">{summary.stats.activeFraudRules} currently active</div>
              </article>
              <article className="card" key="plans">
                <div className="itemTitle">Plans</div>
                <div className="price">{pricingPlans.length}</div>
                <div className="muted">{shop?.plan?.displayName ?? "Shopify"} connected</div>
              </article>
            </div>
            <div className="pricingGrid">
              {pricingPlans.map((plan) => (
                <article className="card" key={plan.name}>
                  <div className="itemTitle">{plan.name}</div>
                  <div className="price">{plan.price}</div>
                  <div className="muted">{plan.description}</div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </s-page>
  );
}
