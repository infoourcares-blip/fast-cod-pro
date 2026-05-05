import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { useMemo, useState } from "react";
import { authenticate } from "../shopify.server";
import {
  PAID_BILLING_PLANS,
  UNLIMITED_ANNUAL_PLAN,
  UNLIMITED_MONTHLY_PLAN,
  type PaidBillingPlan,
} from "../lib/billing-plans";
import { getFunnelSummary } from "../lib/funnel.server";

type ActionData = {
  status: "success" | "error";
  message: string;
} | null;

type BillingState = {
  hasActivePayment: boolean;
};

const FREE_PLAN_ID = "free";
const UNLIMITED_PLAN_ID = "unlimited";
const FREE_ORDER_LIMIT = 100;
const UNLIMITED_MONTHLY_PRICE = 10;
const UNLIMITED_ANNUAL_PRICE = 102;
const ANNUAL_DISCOUNT_PERCENT = 15;

function isRedirectResponse(error: unknown): error is Response {
  return (
    error instanceof Response ||
    (typeof error === "object" &&
      error !== null &&
      "status" in error &&
      "headers" in error &&
      typeof (error as { status?: unknown }).status === "number" &&
      (Number((error as { status: number }).status) >= 300 ||
        Number((error as { status: number }).status) === 401))
  );
}

function getErrorMessage(error: unknown) {
  const errorData =
    typeof error === "object" && error !== null && "errorData" in error
      ? (error as { errorData?: unknown }).errorData
      : null;

  const errorDetails = errorData
    ? ` Details: ${JSON.stringify(errorData)}`
    : "";

  if (error instanceof Error) {
    return `${error.message}${errorDetails}`;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return `${String((error as { message?: unknown }).message || "")}${errorDetails}`;
  }

  return `${String(error || "")}${errorDetails}`;
}

const planCatalog = [
  {
    id: FREE_PLAN_ID,
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    usageLimit: FREE_ORDER_LIMIT,
    description: "Start with 100 COD orders every month.",
    features: [
      "100 COD orders/month",
      "Fast COD form on product pages",
      "Orders created in Shopify",
      "Basic order dashboard",
    ],
    cta: "Current free plan",
    variant: "free",
  },
  {
    id: UNLIMITED_PLAN_ID,
    name: "Unlimited",
    monthlyPrice: UNLIMITED_MONTHLY_PRICE,
    annualPrice: UNLIMITED_ANNUAL_PRICE,
    usageLimit: null,
    description: "Unlimited COD orders for growing stores.",
    features: [
      "Unlimited COD orders/month",
      "Fast COD form on product pages",
      "Orders created in Shopify",
      "Basic order dashboard",
    ],
    cta: "Select Unlimited",
    variant: "featured",
  },
] as const;

const billingTestMode = process.env.SHOPIFY_BILLING_TEST === "true";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  let billingState: BillingState = { hasActivePayment: false };

  try {
    billingState = await billing.check({
      plans: [...PAID_BILLING_PLANS],
      isTest: billingTestMode
    });
  } catch (error) {
    console.error("Unable to check Shopify billing status", error);
  }

  const summary = await getFunnelSummary(session.shop);

  return {
    billingState,
    summary,
    supportEmail: summary.profile.supportEmail,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "subscribe") {
    const plan = String(formData.get("plan") || "") as PaidBillingPlan;

    if (!PAID_BILLING_PLANS.includes(plan)) {
      return { status: "error" as const, message: "Choose a billing plan." };
    }

    try {
      return await billing.request({
        plan,
        isTest: billingTestMode,
        returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing`
      });
    } catch (error) {
      if (isRedirectResponse(error)) {
        throw error;
      }

      console.error("Unable to start Shopify billing request", error);
      const message = getErrorMessage(error);
      return {
        status: "error" as const,
        message: message
          ? `Shopify billing could not be started: ${message}`
          : "Shopify billing could not be started for this store. Try again after the app is installed from a fresh session.",
      };
    }
  }

  return { status: "error" as const, message: "Unknown billing action." };
};

export default function BillingRoute() {
  const { billingState, summary, supportEmail } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  const orderCount = summary.stats.submissions;

  const plans = useMemo(() => {
    return planCatalog.map((plan) => {
      return {
        ...plan,
        displayPrice:
          plan.monthlyPrice === 0
            ? "Free"
            : interval === "annual"
              ? `$${plan.annualPrice.toFixed(0)} / year`
              : `$${plan.monthlyPrice.toFixed(2)} / month`,
        discountBadge:
          plan.monthlyPrice === 0
            ? null
            : interval === "annual"
              ? `Save ${ANNUAL_DISCOUNT_PERCENT}%`
              : null,
        billingPlan:
          plan.id === UNLIMITED_PLAN_ID
            ? interval === "annual"
              ? UNLIMITED_ANNUAL_PLAN
              : UNLIMITED_MONTHLY_PLAN
            : null,
      };
    });
  }, [interval]);

  const currentPlanId = billingState.hasActivePayment ? UNLIMITED_PLAN_ID : FREE_PLAN_ID;
  const currentPlan = plans.find((plan) => plan.id === currentPlanId) ?? plans[0];

  return (
    <s-page heading="Billing Plans">
      <div className="shell">
        <section className="billingShowcase">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Billing</p>
              <h2 className="panelTitle">Choose your plan here</h2>
              <p className="panelText">
                Start free with 100 monthly COD orders. Upgrade to Unlimited when you need no order limit.
              </p>
            </div>
            <div className="buttonRow">
              <Link className="ghostButton" to="/app/launch">Review launch blockers</Link>
            </div>
          </div>

          <div className="billingControls">
            <div className="billingToggle">
              <button
                type="button"
                className={interval === "monthly" ? "billingToggleActive" : ""}
                onClick={() => setInterval("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={interval === "annual" ? "billingToggleActive" : ""}
                onClick={() => setInterval("annual")}
              >
                Annual <span className="billingToggleBadge">-{ANNUAL_DISCOUNT_PERCENT}%</span>
              </button>
            </div>
          </div>

          <div className="billingPlansGrid">
            {plans.map((plan) => (
              <article
                className={[
                  "billingPlanCard",
                  plan.variant === "featured" ? "billingPlanCardFeatured" : "",
                  currentPlanId === plan.id ? "billingPlanCardCurrent" : "",
                ].filter(Boolean).join(" ")}
                key={plan.id}
              >
                {currentPlanId === plan.id ? (
                  <div className="billingCurrentTag">Your current plan</div>
                ) : null}

                <h3 className="billingPlanTitle">{plan.name}</h3>
                <div className="billingPlanPrice">{plan.displayPrice}</div>
                <div className="muted">{plan.description}</div>
                <div className="billingPlanDivider" />

                <ul className="billingFeatureList">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <div className="billingPlanFooter">
                  {plan.id === "free" ? (
                    <button type="button" className="secondaryButton billingPlanButton" disabled>
                      {plan.cta}
                    </button>
                  ) : (
                    <Form method="post">
                      <input type="hidden" name="intent" value="subscribe" />
                      <input type="hidden" name="plan" value={plan.billingPlan ?? ""} />
                      <button type="submit" className="primaryButton billingPlanButton">
                        {plan.cta}
                      </button>
                    </Form>
                  )}

                  {currentPlanId === plan.id && plan.usageLimit ? (
                    <div className="billingUsageMeter">
                      {orderCount} / {plan.usageLimit} orders
                    </div>
                  ) : null}

                  {plan.discountBadge ? (
                    <div className="billingMiniBadge">{plan.discountBadge}</div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <section className="billingSummaryCard">
            <div className="billingSummaryTitle">
              {currentPlan.name}
            </div>
            <p className="billingSummaryText">
              Your active plan on the app is <strong>{currentPlan.name}</strong>
              {currentPlan.usageLimit ? ` with ${currentPlan.usageLimit} processed orders each month.` : "."}
            </p>
            {currentPlan.usageLimit ? (
              <>
                <div className="billingSummaryUsage">{orderCount} / {currentPlan.usageLimit}</div>
                <div className="progressBar progressBarSoft">
                  <span style={{ width: `${Math.min((orderCount / currentPlan.usageLimit) * 100, 100)}%` }} />
                </div>
              </>
            ) : null}
            <p className="muted">
              All charges are handled securely through Shopify Billing. If you need help changing plans, contact {supportEmail}.
            </p>
          </section>

          {actionData ? (
            <p className={actionData.status === "success" ? "successText" : "errorText"}>
              {actionData.message}
            </p>
          ) : null}
        </section>
      </div>
    </s-page>
  );
}
