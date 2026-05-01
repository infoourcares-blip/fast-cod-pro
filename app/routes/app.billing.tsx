import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { useMemo, useState } from "react";
import { authenticate } from "../shopify.server";
import { EMPIRE_PLAN, LAUNCH_PLAN, SCALE_PLAN } from "../lib/billing-plans";
import { getFunnelSummary } from "../lib/funnel.server";

type ActionData = {
  status: "success" | "error";
  message: string;
} | null;

type BillingState = {
  hasActivePayment: boolean;
};

const planCatalog = [
  {
    id: "free",
    name: "Forever Free for India",
    monthlyPrice: 0,
    usageLimit: 150,
    description: "Start COD without monthly billing.",
    features: [
      "150 Orders/Month",
      "Original form design",
      "Basic fraud prevention",
      "Address validation and recovery",
      "Analytics dashboard",
    ],
    cta: "Current free plan",
    variant: "free",
  },
  {
    id: LAUNCH_PLAN,
    name: "Premium for India",
    monthlyPrice: 7.99,
    usageLimit: 800,
    description: "20% lower than the reference pricing.",
    features: [
      "All Free Plan features",
      "800 Orders/Month",
      "Personalized coverages",
      "Advanced fraud prevention",
      "Advanced form templates",
      "24/7 live chat support",
    ],
    cta: "Select Premium",
    variant: "standard",
  },
  {
    id: SCALE_PLAN,
    name: "Enterprise",
    monthlyPrice: 23.99,
    usageLimit: 10000,
    description: "For scaling COD brands with bigger order volume.",
    features: [
      "All Premium Plan features",
      "10,000 Orders/Month",
      "Custom code assistance",
      "Priority operations support",
      "Faster review workflow",
    ],
    cta: "Select Enterprise",
    variant: "featured",
  },
  {
    id: EMPIRE_PLAN,
    name: "Unlimited",
    monthlyPrice: 55.99,
    usageLimit: null,
    description: "For aggressive growth teams and heavy COD traffic.",
    features: [
      "All Enterprise Plan features",
      "Unlimited Orders/Month",
      "A/B testing for upsells",
      "Multiple form versions",
      "24/7 priority chat support",
    ],
    cta: "Select Unlimited",
    variant: "standard",
  },
] as const;

const billingTestMode = process.env.SHOPIFY_BILLING_TEST === "true";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  let billingState: BillingState = { hasActivePayment: false };

  try {
    billingState = await billing.check({
      plans: [LAUNCH_PLAN, SCALE_PLAN, EMPIRE_PLAN],
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
    const plan = String(formData.get("plan") || "") as
      | typeof LAUNCH_PLAN
      | typeof SCALE_PLAN
      | typeof EMPIRE_PLAN;

    if (!plan) {
      return { status: "error" as const, message: "Choose a billing plan." };
    }

    try {
      return await billing.request({
        plan,
        isTest: billingTestMode,
        returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing`
      });
    } catch (error) {
      console.error("Unable to start Shopify billing request", error);
      return {
        status: "error" as const,
        message: "Shopify billing could not be started for this store. Try again after the app is installed from a fresh session.",
      };
    }
  }

  return { status: "error" as const, message: "Unknown billing action." };
};

export default function BillingRoute() {
  const { billingState, summary, supportEmail } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);

  const orderCount = summary.stats.submissions;

  const plans = useMemo(() => {
    return planCatalog.map((plan) => {
      const annualMonthlyEquivalent = +(plan.monthlyPrice * 0.8).toFixed(2);
      const appliedMonthlyEquivalent = discountApplied
        ? +(plan.monthlyPrice * 0.9).toFixed(2)
        : interval === "annual"
          ? annualMonthlyEquivalent
          : plan.monthlyPrice;

      return {
        ...plan,
        displayPrice:
          plan.monthlyPrice === 0
            ? "Free"
            : `$${appliedMonthlyEquivalent.toFixed(2)} / month`,
        discountBadge:
          plan.monthlyPrice === 0
            ? null
            : discountApplied
              ? "Code applied"
              : interval === "annual"
                ? "-20%"
                : null,
      };
    });
  }, [discountApplied, interval]);

  const currentPlanId = billingState.hasActivePayment ? SCALE_PLAN : "free";
  const currentPlan = plans.find((plan) => plan.id === currentPlanId) ?? plans[0];

  function handleApplyDiscount() {
    setDiscountApplied(discountCode.trim().toLowerCase() === "fast20");
  }

  return (
    <s-page heading="Billing Plans">
      <div className="shell">
        <section className="billingShowcase">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Billing</p>
              <h2 className="panelTitle">Choose your plan here</h2>
              <p className="panelText">
                Fast Cod Pro plans below are set 20% lower than your reference pricing. Charges are processed securely through Shopify Billing.
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
                Annual <span className="billingToggleBadge">-20%</span>
              </button>
            </div>

            <div className="billingDiscountRow">
              <input
                className="input"
                value={discountCode}
                onChange={(event) => setDiscountCode(event.currentTarget.value)}
                placeholder="Enter discount code"
              />
              <button type="button" className="secondaryButton" onClick={handleApplyDiscount}>
                Apply
              </button>
            </div>
            {discountApplied ? (
              <p className="successText">Discount code applied successfully.</p>
            ) : null}
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
                      <input type="hidden" name="plan" value={plan.id} />
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
