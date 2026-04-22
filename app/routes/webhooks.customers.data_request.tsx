import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { findCustomerData } from "../lib/compliance.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  const email =
    payload && typeof payload === "object" && "customer" in payload
      ? (payload.customer as { email?: string | null } | null)?.email ?? null
      : null;

  const data = await findCustomerData(shop, email);

  console.log(`Received ${topic} webhook for ${shop}`, data);

  return new Response();
};
