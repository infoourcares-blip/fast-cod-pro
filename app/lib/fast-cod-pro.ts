export const dashboardMetrics = [
  {
    label: "COD conversion uplift",
    value: "+31%",
    detail: "Merchants switching from standard checkout"
  },
  {
    label: "Average order value",
    value: "+18%",
    detail: "Driven by one-click upsells and bundles"
  },
  {
    label: "Fraud drop",
    value: "-42%",
    detail: "With OTP and smart risk rules enabled"
  },
  {
    label: "Recovered orders",
    value: "1,284",
    detail: "Via WhatsApp and callback automations"
  }
];

export const offerPlaybooks = [
  {
    title: "One-tick post-form upsell",
    trigger: "Shown after COD form submit",
    outcome: "+11.8% AOV"
  },
  {
    title: "Quantity break ladder",
    trigger: "Shown on high-intent product pages",
    outcome: "+8.6% bundle take rate"
  },
  {
    title: "City-specific shipping incentive",
    trigger: "Shown when COD fee is waived",
    outcome: "+6.4% conversion"
  }
];

export const fraudRules = [
  {
    name: "High-risk postal code filter",
    threshold: "Block COD for 44 zones",
    action: "Require prepaid or manual review"
  },
  {
    name: "Suspicious repeat attempts",
    threshold: "3 failed submissions in 15 mins",
    action: "Throttle form and request OTP"
  },
  {
    name: "Large cart verification",
    threshold: "Cart value above $120",
    action: "Send WhatsApp OTP confirmation"
  }
];

export const automationFlows = [
  "Push confirmed COD orders to fulfillment sheets and ERP.",
  "Send high-risk orders to support team on WhatsApp.",
  "Fire Meta, TikTok, and Google events with attribution.",
  "Alert sales agents when abandoned COD intent is detected."
];

export const pricingPlans = [
  {
    name: "Launch",
    price: "$19/mo",
    description: "Best for small stores validating COD demand."
  },
  {
    name: "Scale",
    price: "$79/mo",
    description: "For serious stores optimizing AOV and fraud."
  },
  {
    name: "Empire",
    price: "$199/mo",
    description: "For high-volume brands with custom automation needs."
  }
];
