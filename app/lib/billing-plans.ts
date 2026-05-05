export const UNLIMITED_MONTHLY_PLAN = "Unlimited monthly";
export const UNLIMITED_ANNUAL_PLAN = "Unlimited annual";

export const PAID_BILLING_PLANS = [
  UNLIMITED_MONTHLY_PLAN,
  UNLIMITED_ANNUAL_PLAN,
] as const;

export type PaidBillingPlan = (typeof PAID_BILLING_PLANS)[number];
