import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { redactCustomerData } from "../lib/compliance.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  const email =
    payload && typeof payload === "object" && "customer" in payload
      ? (payload.customer as { email?: string | null } | null)?.email ?? null
      : null;

  const result = await redactCustomerData(shop, email);

  console.log(`Received ${topic} webhook for ${shop}`, result);

  return new Response();
};
