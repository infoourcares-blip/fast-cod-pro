import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { purgeShopData } from "../lib/compliance.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  await purgeShopData(shop);

  console.log(`Received ${topic} webhook for ${shop}. Shop data removed.`);

  return new Response();
};
