import type { ActionFunctionArgs } from "react-router";
import { findCustomerData, purgeShopData, redactCustomerData } from "../lib/compliance.server";
import { authenticate } from "../shopify.server";

function customerEmailFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("customer" in payload)) {
    return null;
  }

  return (payload.customer as { email?: string | null } | null)?.email ?? null;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const email = customerEmailFromPayload(payload);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST": {
      const data = await findCustomerData(shop, email);
      console.log(`Received ${topic} webhook for ${shop}`, data);
      break;
    }
    case "CUSTOMERS_REDACT": {
      const result = await redactCustomerData(shop, email);
      console.log(`Received ${topic} webhook for ${shop}`, result);
      break;
    }
    case "SHOP_REDACT": {
      await purgeShopData(shop);
      console.log(`Received ${topic} webhook for ${shop}. Shop data removed.`);
      break;
    }
    default:
      console.log(`Received unsupported privacy webhook ${topic} for ${shop}`);
  }

  return new Response();
};
